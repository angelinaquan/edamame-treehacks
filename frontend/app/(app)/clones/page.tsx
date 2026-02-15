"use client";

import { useEffect, useState } from "react";
import { CloneGrid } from "@/components/dashboard/CloneGrid";
import type { Clone } from "@/lib/core/types";

export default function ClonesPage() {
  const [clones, setClones] = useState<
    (Clone & {
      owner_name?: string;
      owner_role?: string;
      owner_department?: string;
    })[]
  >([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchClones() {
      try {
        const res = await fetch("/api/clones");
        const data = await res.json();
        setClones(data.clones);
      } catch (err) {
        console.error("Failed to fetch clones:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchClones();
  }, []);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
          All Clones
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          Every team member has an AI clone. View their status and chat with
          them.
        </p>
      </div>
      <CloneGrid clones={clones} />
    </div>
  );
}
