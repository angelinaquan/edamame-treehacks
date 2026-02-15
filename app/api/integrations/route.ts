import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

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
    .from("integration_credentials")
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
    .from("integration_credentials")
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

  return NextResponse.json({
    success: true,
    provider: result.data.provider,
    updated_at: result.data.updated_at,
  });
}
