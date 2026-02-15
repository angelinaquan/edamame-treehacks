import { NextRequest, NextResponse } from "next/server";
import { syncGitHubContextToSupabase } from "@/lib/integrations/github";
import { getActiveCloneId, getGitHubUsername } from "@/lib/integrations/credentials";

interface SyncRequestBody {
  cloneId?: string;
  username?: string;
  repoLimit?: number;
  itemsPerRepo?: number;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as SyncRequestBody;

    const cloneId =
      !body.cloneId || body.cloneId === "auto"
        ? await getActiveCloneId()
        : body.cloneId.trim();

    const username =
      body.username?.trim() || (await getGitHubUsername());

    if (!username) {
      return NextResponse.json(
        { error: "username is required (pass it or save it in Settings)" },
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
