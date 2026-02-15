import { NextRequest, NextResponse } from "next/server";
import {
  isSupabaseMemoryEnabled,
  runMonthlyRewind,
  runWeeklySummarization,
} from "@/lib/memory";
import { getMemoryProvider } from "@/lib/flags";

type CompactionMode = "weekly" | "monthly" | "both";

export async function POST(request: NextRequest) {
  try {
    const provider = getMemoryProvider();
    if (!isSupabaseMemoryEnabled()) {
      if (provider === "mem0") {
        return NextResponse.json({
          success: true,
          provider,
          message:
            "Mem0 provider selected. Supabase compaction jobs are skipped because Mem0 manages memory internals.",
        });
      }
      return NextResponse.json(
        {
          error:
            "Supabase memory compaction is disabled. Set USE_SUPABASE_MEMORY=true.",
        },
        { status: 400 }
      );
    }

    const { cloneId, mode = "both" } = (await request.json()) as {
      cloneId?: string;
      mode?: CompactionMode;
    };

    if (!cloneId) {
      return NextResponse.json(
        { error: "cloneId is required." },
        { status: 400 }
      );
    }

    let weekly = null;
    let monthly = null;

    if (mode === "weekly" || mode === "both") {
      weekly = await runWeeklySummarization(cloneId);
    }
    if (mode === "monthly" || mode === "both") {
      monthly = await runMonthlyRewind(cloneId);
    }

    return NextResponse.json({
      success: true,
      provider,
      clone_id: cloneId,
      mode,
      weekly,
      monthly,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to compact memory.",
      },
      { status: 500 }
    );
  }
}
