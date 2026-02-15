"use client";

import ReactMarkdown from "react-markdown";
import type { Message } from "@/lib/core/types";

interface MessageBubbleProps {
  message: Message;
  cloneName: string;
}

export function MessageBubble({ message, cloneName }: MessageBubbleProps) {
  const isUser = message.role === "user";

  return (
    <div
      className={`flex items-start gap-3 py-2 ${isUser ? "flex-row-reverse" : ""}`}
    >
      {/* Avatar */}
      <div
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
          isUser
            ? "bg-zinc-700 text-white dark:bg-zinc-500"
            : "bg-gradient-to-br from-blue-500 to-violet-600 text-white"
        }`}
      >
        {isUser ? "You" : cloneName.charAt(0)}
      </div>

      {/* Message content */}
      <div
        className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${
          isUser
            ? "bg-blue-600 text-white"
            : "bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100"
        }`}
      >
        <div
          className={`prose prose-sm max-w-none ${
            isUser
              ? "prose-invert"
              : "dark:prose-invert"
          }`}
        >
          <ReactMarkdown
            components={{
              p: ({ children }) => (
                <p className="mb-2 last:mb-0">{children}</p>
              ),
              ul: ({ children }) => (
                <ul className="mb-2 list-disc pl-4 last:mb-0">{children}</ul>
              ),
              ol: ({ children }) => (
                <ol className="mb-2 list-decimal pl-4 last:mb-0">
                  {children}
                </ol>
              ),
              li: ({ children }) => (
                <li className="mb-1">{children}</li>
              ),
              strong: ({ children }) => (
                <strong className="font-semibold">{children}</strong>
              ),
            }}
          >
            {message.content}
          </ReactMarkdown>
        </div>

        <div
          className={`mt-1 text-[10px] ${
            isUser
              ? "text-blue-200"
              : "text-zinc-400 dark:text-zinc-500"
          }`}
        >
          {new Date(message.created_at).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </div>
      </div>
    </div>
  );
}
