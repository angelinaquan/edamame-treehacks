import { NextRequest, NextResponse } from "next/server";
import { transcribeAudio } from "@/lib/openai";
import { saveMeetingTranscriptToSupabase } from "@/lib/meeting";
import { getActiveCloneId } from "@/lib/credentials";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const audioFile = formData.get("audio") as File | null;
    const title = (formData.get("title") as string | null)?.trim() || undefined;
    const cloneIdRaw = (formData.get("cloneId") as string | null)?.trim();
    const contextScopeRaw = (formData.get("contextScope") as string | null)?.trim();
    const contextScope =
      contextScopeRaw === "clone" ? "clone" : "company";

    if (!audioFile) {
      return NextResponse.json(
        { error: "No audio file provided" },
        { status: 400 }
      );
    }

    const cloneId =
      !cloneIdRaw || cloneIdRaw === "auto"
        ? await getActiveCloneId()
        : cloneIdRaw;

    const buffer = Buffer.from(await audioFile.arrayBuffer());
    const transcript = await transcribeAudio(buffer);
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
