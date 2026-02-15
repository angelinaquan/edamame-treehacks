import { NextRequest, NextResponse } from "next/server";
import { chunkText } from "@/lib/core/chunker";
import { createServerSupabaseClient } from "@/lib/core/supabase/server";
import { attachEmbeddingsToMemoryRows } from "@/lib/memory/embeddings";
import { extractFacts } from "@backend/memory";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const cloneId = formData.get("cloneId") as string;
    const docType = (formData.get("docType") as string) || "document";

    if (!file || !cloneId) {
      return NextResponse.json(
        { error: "File and cloneId are required" },
        { status: 400 }
      );
    }

    const content = await file.text();
    const chunks = chunkText(content, { chunkSize: 500, overlap: 50 });
    const occurredAt = new Date().toISOString();

    const document = {
      id: `doc_${Date.now()}`,
      clone_id: cloneId,
      title: file.name,
      content,
      doc_type: docType,
      created_at: new Date().toISOString(),
      chunk_count: chunks.length,
    };

    const supabaseConfigured = Boolean(
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
        process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    let factsCreated = 0;
    if (supabaseConfigured) {
      const memoryRows: Array<{
        clone_id: string;
        type: string;
        source: string;
        content: string;
        embedding?: number[] | null;
        confidence: number;
        metadata: Record<string, unknown>;
        occurred_at: string;
      }> = [];

      memoryRows.push({
        clone_id: cloneId,
        type: "document",
        source: "manual",
        content,
        confidence: 0.9,
        metadata: {
          title: file.name,
          doc_type: docType,
          file_name: file.name,
        },
        occurred_at: occurredAt,
      });

      for (const chunk of chunks) {
        memoryRows.push({
          clone_id: cloneId,
          type: "chunk",
          source: "manual",
          content: chunk.content,
          confidence: 0.8,
          metadata: {
            ...chunk.metadata,
            source_type: "uploaded_document",
            document_title: file.name,
            doc_type: docType,
          },
          occurred_at: occurredAt,
        });
      }

      const facts = extractFacts(content).slice(0, 30);
      factsCreated = facts.length;
      for (const fact of facts) {
        memoryRows.push({
          clone_id: cloneId,
          type: "fact",
          source: "manual",
          content: fact,
          confidence: 0.85,
          metadata: {
            title: file.name,
            doc_type: docType,
            category_key: docType,
            compaction_state: "active",
          },
          occurred_at: occurredAt,
        });
      }

      const rowsWithEmbeddings = await attachEmbeddingsToMemoryRows(memoryRows);
      const supabase = createServerSupabaseClient();
      const { error } = await supabase.from("memories").insert(rowsWithEmbeddings);
      if (error) {
        throw new Error(`Failed to persist ingested memories: ${error.message}`);
      }
    }

    return NextResponse.json({
      success: true,
      document,
      chunks_created: chunks.length,
      facts_created: factsCreated,
      persisted: supabaseConfigured,
      message: `Document "${file.name}" processed into ${chunks.length} chunks.`,
    });
  } catch (error) {
    console.error("Ingest error:", error);
    return NextResponse.json(
      { error: "Failed to process document" },
      { status: 500 }
    );
  }
}
