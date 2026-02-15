import { NextRequest, NextResponse } from "next/server";
import { syncGoogleDriveContextToSupabase } from "@/lib/integrations/google";
import { getActiveCloneId } from "@/lib/integrations/credentials";

interface SyncRequestBody {
  cloneId?: string;
  query?: string;
  fileLimit?: number;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as SyncRequestBody;

    const cloneId =
      !body.cloneId || body.cloneId === "auto"
        ? await getActiveCloneId()
        : body.cloneId.trim();

    const result = await syncGoogleDriveContextToSupabase({
      cloneId,
      query: body.query?.trim() || undefined,
      fileLimit: body.fileLimit,
    });

    return NextResponse.json({
      success: true,
      message:
        "Google Drive context synced and saved into Supabase documents/chunks for RAG.",
      result,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unknown Google Drive sync error";
    console.error("Google Drive sync error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
