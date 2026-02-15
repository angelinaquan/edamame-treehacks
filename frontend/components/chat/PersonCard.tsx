"use client";

import { Briefcase, MessageCircle, Star } from "lucide-react";
import type { PersonContext } from "@/lib/types";

interface PersonCardProps {
  person: PersonContext;
  compact?: boolean;
}

export function PersonCard({ person, compact = false }: PersonCardProps) {
  if (compact) {
    return (
      <div className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-1.5 dark:border-zinc-700 dark:bg-zinc-900">
        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-blue-400 to-violet-500 text-[10px] font-bold text-white">
          {person.name.charAt(0)}
        </div>
        <div>
          <span className="text-xs font-medium text-zinc-900 dark:text-zinc-100">
            {person.name}
          </span>
          <span className="ml-1.5 text-[10px] text-zinc-400">
            {person.role}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-blue-400 to-violet-500 text-sm font-bold text-white">
          {person.name.charAt(0)}
        </div>
        <div>
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            {person.name}
          </h3>
          <div className="flex items-center gap-1 text-xs text-zinc-500">
            <Briefcase size={10} />
            {person.role} · {person.department}
          </div>
        </div>
      </div>

      {/* Relationship */}
      <p className="mt-3 text-xs text-zinc-600 dark:text-zinc-400">
        {person.relationship}
      </p>

      {/* Recent Interactions */}
      <div className="mt-3">
        <div className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
          <MessageCircle size={10} />
          Recent
        </div>
        <ul className="mt-1.5 space-y-1">
          {person.recent_interactions.slice(0, 3).map((interaction, i) => (
            <li
              key={i}
              className="text-[11px] leading-relaxed text-zinc-600 dark:text-zinc-400"
            >
              {interaction}
            </li>
          ))}
        </ul>
      </div>

      {/* Key Facts */}
      <div className="mt-3">
        <div className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
          <Star size={10} />
          Key Facts
        </div>
        <ul className="mt-1.5 space-y-1">
          {person.key_facts.slice(0, 3).map((fact, i) => (
            <li
              key={i}
              className="text-[11px] leading-relaxed text-zinc-600 dark:text-zinc-400"
            >
              {fact}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
