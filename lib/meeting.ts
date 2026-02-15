import { chunkText } from "@/lib/chunker";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export interface SaveMeetingTranscriptResult {
  document_id: string;
  title: string;
  chunks_created: number;
}

export async function saveMeetingTranscriptToSupabase(opts: {
  cloneId: string;
  transcript: string;
  title?: string;
  contextScope?: "company" | "clone";
}): Promise<SaveMeetingTranscriptResult> {
  const transcript = opts.transcript.trim();
  if (!transcript) {
    throw new Error("Transcript is empty.");
  }

  const supabase = createServerSupabaseClient();
  const title =
    opts.title?.trim() || `Meeting Transcript ${new Date().toLocaleString()}`;
  const contextScope = opts.contextScope ?? "company";

  const documentInsert = await supabase
    .from("documents")
    .insert({
      clone_id: opts.cloneId,
      title,
      content: transcript,
      doc_type: "meeting_notes",
    })
    .select("id, title")
    .single();

  if (documentInsert.error || !documentInsert.data) {
    throw new Error(
      `Failed to save meeting transcript: ${documentInsert.error?.message ?? "unknown error"}`
    );
  }

  const documentId = documentInsert.data.id as string;
  const chunks = chunkText(transcript, { chunkSize: 700, overlap: 100 });

  if (chunks.length > 0) {
    const chunkRows = chunks.map((chunk) => ({
      document_id: documentId,
      clone_id: opts.cloneId,
      content: chunk.content,
      metadata: {
        ...chunk.metadata,
        source: "meeting_recorder",
        source_type: "meeting_transcript",
        context_scope: contextScope,
        document_title: title,
      },
    }));

    const chunkInsert = await supabase.from("chunks").insert(chunkRows);
    if (chunkInsert.error) {
      throw new Error(
        `Failed to save meeting chunks: ${chunkInsert.error.message}`
      );
    }
  }

  return {
    document_id: documentId,
    title,
    chunks_created: chunks.length,
  };
}
