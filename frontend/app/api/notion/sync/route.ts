import { NextRequest, NextResponse } from "next/server";
import { syncNotionContextToSupabase } from "@/lib/integrations/notion";
import { getActiveCloneId } from "@/lib/integrations/credentials";

interface SyncRequestBody {
  cloneId?: string;
  query?: string;
  pageLimit?: number;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as SyncRequestBody;

    const cloneId =
      !body.cloneId || body.cloneId === "auto"
        ? await getActiveCloneId()
        : body.cloneId.trim();

    const result = await syncNotionContextToSupabase({
      cloneId,
      query: body.query?.trim() || undefined,
      pageLimit: body.pageLimit,
    });

    return NextResponse.json({
      success: true,
      message:
        "Notion context synced and saved into Supabase documents/chunks for RAG.",
      result,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown Notion sync error";
    console.error("Notion sync error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
