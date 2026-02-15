"use client";

import { Users, ArrowRight } from "lucide-react";
import type { CloneConsultation } from "@/lib/core/types";

interface CollaborationPanelProps {
  consultations: CloneConsultation[];
}

export function CollaborationPanel({
  consultations,
}: CollaborationPanelProps) {
  if (consultations.length === 0) return null;

  return (
    <div className="flex-1 overflow-y-auto p-4">
      <div className="mb-3 flex items-center gap-2">
        <Users size={16} className="text-blue-500" />
        <h3 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Clone Collaboration
        </h3>
      </div>
      <div className="space-y-3">
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
