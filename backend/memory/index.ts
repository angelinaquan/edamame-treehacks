/**
 * Memory — organizational knowledge storage, retrieval, and compaction.
 * All knowledge lives in a single `memories` table with type/source discriminators.
 * Supports Supabase and Mem0 providers with fallback.
 */

import type { Chunk, Memory } from "@/lib/core/types";
import { generateEmbedding } from "@/lib/agents/openai";
import { attachEmbeddingsToMemoryRows } from "@/lib/memory/embeddings";
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

function canUseVectorSearch(): boolean {
  return Boolean(readRuntimeEnv("OPENAI_API_KEY"));
}

type VectorMatchRow = {
  id: string;
  clone_id: string;
  type: "fact" | "chunk";
  source: string;
  content: string;
  confidence: number | null;
  metadata: Record<string, unknown> | null;
  occurred_at: string;
  created_at: string;
  similarity: number | null;
};

async function searchSupabaseVectorMemory(
  supabase: ReturnType<typeof createServerSupabaseClient>,
  cloneId: string,
  query: string,
  topK: number
): Promise<
  | {
      items: KnowledgeContext["items"];
      chunks: Chunk[];
    }
  | null
> {
  if (!canUseVectorSearch()) return null;
  const normalizedQuery = query.trim();
  if (!normalizedQuery) return null;

  try {
    const queryEmbedding = await generateEmbedding(normalizedQuery.slice(0, 6000));
    const { data, error } = await supabase.rpc("match_memories", {
      p_clone_id: cloneId,
      p_query_embedding: queryEmbedding,
      p_match_count: Math.max(topK * 4, 8),
      p_types: ["fact", "chunk"],
    });

    if (error) {
      console.warn("Vector retrieval unavailable; falling back to keyword search:", error.message);
      return null;
    }

    const rows = (data || []) as VectorMatchRow[];
    if (rows.length === 0) return null;

    const items: KnowledgeContext["items"] = rows
      .filter((row) => row.type === "fact")
      .slice(0, topK * 2)
      .map((row) => ({
        fact: row.content,
        confidence: row.confidence ?? 0.5,
        source_type: row.source,
        occurred_at: row.occurred_at,
        category_key: row.metadata?.category_key as string | undefined,
      }));

    const chunks: Chunk[] = rows
      .filter((row) => row.type === "chunk")
      .slice(0, topK * 3)
      .map((row) => ({
        id: row.id,
        clone_id: row.clone_id,
        content: row.content,
        metadata: row.metadata || {},
        created_at: row.created_at,
      }));

    return {
      items,
      chunks,
    };
  } catch (error) {
    console.warn("Vector retrieval failed; falling back to keyword search:", error);
    return null;
  }
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

export function getCloneMemories(cloneId: string) {
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
    type: "fact",
    source: "conversation",
    content: fact,
    confidence: 0.85,
    metadata: { source_conversation_id: conversationId },
    occurred_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
  };
  return memory;
}

export interface ConversationFactWriteParams {
  cloneId: string;
  conversationId?: string;
  userMessage?: string;
  assistantMessage?: string;
  occurredAt?: string;
  maxFactsPerTurn?: number;
}

export interface ConversationFactWriteResult {
  inserted: number;
  skipped: number;
}

function normalizeFactText(input: string): string {
  return input
    .replace(/\s+/g, " ")
    .replace(/^[-*]\s+/, "")
    .trim();
}

function factKey(input: string): string {
  return normalizeFactText(input).toLowerCase();
}

function fallbackFactCandidates(content: string, limit = 2): string[] {
  return content
    .split(/[.!?]+/)
    .map(normalizeFactText)
    .filter((sentence) => sentence.length >= 28)
    .slice(0, limit);
}

function extractConversationFactCandidates(content?: string): string[] {
  if (!content) return [];
  const normalized = normalizeFactText(content);
  if (!normalized) return [];

  const extracted = extractFacts(normalized).map(normalizeFactText).filter(Boolean);
  if (extracted.length > 0) return extracted;
  return fallbackFactCandidates(normalized, 2);
}

