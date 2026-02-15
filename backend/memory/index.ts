/**
 * Memory — organizational knowledge storage, retrieval, and compaction.
 * All knowledge lives in a single `memories` table with type/source discriminators.
 * Supports Supabase and Mem0 providers with fallback.
 *
 * Continual learning features:
 *  - Vector/semantic search via pgvector embeddings
 *  - Conversation-to-memory learning loop
 *  - Time-weighted relevance scoring
 *  - Contradiction detection and deduplication
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

export interface ConversationLearningResult {
  factsExtracted: number;
  factsSaved: number;
  factsReinforced: number;
}

export function isSupabaseMemoryEnabled(): boolean {
  return isSupabaseMemoryFlagEnabled();
}

function isSupabaseFallbackAvailable(): boolean {
  return readRuntimeEnv("USE_SUPABASE_MEMORY") === "true" && isSupabaseConfigured();
}

function isSupabaseAvailable(): boolean {
  return isSupabaseMemoryEnabled() || isSupabaseFallbackAvailable();
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

/**
 * Compute a recency bonus: memories from the last hour get +0.3,
 * decaying to 0 over 30 days using an exponential curve.
 */
function recencyBonus(occurredAt: string): number {
  const ageMs = Date.now() - new Date(occurredAt).getTime();
  const ageDays = ageMs / (1000 * 60 * 60 * 24);
  // Half-life of ~3 days, max bonus 0.3
  return 0.3 * Math.exp(-ageDays / 3);
}

/**
 * Compute a composite relevance score combining confidence and recency.
 * Used to re-rank results from both keyword and vector search.
 */
