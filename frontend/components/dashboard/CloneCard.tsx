"use client";

import { MessageSquare, Zap, Clock } from "lucide-react";
import type { Clone } from "@/lib/core/types";
import Link from "next/link";

interface CloneCardProps {
  clone: Clone & {
    owner_name?: string;
    owner_role?: string;
    owner_department?: string;
  };
}

const statusColors = {
  active: "bg-green-500",
  training: "bg-amber-500 animate-pulse",
  untrained: "bg-zinc-400",
  inactive: "bg-zinc-300",
};

const statusLabels = {
  active: "Active",
  training: "Training...",
  untrained: "Needs Training",
  inactive: "Inactive",
};

export function CloneCard({ clone }: CloneCardProps) {
  return (
    <div className="group rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm transition-all hover:shadow-md hover:border-blue-200 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-blue-800">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-blue-400 to-violet-500 text-lg font-bold text-white">
              {clone.name.charAt(0)}
            </div>
            <div
              className={`absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-white dark:border-zinc-900 ${statusColors[clone.status]}`}
            />
          </div>
          <div>
            <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">
              {clone.name}
            </h3>
            <p className="text-xs text-zinc-500">
              {clone.owner_role || clone.personality.bio.slice(0, 40)}
            </p>
          </div>
        </div>
        <span
          className={`rounded-full px-2.5 py-1 text-[10px] font-medium ${
            clone.status === "active"
              ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
              : clone.status === "training"
                ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
          }`}
        >
          {statusLabels[clone.status]}
        </span>
      </div>

      {/* Tags */}
      <div className="mt-3 flex flex-wrap gap-1.5">
        {clone.expertise_tags.slice(0, 4).map((tag) => (
          <span
            key={tag}
            className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
          >
            {tag}
          </span>
        ))}
      </div>

      {/* Footer */}
      <div className="mt-4 flex items-center justify-between border-t border-zinc-100 pt-3 dark:border-zinc-800">
        <div className="flex items-center gap-3 text-xs text-zinc-500">
          <span className="flex items-center gap-1">
            <Zap size={12} />
            {clone.expertise_tags.length} skills
          </span>
          {clone.trained_at && (
            <span className="flex items-center gap-1">
              <Clock size={12} />
              Trained{" "}
              {new Date(clone.trained_at).toLocaleDateString([], {
                month: "short",
                day: "numeric",
              })}
            </span>
          )}
        </div>
        {clone.status === "active" && (
          <Link
            href={`/chat?clone=${clone.id}`}
            className="flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-blue-700"
          >
            <MessageSquare size={12} />
            Chat
          </Link>
        )}
      </div>
    </div>
  );
}