export async function writeConversationFacts(
  params: ConversationFactWriteParams
): Promise<ConversationFactWriteResult> {
  if (!isSupabaseConfigured()) {
    return { inserted: 0, skipped: 0 };
  }

  const maxFacts = Math.min(Math.max(params.maxFactsPerTurn ?? 8, 1), 20);
  const occurredAt = params.occurredAt || new Date().toISOString();
  const conversationId = params.conversationId || `conv_${Date.now()}`;

  const rawCandidates = [
    ...extractConversationFactCandidates(params.userMessage).map((fact) => ({
      content: fact,
      confidence: 0.74,
      speakerRole: "user" as const,
    })),
    ...extractConversationFactCandidates(params.assistantMessage).map((fact) => ({
      content: fact,
      confidence: 0.82,
      speakerRole: "assistant" as const,
    })),
  ];

  if (rawCandidates.length === 0) {
    return { inserted: 0, skipped: 0 };
  }

  const localSeen = new Set<string>();
  const localUnique: typeof rawCandidates = [];
  for (const candidate of rawCandidates) {
    const key = factKey(candidate.content);
    if (!key || localSeen.has(key)) continue;
    localSeen.add(key);
    localUnique.push(candidate);
  }

  if (localUnique.length === 0) {
    return { inserted: 0, skipped: rawCandidates.length };
  }

  const supabase = createServerSupabaseClient();
  const { data: existingRows } = await supabase
    .from("memories")
    .select("content")
    .eq("clone_id", params.cloneId)
    .eq("type", "fact")
    .eq("source", "conversation")
    .order("created_at", { ascending: false })
    .limit(400);

  const existingSet = new Set(
    (existingRows || [])
      .map((row: { content: string }) => factKey(row.content))
      .filter(Boolean)
  );

  const rowsToInsert = localUnique
    .filter((candidate) => !existingSet.has(factKey(candidate.content)))
    .slice(0, maxFacts)
    .map((candidate, index) => ({
      clone_id: params.cloneId,
      type: "fact" as const,
      source: "conversation" as const,
      content: candidate.content,
      confidence: candidate.confidence,
      metadata: {
        source_conversation_id: conversationId,
        speaker_role: candidate.speakerRole,
        capture_method: "post_chat_extraction",
        category_key: "conversation",
        compaction_state: "active",
        sequence: index,
      },
      occurred_at: occurredAt,
      embedding: null as number[] | null,
    }));

  if (rowsToInsert.length === 0) {
    return {
      inserted: 0,
      skipped: localUnique.length,
    };
  }

  const rowsWithEmbeddings = await attachEmbeddingsToMemoryRows(rowsToInsert);
  const { error } = await supabase.from("memories").insert(rowsWithEmbeddings);
  if (error) {
    throw new Error(`Failed to persist conversation facts: ${error.message}`);
  }

  return {
    inserted: rowsToInsert.length,
    skipped: Math.max(localUnique.length - rowsToInsert.length, 0),
  };
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

  // Fetch categories (type = 'category')
  const categoryQuery = supabase
    .from("memories")
    .select("content, confidence, metadata, occurred_at")
    .eq("clone_id", cloneId)
    .eq("type", "category")
    .order("occurred_at", { ascending: false })
    .limit(4);

  // Fetch fact items (type = 'fact')
  let itemQuery = supabase
    .from("memories")
    .select("content, confidence, source, occurred_at, metadata")
    .eq("clone_id", cloneId)
    .eq("type", "fact")
    .order("confidence", { ascending: false })
    .limit(topK * 2);

  // Fetch chunks (type = 'chunk')
  let chunkQuery = supabase
    .from("memories")
    .select("id, clone_id, content, metadata, created_at")
    .eq("clone_id", cloneId)
    .eq("type", "chunk")
    .order("created_at", { ascending: false })
    .limit(topK * 3);

  if (terms.length > 0) {
    itemQuery = itemQuery.or(buildIlikeOr("content", terms));
    chunkQuery = chunkQuery.or(buildIlikeOr("content", terms));
  }

  // Fetch documents/snapshots as resources (type in document, snapshot)
  const resourceQuery = supabase
    .from("memories")
    .select("source, content, metadata, occurred_at")
    .eq("clone_id", cloneId)
    .in("type", ["document", "snapshot"])
    .order("occurred_at", { ascending: false })
    .limit(6);

  const [vectorMatches, { data: categories }, { data: items }, { data: chunks }, { data: resources }] =
    await Promise.all([
      searchSupabaseVectorMemory(supabase, cloneId, query, topK),
      categoryQuery,
      itemQuery,
      chunkQuery,
      resourceQuery,
    ]);

  const keywordItems: KnowledgeContext["items"] =
    items?.map((row: {
      content: string;
      confidence: number | null;
      source: string;
      occurred_at: string;
      metadata: Record<string, unknown>;
    }) => ({
      fact: row.content,
      confidence: row.confidence ?? 0.5,
      source_type: row.source,
      occurred_at: row.occurred_at,
      category_key: row.metadata?.category_key as string | undefined,
    })) || [];

  const finalItems =
    vectorMatches?.items && vectorMatches.items.length > 0
      ? vectorMatches.items
      : keywordItems;
  const finalChunks =
    vectorMatches?.chunks && vectorMatches.chunks.length > 0
      ? vectorMatches.chunks
      : ((chunks as Chunk[]) || []);

  return {
    categories:
      categories?.map((row: { content: string; confidence: number | null; metadata: Record<string, unknown> }) => ({
        category_key: String(row.metadata?.category_key || "general"),
        summary: row.content,
        confidence: row.confidence ?? 0.5,
      })) || [],
    items: finalItems,
    chunks: finalChunks,
    resources:
      resources?.map((row: {
        source: string;
        content: string;
        metadata: Record<string, unknown>;
        occurred_at: string;
      }) => ({
        source_type: row.source,
        title: row.metadata?.title as string | undefined,
        author: row.metadata?.author as string | undefined,
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

  // Find stale fact items
  const { data: staleItems, error } = await supabase
    .from("memories")
    .select("id, content, confidence, source, metadata, occurred_at, created_at")
    .eq("clone_id", cloneId)
    .eq("type", "fact")
    .eq("metadata->>compaction_state", "active")
    .lt("occurred_at", weeklyCutoff)
    .order("occurred_at", { ascending: true })
    .limit(500);

  if (error || !staleItems || staleItems.length === 0) {
    return { categoriesCreated: 0, itemsUpdated: 0 };
  }

  type StaleItem = {
    id: string;
    content: string;
    confidence: number | null;
    source: string;
    metadata: Record<string, unknown>;
    occurred_at: string;
  };

  const grouped = new Map<string, StaleItem[]>();
  for (const item of staleItems as StaleItem[]) {
    const categoryKey = String(item.metadata?.category_key || "general");
    const key = `${item.source}:${categoryKey}`;
    const existing = grouped.get(key) || [];
    existing.push(item);
    grouped.set(key, existing);
  }

  const categoryRows = Array.from(grouped.entries()).map(([key, items]) => {
    const [sourceType, categoryKey] = key.split(":");
    const confidence =
      items.reduce((sum, item) => sum + (item.confidence || 0.5), 0) / items.length;
    return {
      clone_id: cloneId,
      type: "category" as const,
      source: sourceType,
      content: summarizeLines(items.map((i) => i.content), 4),
      confidence,
      metadata: {
        category_type: sourceType === "slack" ? "topic" : sourceType === "github" ? "project" : "timeline",
        category_key: categoryKey,
        item_count: items.length,
        time_window_start: items[0]?.occurred_at,
        time_window_end: items[items.length - 1]?.occurred_at,
        is_monthly_snapshot: false,
        compaction: "weekly",
      },
      occurred_at: items[items.length - 1]?.occurred_at,
    };
  });

  const { error: categoryInsertError } = await supabase
    .from("memories")
    .insert(categoryRows);
  if (categoryInsertError) {
    throw new Error(categoryInsertError.message);
  }

  // Mark stale items as weekly_summarized via metadata
  const staleIds = (staleItems as StaleItem[]).map((item) => item.id);
  const { data: updatedRows, error: itemUpdateError } = await supabase
    .from("memories")
    .update({ metadata: { compaction_state: "weekly_summarized" } })
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

  // Find old category memories that aren't monthly snapshots yet
  const { data: categories, error: categoriesError } = await supabase
    .from("memories")
    .select("content, confidence, source, metadata, occurred_at")
    .eq("clone_id", cloneId)
    .eq("type", "category")
    .neq("metadata->>is_monthly_snapshot", "true")
    .lt("occurred_at", monthlyCutoff)
    .limit(300);

  if (categoriesError || !categories || categories.length === 0) {
    return { categoriesCreated: 0, itemsUpdated: 0, snapshotsCreated: 0 };
  }

  type CategoryRow = {
    content: string;
    confidence: number;
    source: string;
    metadata: Record<string, unknown>;
    occurred_at: string;
  };

  const snapshotRows = (categories as CategoryRow[]).map((category) => ({
    clone_id: cloneId,
    type: "category" as const,
    source: category.source,
    content: `Monthly rewind: ${category.content}`,
    confidence: category.confidence,
    metadata: {
      ...(category.metadata || {}),
      is_monthly_snapshot: true,
      compaction: "monthly_rewind",
    },
    occurred_at: category.occurred_at,
  }));

  const { error: snapshotInsertError } = await supabase
    .from("memories")
    .insert(snapshotRows);
  if (snapshotInsertError) {
    throw new Error(snapshotInsertError.message);
  }

  // Mark old fact items as monthly_rewound
  const { data: rewoundItems, error: itemsError } = await supabase
    .from("memories")
    .update({ metadata: { compaction_state: "monthly_rewound" } })
    .eq("clone_id", cloneId)
    .eq("type", "fact")
    .neq("metadata->>compaction_state", "monthly_rewound")
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
