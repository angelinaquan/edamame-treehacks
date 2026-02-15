import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/core/supabase/server";
import { getActiveCloneId } from "@/lib/integrations/credentials";
import { syncGitHubContextToSupabase } from "@/lib/integrations/github";
import { syncNotionContextToSupabase } from "@/lib/integrations/notion";
import { syncGoogleDriveContextToSupabase, syncGmailToSupabase } from "@/lib/integrations/google";
import { syncSlackContextToSupabase } from "@/lib/integrations/slack";

type IntegrationProvider =
  | "slack"
  | "github"
  | "notion"
  | "google_drive"
  | "jira"
  | "email";

const VALID_PROVIDERS: IntegrationProvider[] = [
  "slack",
  "github",
  "notion",
  "google_drive",
  "jira",
  "email",
];

interface IntegrationRecord {
  provider: IntegrationProvider;
  config: Record<string, unknown>;
  updated_at: string;
}

function isSecretLikeKey(key: string): boolean {
  const lower = key.toLowerCase();
  return (
    lower.includes("token") ||
    lower.includes("secret") ||
    lower.includes("password") ||
    lower.includes("apikey") ||
    lower.includes("api_key") ||
    lower.includes("private")
  );
}

function maskConfig(config: Record<string, unknown>): Record<string, unknown> {
  const masked: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(config)) {
    if (isSecretLikeKey(key)) {
      masked[key] = value ? "********" : "";
      continue;
    }
    masked[key] = value;
  }
  return masked;
}

export async function GET() {
  const supabase = createServerSupabaseClient();
  const result = await supabase
    .from("integrations")
    .select("provider, config, updated_at")
    .order("provider");

  if (result.error) {
    return NextResponse.json(
      { error: `Failed to load integrations: ${result.error.message}` },
      { status: 500 }
    );
  }

  const integrations = (result.data as IntegrationRecord[]).map((row) => ({
    provider: row.provider,
    updated_at: row.updated_at,
    has_config: Object.keys(row.config ?? {}).length > 0,
    config_preview: maskConfig(row.config ?? {}),
  }));

  return NextResponse.json({ integrations });
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as {
    provider?: IntegrationProvider;
    config?: Record<string, unknown>;
  };

  if (!body.provider || !VALID_PROVIDERS.includes(body.provider)) {
    return NextResponse.json({ error: "Invalid provider" }, { status: 400 });
  }

  if (!body.config || typeof body.config !== "object") {
    return NextResponse.json(
      { error: "config must be a JSON object" },
      { status: 400 }
    );
  }

  const supabase = createServerSupabaseClient();
  const result = await supabase
    .from("integrations")
    .upsert(
      {
        provider: body.provider,
        config: body.config,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "provider" }
    )
    .select("provider, updated_at")
    .single();

  if (result.error || !result.data) {
    return NextResponse.json(
      { error: `Failed to save integration: ${result.error?.message}` },
      { status: 500 }
    );
  }

  // Auto-trigger sync after saving credentials
  let syncResult: unknown = null;
  let syncError: string | null = null;

  try {
    const cloneId = await getActiveCloneId();

    if (body.provider === "slack") {
      if (body.config.bot_token) {
        syncResult = await syncSlackContextToSupabase({
          cloneId,
          channelLimit: 20,
          messagesPerChannel: 200,
        });
      }
    } else if (body.provider === "github") {
      const username =
        typeof body.config.username === "string"
          ? body.config.username.trim()
          : null;
      if (username && body.config.token) {
        syncResult = await syncGitHubContextToSupabase({
          cloneId,
          username,
          repoLimit: 10,
          itemsPerRepo: 10,
        });
      }
    } else if (body.provider === "notion") {
      if (body.config.api_key) {
        syncResult = await syncNotionContextToSupabase({
          cloneId,
          pageLimit: 20,
        });
      }
    } else if (body.provider === "google_drive") {
      const isOAuth = body.config.auth_type === "oauth";
      if (isOAuth || body.config.service_account_json || body.config.api_key) {
        const driveResult = await syncGoogleDriveContextToSupabase({
          cloneId,
          fileLimit: 20,
        });
        // If OAuth, also sync Gmail
        if (isOAuth) {
          const gmailResult = await syncGmailToSupabase({
            cloneId,
            maxResults: 50,
          });
          syncResult = { drive: driveResult, gmail: gmailResult };
        } else {
          syncResult = driveResult;
        }
      }
    }
  } catch (error) {
    syncError =
      error instanceof Error ? error.message : "Sync failed after save";
  }

  return NextResponse.json({
    success: true,
    provider: result.data.provider,
    updated_at: result.data.updated_at,
    sync: syncResult
      ? { success: true, result: syncResult }
      : syncError
        ? { success: false, error: syncError }
        : null,
  });
}
