import { createServerSupabaseClient } from "@/lib/supabase/server";

type IntegrationProvider =
  | "slack"
  | "github"
  | "notion"
  | "google_drive"
  | "jira"
  | "email";

export async function getIntegrationConfig(
  provider: IntegrationProvider
): Promise<Record<string, unknown> | null> {
  try {
    const supabase = createServerSupabaseClient();
    const result = await supabase
      .from("integration_credentials")
      .select("config")
      .eq("provider", provider)
      .single();

    if (result.error || !result.data) return null;
    const config = result.data.config as Record<string, unknown> | null;
    if (!config || Object.keys(config).length === 0) return null;
    return config;
  } catch {
    return null;
  }
}

export async function getGitHubToken(): Promise<string> {
  const config = await getIntegrationConfig("github");
  if (config?.token && typeof config.token === "string" && config.token.trim()) {
    return config.token.trim();
  }
  const envToken = process.env.GITHUB_TOKEN;
  if (envToken) return envToken;
  throw new Error(
    "No GitHub token found. Add it in Settings or set GITHUB_TOKEN in .env.local."
  );
}

export async function getGitHubUsername(): Promise<string | null> {
  const config = await getIntegrationConfig("github");
  if (
    config?.username &&
    typeof config.username === "string" &&
    config.username.trim()
  ) {
    return config.username.trim();
  }
  return null;
}

export async function getNotionApiKey(): Promise<string> {
  const config = await getIntegrationConfig("notion");
  if (
    config?.api_key &&
    typeof config.api_key === "string" &&
    config.api_key.trim()
  ) {
    return config.api_key.trim();
  }
  const envKey = process.env.NOTION_API_KEY;
  if (envKey) return envKey;
  throw new Error(
    "No Notion API key found. Add it in Settings or set NOTION_API_KEY in .env.local."
  );
}

export interface GoogleDriveCredentials {
  serviceAccountJson?: string;
  keyFile?: string;
}

export async function getGoogleDriveCredentials(): Promise<GoogleDriveCredentials> {
  const config = await getIntegrationConfig("google_drive");

  if (config?.service_account_json && typeof config.service_account_json === "string") {
    return { serviceAccountJson: config.service_account_json.trim() };
  }

  if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
    return { serviceAccountJson: process.env.GOOGLE_SERVICE_ACCOUNT_JSON };
  }

  const keyFile =
    process.env.GOOGLE_SERVICE_ACCOUNT_KEY_FILE || "service-account.json";
  return { keyFile };
}

export async function getSlackBotToken(): Promise<string> {
  const config = await getIntegrationConfig("slack");
  if (
    config?.bot_token &&
    typeof config.bot_token === "string" &&
    config.bot_token.trim()
  ) {
    return config.bot_token.trim();
  }
  const envToken = process.env.SLACK_BOT_TOKEN;
  if (envToken) return envToken;
  throw new Error(
    "No Slack bot token found. Add it in Settings or set SLACK_BOT_TOKEN in .env.local."
  );
}

export async function getActiveCloneId(): Promise<string> {
  const supabase = createServerSupabaseClient();
  const result = await supabase
    .from("clones")
    .select("id")
    .eq("status", "active")
    .order("created_at", { ascending: true })
    .limit(1)
    .single();

  if (result.error || !result.data) {
    throw new Error("No active clone found. Create a clone first.");
  }
  return result.data.id as string;
}
