import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/core/supabase/server";
import { getKnowledgeContext } from "@backend/memory";
import { getMemoryProvider } from "@backend/memory/flags";

export async function POST(request: NextRequest) {
  try {
    const memoryProvider = getMemoryProvider();
    const {
      cloneId,
      seed = "smoke-seed",
      volume = "small",
    } = (await request.json()) as {
      cloneId?: string;
      seed?: string;
      volume?: "small" | "medium" | "large";
    };

    if (!cloneId) {
      return NextResponse.json(
        { error: "cloneId is required." },
        { status: 400 }
      );
    }

    const ingestResponse = await fetch(
      `${request.nextUrl.origin}/api/ingest/synthetic`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cloneId,
          seed,
          volume,
          sources: ["slack", "notion", "github"],
        }),
      }
    );

    const ingestResult = await ingestResponse.json();
    if (!ingestResponse.ok) {
      return NextResponse.json(
        {
          success: false,
          step: "ingest",
          ingestResult,
        },
        { status: 500 }
      );
    }

    const supabase = createServerSupabaseClient();
    const [{ count: documentCount }, { count: factCount }] = await Promise.all([
      supabase
        .from("memories")
        .select("*", { count: "exact", head: true })
        .eq("clone_id", cloneId)
        .eq("type", "document"),
      supabase
        .from("memories")
        .select("*", { count: "exact", head: true })
        .eq("clone_id", cloneId)
        .eq("type", "fact"),
    ]);

    const query = "What changed recently for Atlas Security Rollout?";
    const context = await getKnowledgeContext(cloneId, query, 8);
    const sourceSet = new Set(context?.resources.map((r) => r.source_type) || []);
    const hasCrossSourceCoverage =
      sourceSet.has("slack") &&
      sourceSet.has("notion") &&
      sourceSet.has("github");

    return NextResponse.json({
      success: true,
      memory_provider: memoryProvider,
      ingest: ingestResult,
      verify: {
        document_count: documentCount || 0,
        fact_count: factCount || 0,
        query,
        context_item_count: context?.items.length || 0,
        context_category_count: context?.categories.length || 0,
        context_chunk_count: context?.chunks.length || 0,
        sources: Array.from(sourceSet),
        has_cross_source_coverage: hasCrossSourceCoverage,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Synthetic smoke test failed.",
      },
      { status: 500 }
    );
  }
}
