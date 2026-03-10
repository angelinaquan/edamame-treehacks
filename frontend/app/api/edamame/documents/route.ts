import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/core/supabase/server";

/**
 * GET /api/edamame/documents?q=search&type=all|email|google_drive_file|slack_message|notion_page
 *
 * Returns documents from Supabase for the Memory Explorer.
 * Maps doc_type to episodic/semantic MemoryType for the frontend.
 */

const DOC_TYPE_TO_MEMORY_TYPE: Record<string, "episodic" | "semantic"> = {
  email: "episodic",
  slack_message: "episodic",
  meeting_notes: "episodic",
  google_drive_file: "semantic",
  notion_page: "semantic",
  document: "semantic",
};

const DOC_TYPE_TO_TEAM: Record<string, string> = {
  email: "Gmail",
  slack_message: "Slack",
  meeting_notes: "Meetings",
  google_drive_file: "Google Drive",
  notion_page: "Notion",
  document: "Documents",
};

function extractTags(doc: { doc_type: string; title: string; content: string | null }): string[] {
  const tags: string[] = [];
  tags.push(DOC_TYPE_TO_TEAM[doc.doc_type] || doc.doc_type);

  // Extract a few keywords from the title
  const titleWords = doc.title
    .replace(/^(Gmail|Google Drive|Slack|Notion):\s*/i, "")
    .split(/\s+/)
    .filter((w) => w.length > 3)
    .slice(0, 2)
    .map((w) => w.toLowerCase().replace(/[^a-z0-9]/g, ""));
  tags.push(...titleWords.filter(Boolean));

  return [...new Set(tags)];
}

/** Map episodic event_type metadata to a human-readable team/source label. */
const EVENT_TYPE_TO_TEAM: Record<string, string> = {
  meeting: "Meetings",
  incident: "Operations",
  decision: "Leadership",
  launch: "Engineering",
  conversation: "Conversations",
  review: "Engineering",
};

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();
    const url = request.nextUrl;
    const query = url.searchParams.get("q") || "";
    const typeFilter = url.searchParams.get("type") || "all";

    // --- Query 1: documents (existing behavior) ---
    let dbQuery = supabase
      .from("memories")
      .select("id, content, metadata, source, created_at")
      .eq("type", "document")
      .order("created_at", { ascending: false })
      .limit(100);

    // Filter by doc_type (stored in metadata) if a specific memory type is requested
    if (typeFilter === "episodic") {
      dbQuery = dbQuery.in("source", ["email", "slack"]);
    } else if (typeFilter === "semantic") {
      dbQuery = dbQuery.in("source", ["gdrive", "notion", "github", "manual"]);
    } else if (typeFilter !== "all") {
      dbQuery = dbQuery.eq("metadata->>doc_type", typeFilter);
    }

    // Text search
    if (query) {
      dbQuery = dbQuery.or(`content.ilike.%${query}%,metadata->>title.ilike.%${query}%`);
    }

    // --- Query 2: episodic memories (type='episodic') ---
    let episodicQuery = supabase
      .from("memories")
      .select("id, content, metadata, source, occurred_at, created_at")
      .eq("type", "episodic")
      .order("occurred_at", { ascending: false })
      .limit(50);

    if (query) {
      episodicQuery = episodicQuery.or(`content.ilike.%${query}%`);
    }

    // Only run episodic query if filter is "all" or "episodic"
    const shouldFetchEpisodic = typeFilter === "all" || typeFilter === "episodic";

    const [docResult, episodicResult] = await Promise.all([
      dbQuery,
      shouldFetchEpisodic ? episodicQuery : Promise.resolve({ data: null, error: null }),
    ]);

    if (docResult.error) {
      return NextResponse.json({ error: docResult.error.message }, { status: 500 });
    }

    // Map documents to MemoryItem shape
    const docItems = (docResult.data ?? []).map((row) => {
      const meta = (row.metadata || {}) as Record<string, unknown>;
      const docType = (meta.doc_type as string) || row.source;
      const title = (meta.title as string) || "Untitled";
      const fileUrl = meta.file_url as string | undefined;
      return {
        id: row.id,
        type: DOC_TYPE_TO_MEMORY_TYPE[docType] || "semantic" as "episodic" | "semantic",
        title: title.replace(/^(Gmail|Google Drive|Slack|Notion):\s*/i, ""),
        content: row.content ?? "",
        timestamp: row.created_at,
        tags: extractTags({ doc_type: docType, title, content: row.content }),
        team: DOC_TYPE_TO_TEAM[docType] || "Other",
        citations: fileUrl
          ? [{ source: DOC_TYPE_TO_TEAM[docType] || "Source", snippet: fileUrl, date: new Date(row.created_at).toLocaleDateString() }]
          : [],
      };
    });

    // Map episodic memories to MemoryItem shape
    const episodicItems = (episodicResult.data ?? []).map((row: {
      id: string;
      content: string;
      metadata: Record<string, unknown> | null;
      source: string;
      occurred_at: string;
      created_at: string;
    }) => {
      const meta = (row.metadata || {}) as Record<string, unknown>;
      const eventType = (meta.event_type as string) || "conversation";
      const participants = (meta.participants as string[]) || [];
      const valence = (meta.emotional_valence as string) || "neutral";
      const outcome = meta.outcome as string | undefined;

      // Build a descriptive title from episode metadata
      const participantStr = participants.length > 0 ? ` with ${participants.slice(0, 3).join(", ")}` : "";
      const title = `${eventType.charAt(0).toUpperCase() + eventType.slice(1)}${participantStr}`;

      // Build tags from event_type, participants, and valence
      const tags = [
        EVENT_TYPE_TO_TEAM[eventType] || eventType,
        valence,
        ...participants.slice(0, 2),
      ].filter(Boolean);

      return {
        id: row.id,
        type: "episodic" as const,
        title,
        content: outcome ? `${row.content}\n\nOutcome: ${outcome}` : row.content ?? "",
        timestamp: row.occurred_at || row.created_at,
        tags: [...new Set(tags)],
        team: EVENT_TYPE_TO_TEAM[eventType] || "Other",
        citations: [] as { source: string; snippet: string; date: string }[],
      };
    });

    // Merge and sort by timestamp (newest first)
    const allItems = [...docItems, ...episodicItems]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    // If filtering to semantic only, exclude episodic items
    const filteredItems = typeFilter === "semantic"
      ? allItems.filter((item) => item.type === "semantic")
      : allItems;

    return NextResponse.json({ items: filteredItems, total: filteredItems.length });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
