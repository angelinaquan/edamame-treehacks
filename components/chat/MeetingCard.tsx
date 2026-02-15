"use client";

import {
  Calendar,
  Users,
  AlertCircle,
  CheckCircle2,
  Clock,
} from "lucide-react";
import type { Meeting } from "@/lib/types";

interface MeetingCardProps {
  meeting: Meeting;
}

const sentimentColors = {
  positive: "text-green-500",
  neutral: "text-zinc-500",
  mixed: "text-amber-500",
  tense: "text-red-500",
};

const sentimentLabels = {
  positive: "Positive",
  neutral: "Neutral",
  mixed: "Mixed — some tension",
  tense: "Tense",
};

export function MeetingCard({ meeting }: MeetingCardProps) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
      {/* Header */}
      <div className="border-b border-zinc-100 px-4 py-3 dark:border-zinc-800">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              {meeting.title}
            </h3>
            <div className="mt-1 flex items-center gap-3 text-xs text-zinc-500">
              <span className="flex items-center gap-1">
                <Calendar size={12} />
                {new Date(meeting.date).toLocaleDateString([], {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                })}
              </span>
              <span className="flex items-center gap-1">
                <Users size={12} />
                {meeting.attendees.length} attendees
              </span>
            </div>
          </div>
          <span
            className={`flex items-center gap-1 text-xs font-medium ${sentimentColors[meeting.sentiment]}`}
          >
            <AlertCircle size={12} />
            {sentimentLabels[meeting.sentiment]}
          </span>
        </div>

        {/* Attendees */}
        <div className="mt-2 flex items-center gap-1.5">
          {meeting.attendees.map((a) => (
            <div
              key={a.name}
              className="flex items-center gap-1.5 rounded-full bg-zinc-100 px-2.5 py-1 dark:bg-zinc-800"
            >
              <div className="flex h-4 w-4 items-center justify-center rounded-full bg-gradient-to-br from-blue-400 to-violet-500 text-[8px] font-bold text-white">
                {a.name.charAt(0)}
              </div>
              <span className="text-[11px] font-medium text-zinc-700 dark:text-zinc-300">
                {a.name}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Discussion Points */}
      <div className="px-4 py-3">
        <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-400">
          Key Discussion Points
        </h4>
        <div className="space-y-2">
          {meeting.discussion_points.map((point, i) => (
            <div key={i} className="rounded-lg bg-zinc-50 p-2.5 dark:bg-zinc-800/50">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-zinc-800 dark:text-zinc-200">
                  {point.topic}
                </span>
                {point.speaker && (
                  <span className="text-[10px] text-zinc-400">
                    {point.speaker}
                  </span>
                )}
              </div>
              <p className="mt-1 text-[11px] leading-relaxed text-zinc-600 dark:text-zinc-400">
                {point.summary}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Action Items */}
      <div className="border-t border-zinc-100 px-4 py-3 dark:border-zinc-800">
        <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-400">
          Action Items
        </h4>
        <div className="space-y-1.5">
          {meeting.action_items.map((item, i) => (
            <div
              key={i}
              className="flex items-start gap-2 text-xs"
            >
              <span className="mt-0.5 shrink-0">
                {item.status === "done" ? (
                  <CheckCircle2
                    size={14}
                    className="text-green-500"
                  />
                ) : (
                  <Clock size={14} className="text-amber-500" />
                )}
              </span>
              <div className="flex-1">
                <span className="text-zinc-800 dark:text-zinc-200">
                  {item.description}
                </span>
                <span className="ml-1.5 text-zinc-400">
                  — {item.assignee}
                  {item.due_date ? ` (${item.due_date})` : ""}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
