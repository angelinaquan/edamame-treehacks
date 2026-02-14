import { NextRequest, NextResponse } from "next/server";
import getOpenAIClient from "@/lib/openai";
import { buildSystemPrompt } from "@/lib/agent";
import {
  getCloneById,
  mockClones,
  getActiveReminders,
  mockMeetings,
} from "@/lib/mock-data";
import { canConsult, consultClone } from "@/lib/collaboration";

export async function POST(request: NextRequest) {
  try {
    const {
      message,
      cloneId,
      conversationHistory = [],
      isProactiveDebrief = false,
    } = await request.json();

    const clone = getCloneById(cloneId || "clone_self");
    if (!clone) {
      return NextResponse.json({ error: "Clone not found" }, { status: 404 });
    }

    const systemPrompt = buildSystemPrompt(clone);

    const messages: {
      role: "system" | "user" | "assistant";
      content: string;
    }[] = [{ role: "system", content: systemPrompt }];

    // Add conversation history
    for (const msg of conversationHistory) {
      messages.push({
        role: msg.role as "user" | "assistant",
        content: msg.content,
      });
    }

    // If proactive debrief, inject meeting context
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

    // Check if message references another person -> trigger clone consultation
    let consultationData: {
      target_clone_name: string;
      response: string;
    } | null = null;
    const messageText = message || "";
    const otherClones = mockClones.filter((c) => c.id !== clone.id);

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

    // Stream the response
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
          // Send consultation metadata first if applicable
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
