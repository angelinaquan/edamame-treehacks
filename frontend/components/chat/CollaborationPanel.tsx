"use client";

import { Users, ArrowRight, Loader2, MessageSquare } from "lucide-react";
import type { CloneConsultation } from "@/lib/core/types";

export interface PendingConsultation {
  clone_name: string;
  topic: string;
}

interface CollaborationPanelProps {
  consultations: CloneConsultation[];
  pendingConsultation?: PendingConsultation | null;
}

export function CollaborationPanel({
  consultations,
  pendingConsultation,
}: CollaborationPanelProps) {
  if (consultations.length === 0 && !pendingConsultation) return null;

  return (
    <div className="flex-1 overflow-y-auto p-4">
      <div className="mb-3 flex items-center gap-2">
        <Users size={16} className="text-blue-500" />
        <h3 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Clone Collaboration
        </h3>
      </div>
      <div className="space-y-3">
        {/* In-progress consultation */}
        {pendingConsultation && (
          <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-3 dark:border-blue-800 dark:bg-blue-900/20">
            <div className="mb-2 flex items-center gap-1.5 text-xs font-medium text-blue-600 dark:text-blue-400">
              <Loader2 size={12} className="animate-spin" />
              <span>
                Consulting {pendingConsultation.clone_name}&apos;s clone...
              </span>
            </div>
            <div className="flex items-start gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
              <MessageSquare size={10} className="mt-0.5 shrink-0" />
              <p className="italic leading-relaxed">
                &ldquo;{pendingConsultation.topic}&rdquo;
              </p>
            </div>
          </div>
        )}

        {/* Completed consultations */}
        {consultations.map((consultation, i) => (
          <div
            key={i}
            className="rounded-xl border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-700 dark:bg-zinc-800/50"
          >
            <div className="mb-2 flex items-center gap-1.5 text-xs font-medium text-blue-600 dark:text-blue-400">
              <div className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-100 text-[10px] font-bold text-blue-600 dark:bg-blue-900/50 dark:text-blue-400">
                {consultation.target_clone_name.charAt(0)}
              </div>
              <ArrowRight size={10} />
              <span>{consultation.target_clone_name}&apos;s Clone</span>
            </div>
            {/* Show the query that was asked */}
            {consultation.query && (
              <div className="mb-2 flex items-start gap-1.5 text-xs text-zinc-400 dark:text-zinc-500">
                <MessageSquare size={10} className="mt-0.5 shrink-0" />
                <p className="italic leading-relaxed">
                  &ldquo;{consultation.query}&rdquo;
                </p>
              </div>
            )}
            <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
              {consultation.response}
            </p>
            {consultation.latency_ms > 0 && (
              <div className="mt-2 text-[10px] text-zinc-400">
                Response time: {consultation.latency_ms}ms
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
