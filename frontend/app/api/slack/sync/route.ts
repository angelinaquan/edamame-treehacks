import { NextRequest, NextResponse } from "next/server";
import { syncSlackContextToSupabase } from "@/lib/integrations/slack";
import { getActiveCloneId } from "@/lib/integrations/credentials";

interface SyncRequestBody {
  cloneId?: string;
  channelLimit?: number;
  messagesPerChannel?: number;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as SyncRequestBody;

    const cloneId =
      !body.cloneId || body.cloneId === "auto"
        ? await getActiveCloneId()
        : body.cloneId.trim();

    const result = await syncSlackContextToSupabase({
      cloneId,
      channelLimit: body.channelLimit,
      messagesPerChannel: body.messagesPerChannel,
    });

    return NextResponse.json({
      success: true,
      message:
        "Slack messages synced and saved into Supabase documents/chunks for RAG.",
      result,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown Slack sync error";
    console.error("Slack sync error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
