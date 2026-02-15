import { NextRequest, NextResponse } from "next/server";
import getOpenAIClient from "@/lib/agents/openai";
import { buildSystemPrompt } from "@/lib/agents/clone-brain";
import { getActiveReminders, mockMeetings } from "@backend/memory/mock-data";
import { getCloneRuntime } from "@backend/memory/clone-repository";
import { canConsult, consultClone, listConsultableClones } from "@/lib/agents/collaboration";
import { getKnowledgeContext } from "@backend/memory";

export async function POST(request: NextRequest) {
  try {
    const {
      message,
      cloneId,
      conversationHistory = [],
      isProactiveDebrief = false,
    } = await request.json();

    const runtime = await getCloneRuntime(cloneId);
    const clone = runtime.clone;
    if (!clone) {
      return NextResponse.json({ error: "Clone not found" }, { status: 404 });
    }

    const knowledge = await getKnowledgeContext(clone.id, message || "", 5);
    const fallbackChunkFacts =
      knowledge?.chunks.slice(0, 5).map((chunk) => `- ${chunk.content}`) || [];
    const systemPrompt = buildSystemPrompt(
      clone,
      knowledge
        ? {
            owner: runtime.owner,
            memories: knowledge.items
              .slice(0, 8)
              .map(
                (item) =>
                  `- ${item.fact} (confidence: ${item.confidence.toFixed(2)}, source: ${item.source_type})`
              ),
            slackMessages: knowledge.resources
              .filter((resource) => resource.source_type === "slack")
              .slice(0, 8)
              .map(
                (resource) =>
                  `[slack] ${resource.title || "message"}: ${resource.content}`
              ),
            categorySummaries: knowledge.categories.map(
              (category) =>
                `- ${category.category_key}: ${category.summary} (confidence: ${category.confidence.toFixed(2)})`
            ),
            itemFacts: knowledge.items
              .slice(0, 10)
              .map((item) => `- ${item.fact}`)
              .concat(
                knowledge.items.length > 0 ? [] : fallbackChunkFacts.slice(0, 5)
              ),
            resourceHighlights: knowledge.resources
              .filter((resource) => resource.source_type !== "slack")
              .slice(0, 6)
              .map(
                (resource) =>
                  `- [${resource.source_type}] ${resource.title || "resource"}: ${resource.content}`
              ),
          }
        : {
            owner: runtime.owner,
          }
    );

    const messages: {
      role: "system" | "user" | "assistant";
      content: string;
    }[] = [{ role: "system", content: systemPrompt }];

    for (const msg of conversationHistory) {
      messages.push({
        role: msg.role as "user" | "assistant",
        content: msg.content,
      });
    }

    if (isProactiveDebrief) {
      const reminders = getActiveReminders();
      const meetingDebrief = reminders.find(
        (r) => r.type === "meeting_debrief"
      );
      if (meetingDebrief) {
        const meeting = mockMeetings.find(
          (m) => m.id === meetingDebrief.meeting_id
        );
        if (meeting) {
          messages.push({
            role: "user",
            content: `Give me a debrief on the meeting: "${meeting.title}". Who was there, what was discussed, key decisions, and what action items need my attention. Be concise and conversational, like you're briefing me while I'm driving.`,
          });
        }
      }
    } else {
      messages.push({ role: "user", content: message });
    }

    let consultationData: {
      target_clone_name: string;
      response: string;
    } | null = null;
    const messageText = message || "";
    const otherClones = await listConsultableClones(clone.id);

    for (const otherClone of otherClones) {
      const firstName = otherClone.name.split(" ")[0].toLowerCase();
      if (messageText.toLowerCase().includes(firstName)) {
        const { allowed } = canConsult(0, 0);
        if (allowed) {
          const consultation = await consultClone({
            callerCloneId: clone.id,
            targetCloneName: otherClone.name,
            query: messageText,
            depth: 0,
            conversationId: "conv_demo",
          });
          consultationData = {
            target_clone_name: consultation.target_clone_name,
            response: consultation.response,
          };
          messages.push({
            role: "system",
            content: `I consulted ${consultation.target_clone_name}'s clone, who shared: "${consultation.response}". Weave this context naturally into your response and mention that you checked with their clone.`,
          });
          break;
        }
      }
    }

    const openai = getOpenAIClient();
    const stream = await openai.chat.completions.create({
      model: "gpt-4o",
      messages,
      temperature: 0.7,
      max_tokens: 2048,
      stream: true,
    });

    const encoder = new TextEncoder();
    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          if (consultationData) {
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({ type: "consultation", consultation: consultationData })}\n\n`
              )
            );
          }

          for await (const chunk of stream) {
            const content = chunk.choices[0]?.delta?.content || "";
            if (content) {
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({ type: "content", content })}\n\n`
                )
              );
            }
          }
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        } catch (error) {
          controller.error(error);
        }
      },
    });

    return new Response(readableStream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("Chat API error:", error);
    return NextResponse.json(
      { error: "Failed to generate response" },
      { status: 500 }
    );
  }
}
