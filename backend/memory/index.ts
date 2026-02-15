/**
 * Memory — organizational knowledge storage, retrieval, and compaction.
 * Supports Supabase and Mem0 providers with fallback.
 */

import type { Chunk, Memory } from "@/lib/core/types";
import { mockMemories, mockDocuments } from "./mock-data";
import { createServerSupabaseClient } from "@/lib/core/supabase/server";
import {
  isMem0MemoryEnabled,
  readRuntimeEnv,
  isSupabaseConfigured,
  isSupabaseMemoryEnabled as isSupabaseMemoryFlagEnabled,
} from "./flags";
import { searchMem0KnowledgeContext } from "./mem0";

// Re-export mock data for convenience (used by agents)
export {
  mockPeople,
  mockClones,
  mockMeetings,
  mockDocuments,
  mockSlackMessages,
  mockMemories,
  mockReminders,
  getCloneById,
  getCloneByName,
  getPersonByUserId,
  getMeetingById,
  getActiveReminders,
  getCloneForUser,
} from "./mock-data";

export interface KnowledgeContext {
  categories: Array<{
    category_key: string;
    summary: string;
    confidence: number;
  }>;
  items: Array<{
    fact: string;
    confidence: number;
    source_type: string;
    occurred_at: string;
    category_key?: string;
  }>;
  chunks: Chunk[];
  resources: Array<{
    source_type: string;
    title?: string;
    author?: string;
    occurred_at: string;
    content: string;
  }>;
}

export interface CompactionResult {
  categoriesCreated: number;
  itemsUpdated: number;
  snapshotsCreated?: number;
}

export function isSupabaseMemoryEnabled(): boolean {
  return isSupabaseMemoryFlagEnabled();
}

function isSupabaseFallbackAvailable(): boolean {
  return readRuntimeEnv("USE_SUPABASE_MEMORY") === "true" && isSupabaseConfigured();
}

