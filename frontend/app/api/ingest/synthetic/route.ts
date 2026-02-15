import { NextRequest, NextResponse } from "next/server";
import { chunkText } from "@/lib/core/chunker";
import { extractFacts } from "@backend/memory";
import { generateSyntheticResources } from "@backend/memory/synthetic";
import { validateSyntheticResources } from "@backend/memory/synthetic/validate";
import { getMemoryProvider, isSupabaseConfigured } from "@backend/memory/flags";
import { syncResourcesToMem0 } from "@backend/memory/mem0";
import { createServerSupabaseClient } from "@/lib/core/supabase/server";
import { generateEmbeddings } from "@/lib/agents/openai";
import type {
  MemoryResourceInput,
  SyntheticGenerationOptions,
} from "@/lib/core/types";

type SyntheticIngestRequest = SyntheticGenerationOptions & {
  dryRun?: boolean;
  triggerType?: "manual" | "scheduled";
};

const SOURCE_TO_DOC_TYPE: Record<string, string> = {
  slack: "slack_message",
  notion: "notion_page",
  github: "github_commit",
};

function toCategoryType(sourceType: string): string {
  if (sourceType === "slack") return "topic";
  if (sourceType === "github") return "project";
  return "timeline";
}

function inferCategoryKey(resource: MemoryResourceInput): string {
  const metadata = resource.source_metadata as Record<string, unknown>;
  if (resource.source_type === "slack") {
    return String(metadata.channel_name || metadata.channel_id || "slack");
  }
  if (resource.source_type === "notion") {
    const path = metadata.path;
    if (Array.isArray(path) && path.length > 0) {
      return String(path[path.length - 1]);
    }
    return String(metadata.page_id || "notion");
  }
  if (resource.source_type === "github") {
    return String(metadata.repo || "github");
  }
  return resource.source_type;
}

function calcConfidence(fact: string): number {
  let score = 0.65;
  if (/deadline|by|due|target/i.test(fact)) score += 0.1;
  if (/decided|confirmed|important|critical/i.test(fact)) score += 0.1;
  if (/\d+%|\$|\d{4}-\d{2}-\d{2}/.test(fact)) score += 0.05;
  return Math.min(score, 0.95);
}

function summarizeFacts(facts: string[]): string {
  return facts.slice(0, 3).join(" ").trim();
}

