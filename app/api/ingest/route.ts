import { NextRequest, NextResponse } from "next/server";
import { chunkText } from "@/lib/chunker";

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

    const document = {
      id: `doc_${Date.now()}`,
      clone_id: cloneId,
      title: file.name,
      content,
      doc_type: docType,
      created_at: new Date().toISOString(),
      chunk_count: chunks.length,
    };

    return NextResponse.json({
      success: true,
      document,
      chunks_created: chunks.length,
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