function cleanTerm(term: string): string {
  return term.replace(/[%,'"]/g, "").trim();
}

function buildIlikeOr(column: string, terms: string[]): string {
  return terms.map((term) => `${column}.ilike.%${cleanTerm(term)}%`).join(",");
}

function summarizeLines(lines: string[], maxLines = 3): string {
  return lines
    .slice(0, maxLines)
    .map((line) => line.trim())
    .filter(Boolean)
    .join(" ");
}

export function searchKnowledgeBase(
  cloneId: string,
  query: string,
  topK: number = 5
): Chunk[] {
  const queryTerms = query.toLowerCase().split(/\s+/);
  const cloneDocs = mockDocuments.filter((d) => d.clone_id === cloneId);

  const results = cloneDocs
    .map((doc) => ({
      id: doc.id,
      document_id: doc.id,
      clone_id: cloneId,
      content: doc.content,
      metadata: { title: doc.title, doc_type: doc.doc_type } as Record<
        string,
        unknown
      >,
      created_at: doc.created_at,
      score: queryTerms.filter((term) =>
        doc.content.toLowerCase().includes(term)
      ).length,
    }))
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);

  return results;
}

export function getCloneMemories(cloneId: string): Memory[] {
  return mockMemories.filter((m) => m.clone_id === cloneId);
}

export function extractFacts(content: string): string[] {
  const sentences = content
    .split(/[.!?]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 20);
  return sentences.filter((s) => {
    const factPatterns = [
      /deadline|due date|by \w+day/i,
      /decided|agreed|confirmed/i,
      /will|going to|plan to/i,
      /budget|cost|price|revenue/i,
      /\d+%|\$\d+/,
      /important|critical|urgent/i,
    ];
    return factPatterns.some((p) => p.test(s));
  });
}

export function saveFact(
  cloneId: string,
  fact: string,
  conversationId: string
): Memory {
  const memory: Memory = {
    id: `mem_${Date.now()}`,
    clone_id: cloneId,
    fact,
    source_conversation_id: conversationId,
    confidence: 0.85,
    created_at: new Date().toISOString(),
  };
  return memory;
}

export async function getKnowledgeContext(
  cloneId: string,
  query: string,
  topK: number = 5
): Promise<KnowledgeContext | null> {
  if (isMem0MemoryEnabled()) {
    try {
      const mem0Context = await searchMem0KnowledgeContext(cloneId, query, topK);
      if (mem0Context) {
        return mem0Context;
      }
    } catch (error) {
      console.error("Mem0 retrieval failed, attempting Supabase fallback:", error);
    }
  }

  if (!isSupabaseMemoryEnabled() && !isSupabaseFallbackAvailable()) return null;

  const supabase = createServerSupabaseClient();
  const terms = query
    .toLowerCase()
    .split(/\s+/)
    .filter((t) => t.length >= 3)
    .slice(0, 6);

  const categoryQuery = supabase
    .from("memory_categories")
    .select("category_key, summary, confidence, updated_at")
    .eq("clone_id", cloneId)
    .order("updated_at", { ascending: false })
    .limit(4);

  let itemQuery = supabase
    .from("memory_items")
    .select("fact, confidence, source_type, occurred_at, category_key")
    .eq("clone_id", cloneId)
    .order("confidence", { ascending: false })
    .limit(topK * 2);

  let chunkQuery = supabase
    .from("chunks")
    .select("id, document_id, clone_id, content, metadata, created_at")
    .eq("clone_id", cloneId)
    .order("created_at", { ascending: false })
    .limit(topK * 3);

  if (terms.length > 0) {
    itemQuery = itemQuery.or(buildIlikeOr("fact", terms));
    chunkQuery = chunkQuery.or(buildIlikeOr("content", terms));
  }

  const resourceQuery = supabase
    .from("memory_resources")
    .select("source_type, title, author, occurred_at, content")
    .eq("clone_id", cloneId)
    .order("occurred_at", { ascending: false })
    .limit(6);

  const [{ data: categories }, { data: items }, { data: chunks }, { data: resources }] =
    await Promise.all([categoryQuery, itemQuery, chunkQuery, resourceQuery]);

  return {
    categories:
      categories?.map((row: { category_key: string; summary: string; confidence: number | null }) => ({
        category_key: row.category_key,
        summary: row.summary,
        confidence: row.confidence ?? 0.5,
      })) || [],
    items:
      items?.map((row: {
        fact: string;
        confidence: number | null;
        source_type: string;
        occurred_at: string;
        category_key: string | null;
      }) => ({
        fact: row.fact,
        confidence: row.confidence ?? 0.5,
        source_type: row.source_type,
        occurred_at: row.occurred_at,
        category_key: row.category_key || undefined,
      })) || [],
    chunks: (chunks as Chunk[]) || [],
    resources:
      resources?.map((row: {
        source_type: string;
        title: string | null;
        author: string | null;
        occurred_at: string;
        content: string;
      }) => ({
        source_type: row.source_type,
        title: row.title || undefined,
        author: row.author || undefined,
        occurred_at: row.occurred_at,
        content: row.content,
      })) || [],
  };
}

export async function runWeeklySummarization(
  cloneId: string
): Promise<CompactionResult> {
  if (!isSupabaseMemoryEnabled()) {
    return { categoriesCreated: 0, itemsUpdated: 0 };
  }

  const supabase = createServerSupabaseClient();
  const weeklyCutoff = new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString();

  const { data: staleItems, error } = await supabase
    .from("memory_items")
    .select(
      "id, fact, confidence, source_type, category_key, occurred_at, created_at"
    )
    .eq("clone_id", cloneId)
    .eq("compaction_state", "active")
    .lt("occurred_at", weeklyCutoff)
    .order("occurred_at", { ascending: true })
    .limit(500);

  if (error || !staleItems || staleItems.length === 0) {
    return { categoriesCreated: 0, itemsUpdated: 0 };
  }

  const grouped = new Map<string, typeof staleItems>();
  for (const item of staleItems) {
    const key = `${item.source_type}:${item.category_key || "general"}`;
    const existing = grouped.get(key) || [];
    existing.push(item);
    grouped.set(key, existing);
  }

  const categoryRows = Array.from(grouped.entries()).map(([key, items]) => {
    const [sourceType, categoryKey] = key.split(":");
    const confidence =
      items.reduce(
        (sum: number, item: { confidence: number | null }) =>
          sum + (item.confidence || 0.5),
        0
      ) /
      items.length;
    return {
      clone_id: cloneId,
      category_type:
        sourceType === "slack"
          ? "topic"
          : sourceType === "github"
            ? "project"
            : "timeline",
      category_key: categoryKey,
      summary: summarizeLines(items.map((i: { fact: string }) => i.fact), 4),
      item_count: items.length,
      confidence,
      time_window_start: items[0]?.occurred_at,
      time_window_end: items[items.length - 1]?.occurred_at,
      last_item_at: items[items.length - 1]?.occurred_at,
      is_monthly_snapshot: false,
      metadata: {
        source_type: sourceType,
        compaction: "weekly",
      },
    };
  });

  const { error: categoryInsertError } = await supabase
    .from("memory_categories")
    .insert(categoryRows);
  if (categoryInsertError) {
    throw new Error(categoryInsertError.message);
  }

  const staleIds = staleItems.map((item: { id: string }) => item.id);
  const { data: updatedRows, error: itemUpdateError } = await supabase
    .from("memory_items")
    .update({ compaction_state: "weekly_summarized" })
    .in("id", staleIds)
    .select("id");

  if (itemUpdateError) {
    throw new Error(itemUpdateError.message);
  }

  return {
    categoriesCreated: categoryRows.length,
    itemsUpdated: updatedRows?.length || 0,
  };
}

export async function runMonthlyRewind(
  cloneId: string
): Promise<CompactionResult> {
  if (!isSupabaseMemoryEnabled()) {
    return { categoriesCreated: 0, itemsUpdated: 0, snapshotsCreated: 0 };
  }

  const supabase = createServerSupabaseClient();
  const monthlyCutoff = new Date(
    Date.now() - 1000 * 60 * 60 * 24 * 30
  ).toISOString();

  const { data: categories, error: categoriesError } = await supabase
    .from("memory_categories")
    .select(
      "category_type, category_key, summary, confidence, item_count, time_window_start, time_window_end, last_item_at, metadata"
    )
    .eq("clone_id", cloneId)
    .eq("is_monthly_snapshot", false)
    .lt("updated_at", monthlyCutoff)
    .limit(300);

  if (categoriesError || !categories || categories.length === 0) {
    return { categoriesCreated: 0, itemsUpdated: 0, snapshotsCreated: 0 };
  }

  const snapshotRows = categories.map((category: {
    category_type: string;
    category_key: string;
    summary: string;
    confidence: number;
    item_count: number;
    time_window_start: string | null;
    time_window_end: string | null;
    last_item_at: string | null;
    metadata: Record<string, unknown> | null;
  }) => ({
    clone_id: cloneId,
    category_type: category.category_type,
    category_key: category.category_key,
    summary: `Monthly rewind: ${category.summary}`,
    item_count: category.item_count,
    confidence: category.confidence,
    time_window_start: category.time_window_start,
    time_window_end: category.time_window_end,
    last_item_at: category.last_item_at,
    is_monthly_snapshot: true,
    metadata: {
      ...(category.metadata || {}),
      compaction: "monthly_rewind",
    },
  }));

  const { error: snapshotInsertError } = await supabase
    .from("memory_categories")
    .insert(snapshotRows);
  if (snapshotInsertError) {
    throw new Error(snapshotInsertError.message);
  }

  const { data: rewoundItems, error: itemsError } = await supabase
    .from("memory_items")
    .update({ compaction_state: "monthly_rewound" })
    .eq("clone_id", cloneId)
    .neq("compaction_state", "monthly_rewound")
    .lt("occurred_at", monthlyCutoff)
    .select("id");

  if (itemsError) {
    throw new Error(itemsError.message);
  }

  return {
    categoriesCreated: 0,
    itemsUpdated: rewoundItems?.length || 0,
    snapshotsCreated: snapshotRows.length,
  };
}