export async function POST(request: NextRequest) {
  try {
    const payload = (await request.json()) as SyntheticIngestRequest;
    const memoryProvider = getMemoryProvider();
    const cloneId = payload.cloneId;
    if (!cloneId) {
      return NextResponse.json(
        { error: "cloneId is required for synthetic ingestion." },
        { status: 400 }
      );
    }

    const generated = generateSyntheticResources({
      cloneId,
      seed: payload.seed,
      dateRange: payload.dateRange,
      volume: payload.volume,
      sources: payload.sources,
    });
    const validation = validateSyntheticResources(generated.resources);
    if (!validation.valid) {
      return NextResponse.json(
        { error: "Synthetic data validation failed.", issues: validation.errors },
        { status: 400 }
      );
    }

    if (payload.dryRun) {
      return NextResponse.json({
        success: true,
        dry_run: true,
        memory_provider: memoryProvider,
        seed: generated.seed,
        range: {
          start: generated.startIso,
          end: generated.endIso,
        },
        counts: generated.counts,
        preview: generated.resources.slice(0, 3),
      });
    }

    // Mem0 sync path
    let mem0Sync: Awaited<ReturnType<typeof syncResourcesToMem0>> | null = null;
    if (memoryProvider === "mem0") {
      mem0Sync = await syncResourcesToMem0(cloneId, generated.resources);
      if (mem0Sync.synced === 0) {
        throw new Error(
          `Mem0 sync failed for all resources: ${mem0Sync.errors.join(" | ")}`
        );
      }
    }

    if (!isSupabaseConfigured()) {
      if (memoryProvider === "mem0") {
        return NextResponse.json({
          success: true,
          memory_provider: memoryProvider,
          supabase_projection_skipped: true,
          seed: generated.seed,
          counts: {
            generated_resources: generated.resources.length,
          },
          by_source: generated.counts,
          mem0_sync: mem0Sync,
          message:
            "Mem0 sync succeeded. Supabase projection skipped because Supabase is not configured.",
        });
      }

      return NextResponse.json(
        {
          error:
            "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.",
        },
        { status: 500 }
      );
    }

    const supabase = createServerSupabaseClient();

    // Verify clone exists
    const { data: clone, error: cloneError } = await supabase
      .from("clones")
      .select("id")
      .eq("id", cloneId)
      .maybeSingle();

    if (cloneError || !clone) {
      return NextResponse.json(
        {
          error:
            "Clone not found in Supabase. Provide a valid clones.id UUID before ingest.",
        },
        { status: 400 }
      );
    }

    // Build all memory rows from generated resources
    const allMemoryRows: Array<{
      clone_id: string;
      type: string;
      source: string;
      content: string;
      confidence: number;
      metadata: Record<string, unknown>;
      occurred_at: string;
    }> = [];

    for (const resource of generated.resources) {
      const docType = SOURCE_TO_DOC_TYPE[resource.source_type] ?? "document";
      const sourceMetadata = (resource.source_metadata || {}) as Record<string, unknown>;

      // 1. Insert as document
      allMemoryRows.push({
        clone_id: cloneId,
        type: "document",
        source: resource.source_type,
        content: resource.content,
        confidence: 0.9,
        metadata: {
          title: resource.title || `${resource.source_type} ${resource.external_id}`,
          doc_type: docType,
          external_id: resource.external_id,
          author: resource.author,
          modality: resource.modality,
          ...sourceMetadata,
        },
        occurred_at: resource.occurred_at,
      });

      // 2. Insert chunks
      const chunks = chunkText(resource.content, {
        chunkSize: 500,
        overlap: 50,
      });
      for (const chunk of chunks) {
        allMemoryRows.push({
          clone_id: cloneId,
          type: "chunk",
          source: resource.source_type,
          content: chunk.content,
          confidence: 0.8,
          metadata: {
            ...chunk.metadata,
            title: resource.title,
            external_id: resource.external_id,
          },
          occurred_at: resource.occurred_at,
        });
      }

      // 3. Extract and insert facts
      const facts = extractFacts(resource.content);
      const candidateFacts = facts.length > 0 ? facts : [resource.content.slice(0, 220)];
      for (const fact of candidateFacts) {
        allMemoryRows.push({
          clone_id: cloneId,
          type: "fact",
          source: resource.source_type,
          content: fact,
          confidence: calcConfidence(fact),
          metadata: {
            category_key: inferCategoryKey(resource),
            title: resource.title,
            external_id: resource.external_id,
            compaction_state: "active",
          },
          occurred_at: resource.occurred_at,
        });
      }
    }

    // 4. Build category summaries
    const factRows = allMemoryRows.filter((r) => r.type === "fact");
    const groupedByCategory = new Map<string, typeof factRows>();
    for (const item of factRows) {
      const categoryKey = String(item.metadata?.category_key || "general");
      const key = `${toCategoryType(item.source)}::${categoryKey}`;
      const group = groupedByCategory.get(key) || [];
      group.push(item);
      groupedByCategory.set(key, group);
    }

    groupedByCategory.forEach((items, key) => {
      const [categoryType, categoryKey] = key.split("::");
      const confidence =
        items.reduce((sum, item) => sum + item.confidence, 0) / items.length;
      const sorted = [...items].sort((a, b) =>
        a.occurred_at > b.occurred_at ? 1 : a.occurred_at < b.occurred_at ? -1 : 0
      );
      allMemoryRows.push({
        clone_id: cloneId,
        type: "category",
        source: items[0]?.source || "manual",
        content: summarizeFacts(items.map((item) => item.content)),
        confidence,
        metadata: {
          category_type: categoryType,
          category_key: categoryKey,
          item_count: items.length,
          time_window_start: sorted[0]?.occurred_at,
          time_window_end: sorted[sorted.length - 1]?.occurred_at,
          is_monthly_snapshot: false,
        },
        occurred_at: sorted[sorted.length - 1]?.occurred_at || new Date().toISOString(),
      });
    });

    // Generate embeddings for chunks and facts (skip documents — too long)
    const embeddableRows = allMemoryRows.filter(
      (r) => r.type === "chunk" || r.type === "fact"
    );
    const embeddableTexts = embeddableRows.map((r) => r.content);
    let embeddingsGenerated = 0;

    try {
      if (embeddableTexts.length > 0) {
        const embeddings = await generateEmbeddings(embeddableTexts);
        // Build a map from content index to embedding
        let embIdx = 0;
        for (const row of allMemoryRows) {
          if ((row.type === "chunk" || row.type === "fact") && embIdx < embeddings.length) {
            (row as Record<string, unknown>).embedding = JSON.stringify(embeddings[embIdx]);
            embIdx++;
            embeddingsGenerated++;
          }
        }
      }
    } catch (embeddingError) {
      console.warn(
        "[ingest] Embedding generation failed, inserting without embeddings:",
        embeddingError instanceof Error ? embeddingError.message : embeddingError
      );
    }

    // Batch insert all memories
    const { error: insertError } = await supabase
      .from("memories")
      .insert(allMemoryRows);

    if (insertError) {
      throw new Error(insertError.message);
    }

    const documentCount = allMemoryRows.filter((r) => r.type === "document").length;
    const chunkCount = allMemoryRows.filter((r) => r.type === "chunk").length;
    const factCount = allMemoryRows.filter((r) => r.type === "fact").length;
    const categoryCount = allMemoryRows.filter((r) => r.type === "category").length;

    return NextResponse.json({
      success: true,
      memory_provider: memoryProvider,
      seed: generated.seed,
      counts: {
        total_memories: allMemoryRows.length,
        documents: documentCount,
        chunks: chunkCount,
        facts: factCount,
        categories: categoryCount,
        embeddings_generated: embeddingsGenerated,
      },
      by_source: generated.counts,
      mem0_sync: mem0Sync,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Synthetic ingest failed.",
      },
      { status: 500 }
    );
  }
}
