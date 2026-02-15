"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { MessageBubble } from "./MessageBubble";
import { ChatInput } from "./ChatInput";
import { ThinkingPanel } from "./ThinkingPanel";
import { CollaborationPanel } from "./CollaborationPanel";
import type { PendingConsultation } from "./CollaborationPanel";
import { NotificationBanner } from "./NotificationBanner";
import type { Message, CloneConsultation } from "@/lib/core/types";

interface ChatWindowProps {
  cloneId?: string;
  cloneName?: string;
  onVoiceResponse?: (text: string) => void;
}

export function ChatWindow({
  cloneId = "",
  cloneName = "AI Clone",
  onVoiceResponse,
}: ChatWindowProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [thinkingSteps, setThinkingSteps] = useState<string[]>([]);
  const [consultations, setConsultations] = useState<CloneConsultation[]>([]);
  const [pendingConsultation, setPendingConsultation] =
    useState<PendingConsultation | null>(null);
  const [showNotification, setShowNotification] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const sendMessage = async (
    content: string,
    isProactiveDebrief = false
  ) => {
    if (!content.trim() && !isProactiveDebrief) return;

    const userMessage: Message = {
      id: `msg_${Date.now()}`,
      conversation_id: "conv_demo",
      role: "user",
      content: isProactiveDebrief
        ? "Give me the debrief on the meeting between Sarah and Jason."
        : content,
      created_at: new Date().toISOString(),
    };

    if (!isProactiveDebrief) {
      setMessages((prev) => [...prev, userMessage]);
    }

    setIsLoading(true);
    setThinkingSteps(["Searching knowledge base...", "Analyzing context..."]);

    try {
      const conversationHistory = messages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMessage.content,
          cloneId,
          conversationHistory,
          isProactiveDebrief,
        }),
      });

      if (!response.ok) throw new Error("Chat request failed");

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No response stream");

      const decoder = new TextDecoder();
      let assistantContent = "";
      const assistantMessage: Message = {
        id: `msg_${Date.now() + 1}`,
        conversation_id: "conv_demo",
        role: "assistant",
        content: "",
        created_at: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
      setThinkingSteps((prev) => [...prev, "Generating response..."]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split("\n").filter((l) => l.startsWith("data: "));

        for (const line of lines) {
          const data = line.slice(6);
          if (data === "[DONE]") continue;

          try {
            const parsed = JSON.parse(data);

            if (parsed.type === "consulting") {
              // A consultation is starting — show the pending state
              setPendingConsultation({
                clone_name: parsed.clone_name || "a colleague",
                topic: parsed.topic || "",
              });
              setThinkingSteps((prev) => [
                ...prev,
                `Consulting ${parsed.clone_name || "a colleague"}'s clone...`,
              ]);
            }

            if (parsed.type === "consultation") {
              // Consultation completed — clear pending, add to completed list
              setPendingConsultation(null);
              setConsultations((prev) => [
                ...prev,
                {
                  target_clone_id: "",
                  target_clone_name: parsed.consultation.target_clone_name,
                  query: parsed.consultation.query || "",
                  response: parsed.consultation.response,
                  latency_ms: 0,
                },
              ]);
              setThinkingSteps((prev) => [
                ...prev,
                `Got response from ${parsed.consultation.target_clone_name}'s clone`,
              ]);
            }

            if (parsed.type === "content" && parsed.content) {
              assistantContent += parsed.content;
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantMessage.id
                    ? { ...m, content: assistantContent }
                    : m
                )
              );
            }
          } catch {
            // skip malformed chunks
          }
        }
      }

      if (onVoiceResponse && assistantContent) {
        onVoiceResponse(assistantContent);
      }
    } catch (error) {
      console.error("Chat error:", error);
      const errorMessage: Message = {
        id: `msg_error_${Date.now()}`,
        conversation_id: "conv_demo",
        role: "assistant",
        content:
          "I'm having trouble connecting right now. Please make sure your OPENAI_API_KEY is set in .env.local and try again.",
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      setThinkingSteps([]);
      setPendingConsultation(null);
    }
  };

  const handleNotificationAction = () => {
    setShowNotification(false);
    sendMessage("", true);
  };

  return (
    <div className="flex h-full flex-col">
      {/* Notification Banner */}
      {showNotification && (
        <NotificationBanner
          title="Debrief: Q1 Pipeline Review"
          description="Sarah and Jason had their Q1 Pipeline Review this morning. You should review the outcomes."
          people={["Sarah Chen", "Jason Park"]}
          priority="high"
          onAction={handleNotificationAction}
          onDismiss={() => setShowNotification(false)}
        />
      )}

      {/* Main chat area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Messages column */}
        <div className="flex flex-1 flex-col">
          <div className="flex-1 overflow-y-auto px-4 py-6 space-y-1">
            {messages.length === 0 && (
              <div className="flex h-full items-center justify-center">
                <div className="text-center max-w-md">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-violet-600 text-2xl text-white font-bold shadow-lg">
                    {cloneName.charAt(0)}
                  </div>
                  <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
                    {cloneName}&apos;s Digital Twin
                  </h2>
                  <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
                    Ask me anything about meetings, projects, or team
                    updates. I have full context on your work.
                  </p>
                </div>
              </div>
            )}

            {messages.map((message) => (
              <MessageBubble
                key={message.id}
                message={message}
                cloneName={cloneName}
              />
            ))}

            {isLoading && (
              <div className="flex items-start gap-3 py-2">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-violet-600 text-xs text-white font-bold">
                  {cloneName.charAt(0)}
                </div>
                <div className="flex items-center gap-1.5 rounded-2xl bg-zinc-100 px-4 py-3 dark:bg-zinc-800">
                  <div className="h-2 w-2 animate-bounce rounded-full bg-zinc-400 [animation-delay:-0.3s]" />
                  <div className="h-2 w-2 animate-bounce rounded-full bg-zinc-400 [animation-delay:-0.15s]" />
                  <div className="h-2 w-2 animate-bounce rounded-full bg-zinc-400" />
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <ChatInput
            onSend={sendMessage}
            isLoading={isLoading}
            placeholder={`Ask ${cloneName}'s twin...`}
          />
        </div>

        {/* Side panels */}
        {(thinkingSteps.length > 0 ||
          consultations.length > 0 ||
          pendingConsultation) && (
          <div className="hidden w-80 flex-col border-l border-zinc-200 dark:border-zinc-800 lg:flex">
            {thinkingSteps.length > 0 && (
              <ThinkingPanel steps={thinkingSteps} isActive={isLoading} />
            )}
            {(consultations.length > 0 || pendingConsultation) && (
              <CollaborationPanel
                consultations={consultations}
                pendingConsultation={pendingConsultation}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
