import { NextRequest, NextResponse } from "next/server";
import { transcribeAudio } from "@/lib/agents/openai";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const audioFile = formData.get("audio") as File | null;

    if (!audioFile) {
      return NextResponse.json(
        { error: "No audio file provided" },
        { status: 400 }
      );
    }

    console.log(`[transcribe] audio size=${audioFile.size} type=${audioFile.type} name=${audioFile.name}`);

    const text = await transcribeAudio(audioFile);
    return NextResponse.json({ text });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to transcribe audio";
    console.error("Voice transcription error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
