"use client";

import { useEffect, useState } from "react";
import { PersonCard } from "@/components/chat/PersonCard";
import Link from "next/link";
import { MessageSquare, Settings, Brain } from "lucide-react";
import type { Clone, PersonContext, Memory } from "@/lib/types";

export default function MyClonePage() {
  const [clone, setClone] = useState<
    (Clone & { owner: PersonContext; memories: Memory[] }) | null
  >(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchMyClone() {
      try {
        const res = await fetch("/api/clones/clone_self");
        const data = await res.json();
        setClone(data.clone);
      } catch (err) {
        console.error("Failed to fetch clone:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchMyClone();
  }, []);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  if (!clone) {
    return (
      <div className="flex h-full items-center justify-center text-zinc-500">
        Clone not found
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-8">
      <h1 className="mb-6 text-2xl font-bold text-zinc-900 dark:text-zinc-100">
        My Clone
      </h1>

      {clone.owner && <PersonCard person={clone.owner} />}

      <div className="mt-6 flex gap-3">
        <Link
          href="/"
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
        >
          <MessageSquare size={16} />
          Chat
        </Link>
        <Link
          href={`/clones/${clone.id}/train`}
          className="flex items-center gap-2 rounded-lg border border-zinc-200 px-4 py-2.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          <Settings size={16} />
          Retrain
        </Link>
      </div>

      {/* Expertise */}
      <div className="mt-8">
        <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
          <Brain size={16} />
          Expertise Tags
        </h3>
        <div className="flex flex-wrap gap-2">
          {clone.expertise_tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
            >
              {tag}
            </span>
          ))}
        </div>
      </div>

      {/* Memories */}
      {clone.memories && clone.memories.length > 0 && (
        <div className="mt-8">
          <h3 className="mb-3 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
            What your clone remembers ({clone.memories.length} facts)
          </h3>
          <div className="space-y-2">
            {clone.memories.map((mem) => (
              <div
                key={mem.id}
                className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-900"
              >
                <p className="text-xs text-zinc-700 dark:text-zinc-300">
                  {mem.fact}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
