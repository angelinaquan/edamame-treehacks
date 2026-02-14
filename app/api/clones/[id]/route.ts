import { NextRequest, NextResponse } from "next/server";
import {
  getCloneById,
  mockPeople,
  mockDocuments,
  mockMemories,
} from "@/lib/mock-data";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const clone = getCloneById(id);

  if (!clone) {
    return NextResponse.json({ error: "Clone not found" }, { status: 404 });
  }

  const owner = mockPeople.find((p) => p.id === clone.owner_id);
  const documents = mockDocuments.filter((d) => d.clone_id === clone.id);
  const memories = mockMemories.filter((m) => m.clone_id === clone.id);

  return NextResponse.json({
    clone: {
      ...clone,
      owner,
      documents,
      memories,
      stats: {
        document_count: documents.length,
        memory_count: memories.length,
        training_sources: documents.map((d) => d.doc_type),
      },
    },
  });
}
