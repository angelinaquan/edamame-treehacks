"use client";

import { Bell, X, ChevronRight } from "lucide-react";

interface NotificationBannerProps {
  title: string;
  description: string;
  people: string[];
  priority: "high" | "medium" | "low";
  onAction: () => void;
  onDismiss: () => void;
}

const priorityStyles = {
  high: "border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30",
  medium:
    "border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/30",
  low: "border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900",
};

const priorityBell = {
  high: "text-amber-500",
  medium: "text-blue-500",
  low: "text-zinc-500",
};

export function NotificationBanner({
  title,
  description,
  people,
  priority,
  onAction,
  onDismiss,
}: NotificationBannerProps) {
  return (
    <div
      className={`animate-slide-down border-b px-4 py-3 ${priorityStyles[priority]}`}
    >
      <div className="mx-auto flex max-w-3xl items-start gap-3">
        <Bell
          size={18}
          className={`mt-0.5 shrink-0 ${priorityBell[priority]}`}
        />
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            {title}
          </h4>
          <p className="mt-0.5 text-xs text-zinc-600 dark:text-zinc-400">
            {description}
          </p>
          <div className="mt-1.5 flex items-center gap-2">
            <div className="flex -space-x-1.5">
              {people.map((person) => (
                <div
                  key={person}
                  className="flex h-5 w-5 items-center justify-center rounded-full border-2 border-white bg-gradient-to-br from-blue-400 to-violet-500 text-[8px] font-bold text-white dark:border-zinc-900"
                  title={person}
                >
                  {person.charAt(0)}
                </div>
              ))}
            </div>
            <span className="text-[10px] text-zinc-500">
              {people.join(", ")}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={onAction}
            className="flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-blue-700"
          >
            Debrief me
            <ChevronRight size={12} />
          </button>
          <button
            onClick={onDismiss}
            className="rounded-lg p-1.5 text-zinc-400 transition-colors hover:bg-zinc-200 hover:text-zinc-600 dark:hover:bg-zinc-700 dark:hover:text-zinc-300"
          >
            <X size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