function computeRelevanceScore(
  confidence: number,
  occurredAt: string,
  similarity?: number
): number {
  const base = similarity != null ? similarity : confidence;
  return base + recencyBonus(occurredAt);
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

// ---------------------------------------------------------------------------
// Vector / semantic search helpers
// ---------------------------------------------------------------------------

interface VectorMatchRow {
  id: string;
  clone_id: string;
  type: string;
  source: string;
  content: string;
  confidence: number;
  metadata: Record<string, unknown>;
  occurred_at: string;
  created_at: string;
  similarity: number;
}

/**
 * Attempt semantic vector search via the `match_memories` Supabase RPC.
 * Returns null if the RPC is unavailable or no results are found.
 */
async function vectorSearch(
  supabase: ReturnType<typeof createServerSupabaseClient>,
  queryEmbedding: number[],
  cloneId: string,
  memoryType: string | null,
  threshold: number,
  limit: number
): Promise<VectorMatchRow[] | null> {
  try {
    const params: Record<string, unknown> = {
      query_embedding: JSON.stringify(queryEmbedding),
      match_threshold: threshold,
      match_count: limit,
      p_clone_id: cloneId,
    };
    if (memoryType) {
      params.p_type = memoryType;
    }
    const { data, error } = await supabase.rpc("match_memories", params);
    if (error) {
      // RPC might not be deployed yet — fall back silently
      console.warn("[memory] match_memories RPC failed, falling back to keyword search:", error.message);
      return null;
    }
    return (data as VectorMatchRow[]) || null;
  } catch {
    return null;
  }
}

/**
 * Try to generate a query embedding. Returns null on failure (no API key, etc.)
 * Uses a lazy import to avoid circular dependency issues.
 */
async function tryGenerateQueryEmbedding(query: string): Promise<number[] | null> {
  if (!query || query.trim().length < 3) return null;
  try {
    const { generateEmbedding } = await import("@/lib/agents/openai");
    return await generateEmbedding(query);
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// getKnowledgeContext — main retrieval (vector search with keyword fallback)
// ---------------------------------------------------------------------------

export async function getKnowledgeContext(
  cloneId: string,
  query: string,
  topK: number = 5
): Promise<KnowledgeContext | null> {
  // 1. Try Mem0 first if configured
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

  if (!isSupabaseAvailable()) return null;

  const supabase = createServerSupabaseClient();

  // 2. Try vector search first
  const queryEmbedding = await tryGenerateQueryEmbedding(query);
  let vectorItems: VectorMatchRow[] | null = null;
  let vectorChunks: VectorMatchRow[] | null = null;

  if (queryEmbedding) {
    [vectorItems, vectorChunks] = await Promise.all([
      vectorSearch(supabase, queryEmbedding, cloneId, "fact", 0.4, topK * 3),
      vectorSearch(supabase, queryEmbedding, cloneId, "chunk", 0.4, topK * 3),
    ]);
  }

  const hasVectorResults =
    (vectorItems && vectorItems.length > 0) ||
    (vectorChunks && vectorChunks.length > 0);

  // 3. Keyword fallback (or supplement) for items and chunks
  const terms = query
    .toLowerCase()
    .split(/\s+/)
    .filter((t) => t.length >= 3)
    .slice(0, 6);

  // Always fetch categories and resources via keyword (they don't need vector search)
  const categoryQuery = supabase
    .from("memories")
    .select("content, confidence, metadata, occurred_at")
    .eq("clone_id", cloneId)
    .eq("type", "category")
    .order("occurred_at", { ascending: false })
    .limit(4);

  const resourceQuery = supabase
    .from("memories")
    .select("source, content, metadata, occurred_at")
    .eq("clone_id", cloneId)
    .in("type", ["document", "snapshot"])
    .order("occurred_at", { ascending: false })
    .limit(6);

  // If vector search didn't work, fetch items/chunks via keyword
  let keywordItemsPromise: ReturnType<typeof supabase.from> | null = null;
  let keywordChunksPromise: ReturnType<typeof supabase.from> | null = null;

  if (!hasVectorResults) {
    let itemQuery = supabase
      .from("memories")
      .select("content, confidence, source, occurred_at, metadata")
      .eq("clone_id", cloneId)
      .eq("type", "fact")
      .order("confidence", { ascending: false })
      .limit(topK * 2);

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
    keywordItemsPromise = itemQuery;
    keywordChunksPromise = chunkQuery;
  }

  // Execute all queries in parallel
  const promises: Promise<{ data: unknown }>[] = [categoryQuery, resourceQuery];
  if (keywordItemsPromise) promises.push(keywordItemsPromise);
  if (keywordChunksPromise) promises.push(keywordChunksPromise);

  const results = await Promise.all(promises);
  const categories = results[0].data as Array<{
    content: string;
    confidence: number | null;
    metadata: Record<string, unknown>;
    occurred_at: string;
  }> | null;
  const resources = results[1].data as Array<{
    source: string;
    content: string;
    metadata: Record<string, unknown>;
    occurred_at: string;
  }> | null;
  const keywordItems = keywordItemsPromise
    ? (results[2].data as Array<{
        content: string;
        confidence: number | null;
        source: string;
        occurred_at: string;
        metadata: Record<string, unknown>;
      }> | null)
    : null;
  const keywordChunks = keywordChunksPromise
    ? (results[promises.length - 1].data as Chunk[] | null)
    : null;

  // 4. Build items from vector search OR keyword fallback, re-ranked by relevance
  let finalItems: KnowledgeContext["items"];
  if (vectorItems && vectorItems.length > 0) {
    finalItems = vectorItems
      .map((row) => ({
        fact: row.content,
        confidence: row.confidence ?? 0.5,
        source_type: row.source,
        occurred_at: row.occurred_at,
        category_key: (row.metadata?.category_key as string) || undefined,
        _score: computeRelevanceScore(row.confidence, row.occurred_at, row.similarity),
      }))
      .sort((a, b) => b._score - a._score)
      .slice(0, topK * 2)
      .map(({ _score: _, ...rest }) => rest);
  } else {
    finalItems =
      keywordItems?.map((row) => ({
        fact: row.content,
        confidence: row.confidence ?? 0.5,
        source_type: row.source,
        occurred_at: row.occurred_at,
        category_key: row.metadata?.category_key as string | undefined,
      })) || [];
  }

  // 5. Build chunks from vector search OR keyword fallback
  let finalChunks: Chunk[];
  if (vectorChunks && vectorChunks.length > 0) {
    finalChunks = vectorChunks
      .map((row) => ({
        id: row.id,
        clone_id: row.clone_id,
        content: row.content,
        metadata: row.metadata as Record<string, unknown>,
        created_at: row.created_at,
        _score: computeRelevanceScore(row.confidence, row.occurred_at, row.similarity),
      }))
      .sort((a, b) => b._score - a._score)
      .slice(0, topK * 3)
      .map(({ _score: _, ...rest }) => rest);
  } else {
    finalChunks = (keywordChunks as Chunk[]) || [];
  }

  return {
    categories:
      categories?.map((row) => ({
        category_key: String(row.metadata?.category_key || "general"),
        summary: row.content,
        confidence: row.confidence ?? 0.5,
      })) || [],
    items: finalItems,
    chunks: finalChunks,
    resources:
      resources?.map((row) => ({
        source_type: row.source,
        title: row.metadata?.title as string | undefined,
        author: row.metadata?.author as string | undefined,
        occurred_at: row.occurred_at,
        content: row.content,
      })) || [],
  };
}

// ---------------------------------------------------------------------------
// Conversation-to-memory learning
// ---------------------------------------------------------------------------

/**
 * Extract facts from a conversation message and persist them to Supabase.
 * Performs deduplication: if a semantically similar fact already exists
 * (vector similarity > 0.9), reinforce it instead of creating a duplicate.
 *
 * This function is fire-and-forget safe — all errors are caught and logged.
 */
export async function learnFromConversation(
  cloneId: string,
  userMessage: string,
  conversationId: string,
  source: string = "conversation"
): Promise<ConversationLearningResult> {
  const result: ConversationLearningResult = {
    factsExtracted: 0,
    factsSaved: 0,
    factsReinforced: 0,
  };

  if (!isSupabaseAvailable()) return result;

  const facts = extractFacts(userMessage);
  if (facts.length === 0) return result;
  result.factsExtracted = facts.length;

  const supabase = createServerSupabaseClient();

  // Try to generate embeddings for dedup; proceed without if unavailable
  let embeddings: number[][] = [];
  try {
    const { generateEmbeddings } = await import("@/lib/agents/openai");
    embeddings = await generateEmbeddings(facts);
  } catch {
    // Embedding generation unavailable — skip dedup, still save facts
  }

  for (let i = 0; i < facts.length; i++) {
    const fact = facts[i];
    const embedding = embeddings[i] || null;

    // Dedup: check for near-duplicate via vector similarity
    if (embedding) {
      const duplicates = await vectorSearch(
        supabase,
        embedding,
        cloneId,
        "fact",
        0.88, // high threshold = near-duplicate
        1
      );

      if (duplicates && duplicates.length > 0) {
        // Reinforce existing fact: bump confidence, update timestamp
        const existing = duplicates[0];
        const newConfidence = Math.min((existing.confidence || 0.5) + 0.05, 0.99);
        const existingMeta =
          existing.metadata && typeof existing.metadata === "object"
            ? existing.metadata
            : {};
        await supabase
          .from("memories")
          .update({
            confidence: newConfidence,
            metadata: {
              ...existingMeta,
              last_reinforced: new Date().toISOString(),
              reinforcement_count:
                ((existingMeta.reinforcement_count as number) || 0) + 1,
            },
          })
          .eq("id", existing.id);
        result.factsReinforced++;
        continue;
      }
    }

    // No duplicate found — insert as new fact
    const insertData: Record<string, unknown> = {
      clone_id: cloneId,
      type: "fact",
      source,
      content: fact,
      confidence: 0.75,
      metadata: {
        conversation_id: conversationId,
        compaction_state: "active",
      },
      occurred_at: new Date().toISOString(),
    };
    if (embedding) {
      insertData.embedding = JSON.stringify(embedding);
    }

    const { error } = await supabase.from("memories").insert(insertData);
    if (!error) {
      result.factsSaved++;
    } else {
      console.error("[memory] Failed to save fact:", error.message);
    }
  }

  return result;
}

export async function runWeeklySummarization(
  cloneId: string
): Promise<CompactionResult> {
  if (!isSupabaseAvailable()) {
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
  if (!isSupabaseAvailable()) {
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
