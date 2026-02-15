import { NextRequest, NextResponse } from "next/server";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import getOpenAIClient from "@/lib/agents/openai";
import { buildSystemPrompt } from "@/lib/agents/clone-brain";
import { getActiveReminders, mockMeetings } from "@backend/memory/mock-data";
import { getCloneRuntime } from "@backend/memory/clone-repository";
import {
  canConsult,
  consultClone,
  CONSULT_CLONE_TOOL,
} from "@/lib/agents/collaboration";
import { getKnowledgeContext, learnFromConversation, learnEpisodesFromConversation } from "@backend/memory";

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
            episodes: knowledge.episodes
              .slice(0, 6)
              .map((ep) => {
                const date = new Date(ep.occurred_at).toLocaleDateString("en-US", { month: "short", day: "numeric" });
                const people = ep.participants.length > 0 ? ` with ${ep.participants.join(", ")}` : "";
                const valence = ep.emotional_valence !== "neutral" ? ` (${ep.emotional_valence})` : "";
                const outcome = ep.outcome ? `. Outcome: ${ep.outcome}` : "";
                return `- [${date}] ${ep.event_type}${people}${valence}: ${ep.content}${outcome}`;
              }),
          }
        : {
            owner: runtime.owner,
          }
    );

    const messages: ChatCompletionMessageParam[] = [
      { role: "system", content: systemPrompt },
    ];

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

    // Continual learning: extract facts and episodes from user message (fire-and-forget)
    if (message && !isProactiveDebrief) {
      const convId = `conv_${Date.now()}`;
      learnFromConversation(clone.id, message, convId).catch((err) =>
        console.error("[chat] Background fact learning failed:", err)
      );
      learnEpisodesFromConversation(clone.id, message, convId).catch((err) =>
        console.error("[chat] Background episodic learning failed:", err)
      );
    }

    // -----------------------------------------------------------------------
    // OpenAI call with tool-calling loop
    // -----------------------------------------------------------------------
    const openai = getOpenAIClient();
    const encoder = new TextEncoder();
    let consultCount = 0;
    const allConsultations: {
      target_clone_name: string;
      query: string;
      response: string;
    }[] = [];

    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          // Phase 1: Initial call (non-streaming) to detect tool calls
          const initialResponse = await openai.chat.completions.create({
            model: "gpt-4o",
            messages,
            tools: [CONSULT_CLONE_TOOL],
            tool_choice: "auto",
            temperature: 0.7,
            max_tokens: 2048,
          });

          let assistantMessage = initialResponse.choices[0]?.message;

          // Tool-calling loop: keep resolving tool calls until the model
          // produces a final content response (max iterations = 3).
          while (
            assistantMessage?.tool_calls &&
            assistantMessage.tool_calls.length > 0 &&
            consultCount < 3
          ) {
            // Append the assistant message with tool calls to context
            messages.push(assistantMessage);

            for (const toolCall of assistantMessage.tool_calls) {
              if (toolCall.function.name !== "consult_clone") {
                messages.push({
                  role: "tool",
                  tool_call_id: toolCall.id,
                  content: "Unknown tool.",
                });
                continue;
              }

              let args: { topic: string; clone_name?: string };
              try {
                args = JSON.parse(toolCall.function.arguments);
              } catch {
                messages.push({
                  role: "tool",
                  tool_call_id: toolCall.id,
                  content: "Failed to parse tool arguments.",
                });
                continue;
              }

              const { allowed } = canConsult(0, consultCount);
              if (!allowed) {
                messages.push({
                  role: "tool",
                  tool_call_id: toolCall.id,
                  content:
                    "Consultation limit reached. Answer with the knowledge you already have.",
                });
                continue;
              }

              // Stream a "consulting" event to the frontend
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({
                    type: "consulting",
                    clone_name: args.clone_name || "a colleague",
                    topic: args.topic,
                  })}\n\n`
                )
              );

              // Execute the consultation
              const consultation = await consultClone({
                callerCloneId: clone.id,
                targetCloneName: args.clone_name || "",
                query: args.topic,
                depth: 0,
                conversationId: `conv_${Date.now()}`,
              });

              consultCount++;
              allConsultations.push({
                target_clone_name: consultation.target_clone_name,
                query: args.topic,
                response: consultation.response,
              });

              // Stream the completed consultation to the frontend
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({
                    type: "consultation",
                    consultation: {
                      target_clone_name: consultation.target_clone_name,
                      query: args.topic,
                      response: consultation.response,
                    },
                  })}\n\n`
                )
              );

              // Feed the tool result back into the conversation
              messages.push({
                role: "tool",
                tool_call_id: toolCall.id,
                content: consultation.response,
              });
            }

            // Re-call the model with tool results so it can produce the final
            // answer (or make more tool calls).
            const followUp = await openai.chat.completions.create({
              model: "gpt-4o",
              messages,
              tools: [CONSULT_CLONE_TOOL],
              tool_choice: "auto",
              temperature: 0.7,
              max_tokens: 2048,
            });

            assistantMessage = followUp.choices[0]?.message;
          }

          // Phase 2: We have a final content response. Stream it token-by-token
          // by re-issuing the completed messages as a streaming call.
          if (assistantMessage?.content) {
            // The model already produced a complete response during the tool
            // loop — stream it character-by-character in small chunks to
            // preserve the SSE UX without an extra API call.
            const fullContent = assistantMessage.content;
            const CHUNK_SIZE = 8;
            for (let i = 0; i < fullContent.length; i += CHUNK_SIZE) {
              const slice = fullContent.slice(i, i + CHUNK_SIZE);
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({ type: "content", content: slice })}\n\n`
                )
              );
            }
          } else {
            // No content yet (edge case) — do a final streaming call
            // without tools so the model must produce content.
            const finalStream = await openai.chat.completions.create({
              model: "gpt-4o",
              messages,
              temperature: 0.7,
              max_tokens: 2048,
              stream: true,
            });

            for await (const chunk of finalStream) {
              const content = chunk.choices[0]?.delta?.content || "";
              if (content) {
                controller.enqueue(
                  encoder.encode(
                    `data: ${JSON.stringify({ type: "content", content })}\n\n`
                  )
                );
              }
            }
          }

          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        } catch (error) {
          console.error("[chat] Stream error:", error);
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
