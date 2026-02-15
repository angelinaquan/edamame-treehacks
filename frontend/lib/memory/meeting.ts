import { createServerSupabaseClient } from "@/lib/core/supabase/server";

export interface SaveMeetingTranscriptResult {
  memory_id: string;
  title: string;
}

/**
 * Save a meeting transcript into the `memories` table.
 * This works with the actual Supabase schema (clones, memories, messages, integrations).
 */
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

  const { data, error } = await supabase
    .from("memories")
    .insert({
      clone_id: opts.cloneId,
      type: "fact",
      content: transcript,
      metadata: {
        title,
        source: "meeting_recorder",
        source_type: "meeting_transcript",
        context_scope: contextScope,
      },
    })
    .select("id")
    .single();

  if (error || !data) {
    throw new Error(
      `Failed to save meeting transcript: ${error?.message ?? "unknown error"}`
    );
  }

  return {
    memory_id: data.id as string,
    title,
  };
}
