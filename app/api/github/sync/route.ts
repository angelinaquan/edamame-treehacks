import { NextRequest, NextResponse } from "next/server";
import { syncGitHubContextToSupabase } from "@/lib/github";

interface SyncRequestBody {
  cloneId?: string;
  username?: string;
  repoLimit?: number;
  itemsPerRepo?: number;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as SyncRequestBody;
    const cloneId = body.cloneId?.trim();
    const username = body.username?.trim();

    if (!cloneId || !username) {
      return NextResponse.json(
        { error: "cloneId and username are required" },
        { status: 400 }
      );
    }

    const result = await syncGitHubContextToSupabase({
      cloneId,
      username,
      repoLimit: body.repoLimit,
      itemsPerRepo: body.itemsPerRepo,
    });

    return NextResponse.json({
      success: true,
      message:
        "GitHub context synced and saved into Supabase documents/chunks for RAG.",
      result,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown GitHub sync error";
    console.error("GitHub sync error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
