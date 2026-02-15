import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/core/supabase/server";
import { attachEmbeddingsToMemoryRows } from "@/lib/memory/embeddings";

type BackfillRequest = {
  cloneId?: string;
  limit?: number;
};

export async function POST(request: NextRequest) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "OPENAI_API_KEY is required for embedding backfill." },
        { status: 400 }
      );
    }

    const body = (await request.json().catch(() => ({}))) as BackfillRequest;
    const cloneId = body.cloneId?.trim();
    const limit = Math.min(Math.max(body.limit ?? 200, 1), 1000);

    const supabase = createServerSupabaseClient();
    let query = supabase
      .from("memories")
      .select("id, clone_id, content")
      .in("type", ["document", "chunk", "fact"])
      .is("embedding", null)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (cloneId) {
      query = query.eq("clone_id", cloneId);
    }

    const { data: rows, error: selectError } = await query;
    if (selectError) {
      throw new Error(selectError.message);
    }

    const candidates =
      rows?.map((row: { id: string; clone_id: string; content: string }) => ({
        id: row.id,
        clone_id: row.clone_id,
        content: row.content,
      })) || [];

    if (candidates.length === 0) {
      return NextResponse.json({
        success: true,
        scanned: 0,
        updated: 0,
        skipped: 0,
        clone_id: cloneId || null,
      });
    }

    const rowsWithEmbeddings = await attachEmbeddingsToMemoryRows(candidates);

    let updated = 0;
    const errors: string[] = [];

    for (const row of rowsWithEmbeddings) {
      if (!row.embedding) continue;
      const { error: updateError } = await supabase
        .from("memories")
        .update({ embedding: row.embedding })
        .eq("id", row.id);

      if (updateError) {
        errors.push(`${row.id}: ${updateError.message}`);
        continue;
      }
      updated += 1;
    }

    return NextResponse.json({
      success: errors.length === 0,
      clone_id: cloneId || null,
      scanned: candidates.length,
      updated,
      skipped: candidates.length - updated,
      errors: errors.slice(0, 20),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to backfill embeddings.",
      },
      { status: 500 }
    );
  }
}
