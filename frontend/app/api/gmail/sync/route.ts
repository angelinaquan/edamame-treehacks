import { NextRequest, NextResponse } from "next/server";
import { syncGmailToSupabase } from "@/lib/google";
import { getActiveCloneId } from "@/lib/credentials";

interface SyncRequestBody {
  cloneId?: string;
  query?: string;
  maxResults?: number;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as SyncRequestBody;

    const cloneId =
      !body.cloneId || body.cloneId === "auto"
        ? await getActiveCloneId()
        : body.cloneId.trim();

    const result = await syncGmailToSupabase({
      cloneId,
      query: body.query?.trim() || undefined,
      maxResults: body.maxResults,
    });

    return NextResponse.json({
      success: true,
      message:
        "Gmail messages synced and saved into Supabase documents/chunks for RAG.",
      result,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown Gmail sync error";
    console.error("Gmail sync error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
