import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/core/supabase/server";
import { getKnowledgeContext, writeConversationFacts } from "@backend/memory";
import OpenAI from "openai";

/**
 * POST /api/orgpulse/chat
 * Body: { cloneId: string, question: string, history?: { role: string, content: string }[] }
 *
 * RAG-powered chat with a clone. Fetches relevant chunks from Supabase,
 * builds a system prompt, and streams a response via OpenAI.
 */

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { cloneId, question, history, conversationId = "conv_orgpulse" } = body as {
      cloneId: string;
      question: string;
      history?: { role: string; content: string }[];
      conversationId?: string;
    };

    if (!cloneId || !question) {
      return NextResponse.json(
        { error: "cloneId and question are required" },
        { status: 400 }
      );
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "OPENAI_API_KEY not configured" },
        { status: 500 }
      );
    }

    const supabase = createServerSupabaseClient();

    // Fetch clone info
    const { data: clone } = await supabase
      .from("clones")
      .select("id, name, personality, expertise_tags")
      .eq("id", cloneId)
      .single();

    const cloneName = clone?.name ?? "AI Assistant";
    const personality = clone?.personality as Record<string, unknown> | null;
    const expertise = clone?.expertise_tags ?? [];

    // Retrieve clone-scoped context from the shared memory module.
    const knowledge = await getKnowledgeContext(cloneId, question, 8);
    let chunks: { content: string; metadata: Record<string, unknown> }[] =
      (knowledge?.chunks || []).map((chunk) => ({
        content: chunk.content,
        metadata: chunk.metadata || {},
      }));

    // Fallback: clone-scoped recent chunks if memory provider is unavailable.
    if (chunks.length === 0) {
      const { data: recentChunks } = await supabase
        .from("memories")
        .select("content, metadata")
        .eq("clone_id", cloneId)
        .eq("type", "chunk")
        .order("created_at", { ascending: false })
        .limit(8);
      chunks = (recentChunks ?? []) as typeof chunks;
    }

    // Build context string from chunks
    const contextStr = chunks
      .map((c, i) => {
        const source = (c.metadata?.source as string) || "document";
        const title = (c.metadata?.document_title as string) || "";
        return `[Source ${i + 1}: ${source}${title ? ` — ${title}` : ""}]\n${c.content}`;
      })
      .join("\n\n---\n\n");

    // System prompt
    const systemPrompt = `You are the AI Digital Twin of ${cloneName}. You embody their knowledge, communication style, and expertise.

## Your Identity
- Name: ${cloneName}'s Digital Twin
- Tone: ${(personality?.tone as string) || "Professional and knowledgeable"}
- Bio: ${(personality?.bio as string) || `AI digital twin of ${cloneName}`}
- Expertise: ${expertise.join(", ") || "General organizational knowledge"}

## Your Knowledge Base (retrieved from organizational data)
${contextStr || "(No relevant documents found in the knowledge base yet.)"}

## Instructions
1. Answer questions using the knowledge base context above as your primary source.
2. Speak as ${cloneName}'s twin — use first person.
3. Be concise and conversational. Reference specific documents, emails, or messages when relevant.
4. If the context doesn't contain an answer, say so honestly and suggest what might help.
5. When citing information, mention the source type (email, Drive doc, Slack message, etc.).
6. Keep responses focused and actionable.`;

    // Build messages
    const messages: { role: "system" | "user" | "assistant"; content: string }[] = [
      { role: "system", content: systemPrompt },
    ];

    // Add conversation history
    if (history && Array.isArray(history)) {
      for (const msg of history.slice(-6)) {
        messages.push({
          role: msg.role as "user" | "assistant",
          content: msg.content,
        });
      }
    }

    messages.push({ role: "user", content: question });

    // Stream response
    const openai = new OpenAI({ apiKey });
    const stream = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages,
      stream: true,
      max_tokens: 1000,
      temperature: 0.7,
    });

    // Build citations from the chunks used
    const citations = chunks
      .slice(0, 3)
      .map((c) => ({
        source: (c.metadata?.source as string) || "document",
        snippet: (c.metadata?.document_title as string) || c.content.slice(0, 80) + "…",
        date: (c.metadata?.gmail_date as string) || "",
      }))
      .filter((c) => c.snippet);

    // Stream as SSE
    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        try {
          let assistantResponse = "";
          for await (const chunk of stream) {
            const text = chunk.choices[0]?.delta?.content ?? "";
            if (text) {
              assistantResponse += text;
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ type: "chunk", text })}\n\n`)
              );
            }
          }
          if (assistantResponse.trim() && question.trim()) {
            try {
              await writeConversationFacts({
                cloneId,
                conversationId:
                  typeof conversationId === "string"
                    ? conversationId
                    : "conv_orgpulse",
                userMessage: question,
                assistantMessage: assistantResponse,
              });
            } catch (writeError) {
              console.error("Failed to write OrgPulse conversation memory:", writeError);
            }
          }
          // Send citations
          if (citations.length > 0) {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ type: "citations", citations })}\n\n`)
            );
          }
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "done" })}\n\n`));
          controller.close();
        } catch (err) {
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ type: "error", message: err instanceof Error ? err.message : "Stream error" })}\n\n`
            )
          );
          controller.close();
        }
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
