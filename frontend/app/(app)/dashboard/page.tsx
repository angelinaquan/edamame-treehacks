"use client";

import { useEffect, useState } from "react";
import { CloneGrid } from "@/components/dashboard/CloneGrid";
import { ConversationLog } from "@/components/dashboard/ConversationLog";
import type { Clone } from "@/lib/core/types";

export default function DashboardPage() {
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

  const mockConversations = [
    {
      id: "1",
      clone_name: "James Liu (Clone)",
      user_name: "Angelina Quan",
      last_message: "Should we go with the ambient listener or healthcare agent?",
      timestamp: "2 min ago",
      has_collaboration: true,
    },
    {
      id: "2",
      clone_name: "Ella Lan (Clone)",
      user_name: "Videet Mehta",
      last_message: "The self-improvement loop demo isn't working yet",
      timestamp: "15 min ago",
      has_collaboration: false,
    },
    {
      id: "3",
      clone_name: "Videet Mehta (Clone)",
      user_name: "James Liu",
      last_message: "We need to cut scope. 18 hours left.",
      timestamp: "1 hour ago",
      has_collaboration: true,
    },
  ];

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
          Team Dashboard
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          Overview of all team clones, their status, and recent activity.
        </p>
      </div>

      <CloneGrid clones={clones} />

      <div className="mt-8">
        <ConversationLog conversations={mockConversations} />
      </div>
    </div>
  );
}
