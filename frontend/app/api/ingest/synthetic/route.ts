import { NextRequest, NextResponse } from "next/server";
import { chunkText } from "@/lib/core/chunker";
import { extractFacts } from "@backend/memory";
import { generateSyntheticResources } from "@backend/memory/synthetic";
import { validateSyntheticResources } from "@backend/memory/synthetic/validate";
import { getMemoryProvider, isSupabaseConfigured } from "@backend/memory/flags";
import { syncResourcesToMem0 } from "@backend/memory/mem0";
import { createServerSupabaseClient } from "@/lib/core/supabase/server";
import type {
  DocType,
  MemoryCategoryInput,
  MemoryItemInput,
  MemoryResourceInput,
  SyntheticGenerationOptions,
} from "@/lib/core/types";

type SyntheticIngestRequest = SyntheticGenerationOptions & {
  dryRun?: boolean;
  triggerType?: "manual" | "scheduled";
};

type InsertedResource = MemoryResourceInput & {
  id: string;
};

const SOURCE_TO_DOC_TYPE: Record<string, DocType> = {
  slack: "slack_message",
  notion: "notion_page",
  github: "github_commit",
};

function toCategoryType(sourceType: string): MemoryCategoryInput["category_type"] {
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

function estimateItemAndCategoryCounts(resources: MemoryResourceInput[]): {
  itemsCount: number;
  categoriesCount: number;
} {
  let itemsCount = 0;
  const categoryKeys = new Set<string>();

  for (const resource of resources) {
    const facts = extractFacts(resource.content);
    itemsCount += facts.length > 0 ? facts.length : 1;
    categoryKeys.add(
      `${toCategoryType(resource.source_type)}::${inferCategoryKey(resource)}`
    );
  }

  return {
    itemsCount,
    categoriesCount: categoryKeys.size,
  };
}

export async function POST(request: NextRequest) {
  let runId: string | null = null;
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

    const { itemsCount, categoriesCount } = estimateItemAndCategoryCounts(
      generated.resources
    );

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
          run_id: null,
          memory_provider: memoryProvider,
          supabase_projection_skipped: true,
          seed: generated.seed,
          counts: {
            generated_resources: generated.resources.length,
            generated_items: itemsCount,
            generated_categories: categoriesCount,
            projected_documents: 0,
            projected_chunks: 0,
            projected_memories: 0,
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

    const { data: run, error: runError } = await supabase
      .from("memory_runs")
      .insert({
        clone_id: cloneId,
        trigger_type: payload.triggerType ?? "manual",
        seed: generated.seed,
        sources: Object.entries(generated.counts)
          .filter(([, value]) => value > 0)
          .map(([key]) => key),
        status: "running",
      })
      .select("id")
      .single();

    if (runError || !run) {
      throw new Error(runError?.message || "Failed to create memory run.");
    }
    runId = run.id;

    const { data: insertedResourcesRaw, error: resourceError } = await supabase
      .from("memory_resources")
      .insert(
        generated.resources.map((resource) => ({
          ...resource,
          run_id: run.id,
        }))
      )
      .select(
        "id, clone_id, source_type, external_id, title, author, content, occurred_at, modality, media_url, transcript, source_metadata, raw_payload"
      );

    if (resourceError || !insertedResourcesRaw) {
      throw new Error(
        resourceError?.message || "Failed to insert synthetic resources."
      );
    }

    const insertedResources = insertedResourcesRaw as InsertedResource[];

    let projectedDocumentsCount = 0;
    let projectedChunksCount = 0;

    for (const resource of insertedResources) {
      const docType = SOURCE_TO_DOC_TYPE[resource.source_type] ?? "document";
      const { data: document, error: documentError } = await supabase
        .from("documents")
        .insert({
          clone_id: cloneId,
          title: resource.title || `${resource.source_type} ${resource.external_id}`,
          content: resource.content,
          doc_type: docType,
          created_at: resource.occurred_at,
        })
        .select("id")
        .single();

      if (documentError || !document) {
        throw new Error(
          documentError?.message || "Failed to project synthetic document."
        );
      }
      projectedDocumentsCount += 1;

      const chunkRows = chunkText(resource.content, {
        chunkSize: 500,
        overlap: 50,
      }).map((chunk) => ({
        document_id: document.id,
        clone_id: cloneId,
        content: chunk.content,
        metadata: {
          ...chunk.metadata,
          source_type: resource.source_type,
          resource_id: resource.id,
          external_id: resource.external_id,
          title: resource.title,
        },
        created_at: resource.occurred_at,
      }));

      if (chunkRows.length > 0) {
        const { error: chunksError } = await supabase.from("chunks").insert(chunkRows);
        if (chunksError) {
          throw new Error(chunksError.message);
        }
        projectedChunksCount += chunkRows.length;
      }
    }

    const itemRows: MemoryItemInput[] = [];
    for (const resource of insertedResources) {
      const facts = extractFacts(resource.content);
      const candidateFacts = facts.length > 0 ? facts : [resource.content.slice(0, 220)];
      for (const fact of candidateFacts) {
        itemRows.push({
          clone_id: cloneId,
          resource_id: resource.id,
          source_type: resource.source_type,
          fact,
          normalized_fact: fact.toLowerCase(),
          category_key: inferCategoryKey(resource),
          importance: fact.length > 120 ? 0.8 : 0.65,
          confidence: calcConfidence(fact),
          occurred_at: resource.occurred_at,
          metadata: {
            title: resource.title,
            external_id: resource.external_id,
          },
          compaction_state: "active",
        });
      }
    }

    const { data: insertedItemsRaw, error: itemsError } = await supabase
      .from("memory_items")
      .insert(itemRows)
      .select(
        "id, clone_id, resource_id, source_type, fact, normalized_fact, category_key, importance, confidence, occurred_at, metadata, compaction_state, created_at"
      );

    if (itemsError || !insertedItemsRaw) {
      throw new Error(itemsError?.message || "Failed to insert memory items.");
    }

    const insertedItems = insertedItemsRaw as Array<
      MemoryItemInput & { id: string; created_at: string }
    >;

    const groupedByCategory = new Map<string, typeof insertedItems>();
    for (const item of insertedItems) {
      const key = `${toCategoryType(item.source_type)}::${item.category_key || "general"}`;
      const group = groupedByCategory.get(key) || [];
      group.push(item);
      groupedByCategory.set(key, group);
    }

    const categoryRows: MemoryCategoryInput[] = [];
    groupedByCategory.forEach((items, key) => {
      const [categoryType, categoryKey] = key.split("::");
      const confidence =
        items.reduce((sum, item) => sum + item.confidence, 0) / items.length;
      const sorted = [...items].sort((a, b) =>
        a.occurred_at > b.occurred_at ? 1 : a.occurred_at < b.occurred_at ? -1 : 0
      );
      categoryRows.push({
        clone_id: cloneId,
        category_type: categoryType as MemoryCategoryInput["category_type"],
        category_key: categoryKey,
        summary: summarizeFacts(items.map((item) => item.fact)),
        item_count: items.length,
        confidence,
        time_window_start: sorted[0]?.occurred_at,
        time_window_end: sorted[sorted.length - 1]?.occurred_at,
        last_item_at: sorted[sorted.length - 1]?.occurred_at,
        is_monthly_snapshot: false,
        metadata: {
          source_types: Array.from(new Set(items.map((item) => item.source_type))),
        },
      });
    });

    const { error: categoriesError } = await supabase
      .from("memory_categories")
      .insert(categoryRows);
    if (categoriesError) {
      throw new Error(categoriesError.message);
    }

    const memoriesToInsert = insertedItems
      .filter((item) => item.confidence >= 0.72)
      .map((item) => ({
        clone_id: cloneId,
        fact: item.fact,
        confidence: item.confidence,
        created_at: item.occurred_at,
      }));

    if (memoriesToInsert.length > 0) {
      const { error: memoriesError } = await supabase
        .from("memories")
        .insert(memoriesToInsert);
      if (memoriesError) {
        throw new Error(memoriesError.message);
      }
    }

    const { error: updateRunError } = await supabase
      .from("memory_runs")
      .update({
        status: "completed",
        resources_count: insertedResources.length,
        items_count: insertedItems.length,
        categories_count: categoryRows.length,
        projected_documents_count: projectedDocumentsCount,
        projected_chunks_count: projectedChunksCount,
        projected_memories_count: memoriesToInsert.length,
        updated_at: new Date().toISOString(),
      })
      .eq("id", run.id);

    if (updateRunError) {
      throw new Error(updateRunError.message);
    }

    return NextResponse.json({
      success: true,
      run_id: run.id,
      memory_provider: memoryProvider,
      seed: generated.seed,
      counts: {
        generated_resources: insertedResources.length,
        generated_items: itemsCount,
        generated_categories: categoriesCount,
        projected_documents: projectedDocumentsCount,
        projected_chunks: projectedChunksCount,
        projected_memories: memoriesToInsert.length,
      },
      by_source: generated.counts,
      mem0_sync: mem0Sync,
    });
  } catch (error) {
    if (runId) {
      const supabase = createServerSupabaseClient();
      await supabase
        .from("memory_runs")
        .update({
          status: "failed",
          error: error instanceof Error ? error.message : "Unknown failure",
          updated_at: new Date().toISOString(),
        })
        .eq("id", runId);
    }

    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Synthetic ingest failed.",
      },
      { status: 500 }
    );
  }
}
