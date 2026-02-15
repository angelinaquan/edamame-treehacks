import { NextRequest, NextResponse } from "next/server";
import { transcribeAudio } from "@/lib/agents/openai";
import { getActiveCloneId } from "@/lib/integrations/credentials";
import { saveMeetingTranscriptToSupabase } from "@/lib/memory/meeting";

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const audioFile = formData.get("audio") as File | null;
    const title = (formData.get("title") as string | null)?.trim() || undefined;
    const cloneIdRaw = (formData.get("cloneId") as string | null)?.trim();
    const contextScopeRaw = (formData.get("contextScope") as string | null)?.trim();
    const contextScope = contextScopeRaw === "clone" ? "clone" : "company";

    if (!audioFile) {
      return NextResponse.json(
        { error: "No audio file provided" },
        { status: 400 }
      );
    }

    console.log(`[meeting-transcribe] audio size=${audioFile.size} type=${audioFile.type} name=${audioFile.name}`);

    const cloneId =
      !cloneIdRaw || cloneIdRaw === "auto" || !isUuid(cloneIdRaw)
        ? await getActiveCloneId()
        : cloneIdRaw;

    const transcript = await transcribeAudio(audioFile);
    const result = await saveMeetingTranscriptToSupabase({
      cloneId,
      transcript,
      title,
      contextScope,
    });

    return NextResponse.json({
      success: true,
      transcript,
      result,
      message: "Meeting transcript saved to Supabase context.",
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown meeting ingest error";
    console.error("Meeting transcribe+save error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
