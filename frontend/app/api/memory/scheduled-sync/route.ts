import { NextRequest, NextResponse } from "next/server";
import {
  isSupabaseMemoryEnabled,
  runMonthlyRewind,
  runWeeklySummarization,
} from "@backend/memory";
import { getMemoryProvider } from "@backend/memory/flags";
import { syncSlackContextToSupabase } from "@/lib/integrations/slack";
import { syncGitHubContextToSupabase } from "@/lib/integrations/github";
import { syncNotionContextToSupabase } from "@/lib/integrations/notion";
import {
  syncGoogleDriveContextToSupabase,
  syncGmailToSupabase,
} from "@/lib/integrations/google";
import { getActiveCloneId, getGitHubUsername } from "@/lib/integrations/credentials";

type SyncProvider = "slack" | "github" | "notion" | "google_drive" | "gmail";
type CompactionMode = "weekly" | "monthly" | "both";

type ScheduledSyncPayload = {
  cloneId?: string;
  providers?: SyncProvider[];
  runCompaction?: boolean;
  compactionMode?: CompactionMode;
  githubUsername?: string;
  channelLimit?: number;
  messagesPerChannel?: number;
  repoLimit?: number;
  itemsPerRepo?: number;
  pageLimit?: number;
  fileLimit?: number;
  gmailMaxResults?: number;
};

const DEFAULT_PROVIDERS: SyncProvider[] = [
  "slack",
  "github",
  "notion",
  "google_drive",
  "gmail",
];

function parseProviders(input?: string): SyncProvider[] {
  if (!input) return DEFAULT_PROVIDERS;
  const valid = new Set<SyncProvider>(DEFAULT_PROVIDERS);
  const parsed = input
    .split(",")
    .map((value) => value.trim())
    .filter((value): value is SyncProvider => valid.has(value as SyncProvider));
  return parsed.length > 0 ? parsed : DEFAULT_PROVIDERS;
}

function sanitizeProviders(input?: SyncProvider[]): SyncProvider[] {
  if (!Array.isArray(input) || input.length === 0) return DEFAULT_PROVIDERS;
  const valid = new Set<SyncProvider>(DEFAULT_PROVIDERS);
  const parsed = input.filter((value) => valid.has(value));
  return parsed.length > 0 ? parsed : DEFAULT_PROVIDERS;
}

function parseCompactionMode(input?: string | null): CompactionMode {
  if (input === "weekly" || input === "monthly" || input === "both") {
    return input;
  }
  return "weekly";
}

function parseBoolean(input: string | undefined, fallback: boolean): boolean {
  if (input === undefined) return fallback;
  return input === "true" || input === "1" || input === "yes";
}

function toNumber(
  input: string | undefined,
  fallback: number,
  min: number,
  max: number
): number {
  if (!input) return fallback;
  const parsed = Number(input);
  if (Number.isNaN(parsed)) return fallback;
  return Math.min(Math.max(parsed, min), max);
}

function isAuthorized(request: NextRequest): boolean {
  const secret = process.env.MEMORY_SYNC_SECRET;
  if (!secret) return true;
  const headerSecret =
    request.headers.get("x-memory-sync-secret") ||
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  const querySecret = request.nextUrl.searchParams.get("secret");
  return headerSecret === secret || querySecret === secret;
}

