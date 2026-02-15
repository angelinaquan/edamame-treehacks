"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { ArrowLeft, MessageSquare, Settings, FileText } from "lucide-react";
import type { Clone, PersonContext, Document as DocType, Memory } from "@/lib/core/types";
import { PersonCard } from "@/components/chat/PersonCard";

interface CloneDetails {
  clone: Clone & {
    owner: PersonContext;
    documents: DocType[];
    memories: Memory[];
    stats: {
      document_count: number;
      memory_count: number;
      training_sources: string[];
    };
  };
}

export default function CloneDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [data, setData] = useState<CloneDetails | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchClone() {
      try {
        const res = await fetch(`/api/clones/${id}`);
        const json = await res.json();
        setData(json);
      } catch (err) {
        console.error("Failed to fetch clone:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchClone();
  }, [id]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex h-full items-center justify-center text-zinc-500">
        Clone not found
      </div>
    );
  }

  const { clone } = data;

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <Link
        href="/dashboard"
        className="mb-6 inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
      >
        <ArrowLeft size={14} />
        Back to Dashboard
      </Link>

      {clone.owner && <PersonCard person={clone.owner} />}

      <div className="mt-6 flex gap-3">
        <Link
          href={`/chat?clone=${clone.id}`}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700"
        >
          <MessageSquare size={16} />
          Chat with Clone
        </Link>
        <Link
          href={`/clones/${clone.id}/train`}
          className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-4 py-2.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          <Settings size={16} />
          Train Clone
        </Link>
      </div>

      <div className="mt-8 grid grid-cols-2 gap-4">
        <div className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
          <div className="flex items-center gap-2 text-zinc-500">
            <FileText size={16} />
            <span className="text-sm">Documents</span>
          </div>
          <p className="mt-1 text-2xl font-bold text-zinc-900 dark:text-zinc-100">
            {clone.stats.document_count}
          </p>
        </div>
        <div className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
          <div className="flex items-center gap-2 text-zinc-500">
            <Settings size={16} />
            <span className="text-sm">Memories</span>
          </div>
          <p className="mt-1 text-2xl font-bold text-zinc-900 dark:text-zinc-100">
            {clone.stats.memory_count}
          </p>
        </div>
      </div>

      {clone.memories.length > 0 && (
        <div className="mt-8">
          <h3 className="mb-3 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
            Learned Memories
          </h3>
          <div className="space-y-2">
            {clone.memories.map((memory) => (
              <div
                key={memory.id}
                className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-900"
              >
                <p className="text-xs text-zinc-700 dark:text-zinc-300">
                  {memory.fact}
                </p>
                <p className="mt-1 text-[10px] text-zinc-400">
                  Confidence: {Math.round(memory.confidence * 100)}%
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
