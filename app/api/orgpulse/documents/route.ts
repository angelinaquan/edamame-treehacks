import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

/**
 * GET /api/orgpulse/documents?q=search&type=all|email|google_drive_file|slack_message|notion_page
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

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();
    const url = request.nextUrl;
    const query = url.searchParams.get("q") || "";
    const typeFilter = url.searchParams.get("type") || "all";

    let dbQuery = supabase
      .from("documents")
      .select("id, title, content, doc_type, file_url, created_at")
      .order("created_at", { ascending: false })
      .limit(100);

    // Filter by doc_type if a specific memory type is requested
    if (typeFilter === "episodic") {
      dbQuery = dbQuery.in("doc_type", ["email", "slack_message", "meeting_notes"]);
    } else if (typeFilter === "semantic") {
      dbQuery = dbQuery.in("doc_type", ["google_drive_file", "notion_page", "document"]);
    } else if (typeFilter !== "all") {
      dbQuery = dbQuery.eq("doc_type", typeFilter);
    }

    // Text search
    if (query) {
      dbQuery = dbQuery.or(`title.ilike.%${query}%,content.ilike.%${query}%`);
    }

    const { data, error } = await dbQuery;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Map to MemoryItem shape for the frontend
    const items = (data ?? []).map((doc) => ({
      id: doc.id,
      type: DOC_TYPE_TO_MEMORY_TYPE[doc.doc_type] || "semantic",
      title: doc.title.replace(/^(Gmail|Google Drive|Slack|Notion):\s*/i, ""),
      content: doc.content ?? "",
      timestamp: doc.created_at,
      tags: extractTags(doc),
      team: DOC_TYPE_TO_TEAM[doc.doc_type] || "Other",
      citations: doc.file_url
        ? [{ source: DOC_TYPE_TO_TEAM[doc.doc_type] || "Source", snippet: doc.file_url, date: new Date(doc.created_at).toLocaleDateString() }]
        : [],
    }));

    return NextResponse.json({ items, total: items.length });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