async function runScheduledSync(
  payload: ScheduledSyncPayload
): Promise<Record<string, unknown>> {
  const cloneId = payload.cloneId?.trim() || (await getActiveCloneId());
  const providerSet = new Set<SyncProvider>(
    sanitizeProviders(payload.providers)
  );
  const providerResults: Partial<
    Record<SyncProvider, { success: boolean; result?: unknown; error?: string }>
  > = {};

  const runProvider = async (
    provider: SyncProvider,
    action: () => Promise<unknown>
  ) => {
    try {
      const result = await action();
      providerResults[provider] = { success: true, result };
    } catch (error) {
      providerResults[provider] = {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : `Unknown ${provider} sync failure`,
      };
    }
  };

  if (providerSet.has("slack")) {
    await runProvider("slack", () =>
      syncSlackContextToSupabase({
        cloneId,
        channelLimit: payload.channelLimit,
        messagesPerChannel: payload.messagesPerChannel,
      })
    );
  }

  if (providerSet.has("github")) {
    await runProvider("github", async () => {
      const username =
        payload.githubUsername?.trim() || (await getGitHubUsername());
      if (!username) {
        throw new Error(
          "GitHub username is required for scheduled sync (set in Settings or pass githubUsername)."
        );
      }
      return syncGitHubContextToSupabase({
        cloneId,
        username,
        repoLimit: payload.repoLimit,
        itemsPerRepo: payload.itemsPerRepo,
      });
    });
  }

  if (providerSet.has("notion")) {
    await runProvider("notion", () =>
      syncNotionContextToSupabase({
        cloneId,
        pageLimit: payload.pageLimit,
      })
    );
  }

  if (providerSet.has("google_drive")) {
    await runProvider("google_drive", () =>
      syncGoogleDriveContextToSupabase({
        cloneId,
        fileLimit: payload.fileLimit,
      })
    );
  }

  if (providerSet.has("gmail")) {
    await runProvider("gmail", () =>
      syncGmailToSupabase({
        cloneId,
        maxResults: payload.gmailMaxResults,
      })
    );
  }

  const shouldRunCompaction = payload.runCompaction ?? true;
  let compaction: Record<string, unknown> | null = null;
  if (shouldRunCompaction) {
    if (!isSupabaseMemoryEnabled()) {
      compaction = {
        skipped: true,
        provider: getMemoryProvider(),
        reason:
          "Supabase compaction is disabled. Set USE_SUPABASE_MEMORY=true and MEMORY_PROVIDER=supabase.",
      };
    } else {
      const mode = parseCompactionMode(payload.compactionMode);
      let weekly: Record<string, unknown> | null = null;
      let monthly: Record<string, unknown> | null = null;
      if (mode === "weekly" || mode === "both") {
        weekly = await runWeeklySummarization(cloneId);
      }
      if (mode === "monthly" || mode === "both") {
        monthly = await runMonthlyRewind(cloneId);
      }
      compaction = {
        mode,
        weekly,
        monthly,
      };
    }
  }

  const failedProviders = Object.entries(providerResults)
    .filter(([, result]) => result && !result.success)
    .map(([provider]) => provider);

  return {
    success: failedProviders.length === 0,
    clone_id: cloneId,
    providers: providerResults,
    failed_providers: failedProviders,
    compaction,
  };
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized scheduled sync request." }, { status: 401 });
  }

  try {
    const payload: ScheduledSyncPayload = {
      cloneId: request.nextUrl.searchParams.get("cloneId") || undefined,
      providers: parseProviders(request.nextUrl.searchParams.get("providers")),
      runCompaction: parseBoolean(
        request.nextUrl.searchParams.get("runCompaction") || undefined,
        true
      ),
      compactionMode: parseCompactionMode(
        request.nextUrl.searchParams.get("compactionMode")
      ),
      githubUsername:
        request.nextUrl.searchParams.get("githubUsername") || undefined,
      channelLimit: toNumber(
        request.nextUrl.searchParams.get("channelLimit") || undefined,
        20,
        1,
        200
      ),
      messagesPerChannel: toNumber(
        request.nextUrl.searchParams.get("messagesPerChannel") || undefined,
        200,
        1,
        1000
      ),
      repoLimit: toNumber(
        request.nextUrl.searchParams.get("repoLimit") || undefined,
        10,
        1,
        100
      ),
      itemsPerRepo: toNumber(
        request.nextUrl.searchParams.get("itemsPerRepo") || undefined,
        10,
        1,
        100
      ),
      pageLimit: toNumber(
        request.nextUrl.searchParams.get("pageLimit") || undefined,
        20,
        1,
        100
      ),
      fileLimit: toNumber(
        request.nextUrl.searchParams.get("fileLimit") || undefined,
        25,
        1,
        100
      ),
      gmailMaxResults: toNumber(
        request.nextUrl.searchParams.get("gmailMaxResults") || undefined,
        50,
        1,
        200
      ),
    };
    const result = await runScheduledSync(payload);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Scheduled sync failed.",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized scheduled sync request." }, { status: 401 });
  }

  try {
    const payload = (await request.json()) as ScheduledSyncPayload;
    const providers = sanitizeProviders(payload.providers);

    const result = await runScheduledSync({
      ...payload,
      providers,
      compactionMode: parseCompactionMode(payload.compactionMode),
    });
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Scheduled sync failed.",
      },
      { status: 500 }
    );
  }
}
