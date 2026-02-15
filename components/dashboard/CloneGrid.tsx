"use client";

import { CloneCard } from "./CloneCard";
import type { Clone } from "@/lib/types";

interface CloneGridProps {
  clones: (Clone & {
    owner_name?: string;
    owner_role?: string;
    owner_department?: string;
  })[];
}

export function CloneGrid({ clones }: CloneGridProps) {
  const activeClones = clones.filter((c) => c.status === "active");
  const otherClones = clones.filter((c) => c.status !== "active");

  return (
    <div>
      {/* Stats */}
      <div className="mb-6 grid grid-cols-3 gap-4">
        <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
            {clones.length}
          </div>
          <div className="text-xs text-zinc-500">Total Clones</div>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="text-2xl font-bold text-green-600">
            {activeClones.length}
          </div>
          <div className="text-xs text-zinc-500">Active</div>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="text-2xl font-bold text-amber-600">
            {otherClones.length}
          </div>
          <div className="text-xs text-zinc-500">Need Training</div>
        </div>
      </div>

      {/* Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {clones.map((clone) => (
          <CloneCard key={clone.id} clone={clone} />
        ))}
      </div>
    </div>
  );
}
