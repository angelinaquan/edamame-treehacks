"use client";

import { MessageSquare, ArrowLeftRight } from "lucide-react";

interface ConversationEntry {
  id: string;
  clone_name: string;
  user_name: string;
  last_message: string;
  timestamp: string;
  has_collaboration: boolean;
}

interface ConversationLogProps {
  conversations: ConversationEntry[];
}

export function ConversationLog({ conversations }: ConversationLogProps) {
  return (
    <div>
      <h3 className="mb-3 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
        Recent Conversations
      </h3>
      <div className="space-y-2">
        {conversations.map((conv) => (
          <div
            key={conv.id}
            className="flex items-start gap-3 rounded-xl border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900"
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-400 to-violet-500 text-xs font-bold text-white">
              {conv.clone_name.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  {conv.clone_name}&apos;s Clone
                </span>
                <span className="text-[10px] text-zinc-400">
                  {conv.timestamp}
                </span>
              </div>
              <p className="mt-0.5 text-xs text-zinc-500 truncate">
                {conv.user_name}: {conv.last_message}
              </p>
              {conv.has_collaboration && (
                <div className="mt-1 flex items-center gap-1 text-[10px] text-blue-500">
                  <ArrowLeftRight size={10} />
                  Clone-to-clone collaboration
                </div>
              )}
            </div>
            <MessageSquare
              size={14}
              className="shrink-0 text-zinc-400"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
