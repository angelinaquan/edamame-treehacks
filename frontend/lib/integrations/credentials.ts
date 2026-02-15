import { createServerSupabaseClient } from "@/lib/core/supabase/server";

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

// ---- Google OAuth tokens ----

export interface GoogleOAuthTokens {
  access_token: string;
  refresh_token: string;
  expiry_date: number;
  user_email: string;
}

/**
 * Reads Google OAuth tokens from integration_credentials.
 * If the access token is expired (or within 5 min of expiry),
 * uses the refresh token to get a new one and updates the DB.
 * Returns null if no OAuth tokens are stored.
 */
export async function getGoogleOAuthTokens(): Promise<GoogleOAuthTokens | null> {
  const config = await getIntegrationConfig("google_drive");
  if (!config || config.auth_type !== "oauth") return null;

  const accessToken = config.access_token as string | undefined;
  const refreshToken = config.refresh_token as string | undefined;
  const expiryDate = config.expiry_date as number | undefined;
  const userEmail = (config.user_email as string) ?? "unknown";

  if (!accessToken || !refreshToken) return null;

  // Check if token is expired or about to expire (5 min buffer)
  const now = Date.now();
  const isExpired = expiryDate != null && expiryDate - now < 5 * 60 * 1000;

  if (!isExpired) {
    return { access_token: accessToken, refresh_token: refreshToken, expiry_date: expiryDate ?? 0, user_email: userEmail };
  }

  // Refresh the token
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("Cannot refresh Google token: GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET not set.");
  }

  const { google } = await import("googleapis");

  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret);
  oauth2Client.setCredentials({ refresh_token: refreshToken });

  const { credentials } = await oauth2Client.refreshAccessToken();

  const newAccessToken = credentials.access_token ?? accessToken;
  const newExpiryDate = credentials.expiry_date ?? 0;

  // Update in DB
  const supabase = createServerSupabaseClient();
  await supabase
    .from("integration_credentials")
    .update({
      config: {
        auth_type: "oauth",
        access_token: newAccessToken,
        refresh_token: refreshToken,
        expiry_date: newExpiryDate,
        user_email: userEmail,
      },
      updated_at: new Date().toISOString(),
    })
    .eq("provider", "google_drive");

  return {
    access_token: newAccessToken,
    refresh_token: refreshToken,
    expiry_date: newExpiryDate,
    user_email: userEmail,
  };
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

  // Try active clones first
  const active = await supabase
    .from("clones")
    .select("id")
    .eq("status", "active")
    .order("created_at", { ascending: true })
    .limit(1)
    .single();

  if (active.data?.id) {
    return active.data.id as string;
  }

  // Fall back to any clone regardless of status
  const anyClone = await supabase
    .from("clones")
    .select("id")
    .order("created_at", { ascending: true })
    .limit(1)
    .single();

  if (anyClone.data?.id) {
    return anyClone.data.id as string;
  }

  // No clones at all — auto-seed a default clone (no org/user FK needed)
  console.log("[getActiveCloneId] No clones found, auto-seeding default clone...");

  const { data: clone, error: cloneErr } = await supabase
    .from("clones")
    .insert({ name: "Default Clone", status: "active" })
    .select("id")
    .single();

  if (cloneErr || !clone) {
    throw new Error(`Failed to create default clone: ${cloneErr?.message}`);
  }

  console.log(`[getActiveCloneId] Seeded default clone: ${clone.id}`);
  return clone.id as string;
}
