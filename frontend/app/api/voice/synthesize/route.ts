import { NextRequest, NextResponse } from "next/server";
import { synthesizeSpeech } from "@/lib/agents/openai";

export async function POST(request: NextRequest) {
  try {
    const { text } = await request.json();

    if (!text) {
      return NextResponse.json(
        { error: "No text provided" },
        { status: 400 }
      );
    }

    const audioBuffer = await synthesizeSpeech(text);
    const uint8 = new Uint8Array(audioBuffer);

    return new Response(uint8, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Length": uint8.length.toString(),
      },
    });
  } catch (error) {
    console.error("Speech synthesis error:", error);
    return NextResponse.json(
      { error: "Failed to synthesize speech" },
      { status: 500 }
    );
  }
}
