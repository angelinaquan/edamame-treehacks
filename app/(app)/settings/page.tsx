"use client";

import { Suspense, useEffect, useMemo, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { KeyRound, ShieldCheck, RefreshCw, LogIn, LogOut, Mail, HardDrive } from "lucide-react";

type Provider = "slack" | "github" | "notion" | "google_drive" | "jira" | "email";

const SYNCABLE_PROVIDERS: Provider[] = ["slack", "github", "notion", "google_drive"];

const syncRoutes: Partial<Record<Provider, string>> = {
  slack: "/api/slack/sync",
  github: "/api/github/sync",
  notion: "/api/notion/sync",
  google_drive: "/api/google-drive/sync",
  email: "/api/gmail/sync",
};

interface ProviderField {
  key: string;
  label: string;
  type?: "text" | "password";
  placeholder?: string;
}

interface IntegrationStatus {
  provider: Provider;
  updated_at: string;
  has_config: boolean;
  config_preview: Record<string, unknown>;
}

interface SyncFeedback {
  success: boolean;
  message: string;
}

const providerLabels: Record<Provider, string> = {
  slack: "Slack",
  github: "GitHub",
  notion: "Notion",
  google_drive: "Google Drive",
  jira: "Jira",
  email: "Email",
};

const providerFields: Record<Provider, ProviderField[]> = {
  slack: [
    { key: "client_id", label: "Client ID" },
    { key: "client_secret", label: "Client Secret", type: "password" },
    { key: "bot_token", label: "Bot Token", type: "password" },
  ],
  github: [
    { key: "username", label: "GitHub Username" },
    { key: "token", label: "Personal Access Token", type: "password" },
  ],
  notion: [
    { key: "api_key", label: "Notion API Key", type: "password" },
    { key: "workspace_name", label: "Workspace Name (optional)" },
  ],
  google_drive: [
    { key: "api_key", label: "Google API Key", type: "password" },
    { key: "service_account_json", label: "Service Account JSON", type: "password" },
  ],
  jira: [
    { key: "base_url", label: "Jira Base URL", placeholder: "https://your-company.atlassian.net" },
    { key: "email", label: "Jira Email" },
    { key: "api_token", label: "Jira API Token", type: "password" },
  ],
  email: [
    { key: "provider", label: "Provider (gmail/outlook/custom)" },
    { key: "address", label: "Email Address" },
    { key: "app_password", label: "App Password / Token", type: "password" },
  ],
};

const providers = Object.keys(providerLabels) as Provider[];

function formatSyncResult(result: Record<string, unknown>): string {
  const parts: string[] = [];
  if (typeof result.channels_scanned === "number") {
    parts.push(`${result.channels_scanned} channels`);
  }
  if (typeof result.messages_fetched === "number") {
    parts.push(`${result.messages_fetched} messages`);
  }
  if (typeof result.repositories_scanned === "number") {
    parts.push(`${result.repositories_scanned} repos`);
  }
  if (typeof result.pages_scanned === "number") {
    parts.push(`${result.pages_scanned} pages`);
  }
  if (typeof result.files_scanned === "number") {
    parts.push(`${result.files_scanned} files`);
  }
  if (typeof result.documents_created === "number") {
    parts.push(`${result.documents_created} docs`);
  }
  if (typeof result.chunks_created === "number") {
    parts.push(`${result.chunks_created} chunks`);
  }
  return parts.length > 0 ? parts.join(", ") : "Sync complete";
}

function SettingsContent() {
  const searchParams = useSearchParams();
  const [formState, setFormState] = useState<Record<Provider, Record<string, string>>>({
    slack: {},
    github: {},
    notion: {},
    google_drive: {},
    jira: {},
    email: {},
  });
  const [statuses, setStatuses] = useState<Record<Provider, IntegrationStatus | null>>({
    slack: null,
    github: null,
    notion: null,
    google_drive: null,
    jira: null,
    email: null,
  });
  const [savingProvider, setSavingProvider] = useState<Provider | null>(null);
  const [syncingProvider, setSyncingProvider] = useState<Provider | null>(null);
  const [syncFeedback, setSyncFeedback] = useState<Record<Provider, SyncFeedback | null>>({
    slack: null,
    github: null,
    notion: null,
    google_drive: null,
    jira: null,
    email: null,
  });
  const [message, setMessage] = useState<string>("");

  // Handle Google OAuth redirects
  useEffect(() => {
    const googleConnected = searchParams.get("google_connected");
    const googleError = searchParams.get("google_error");
    if (googleConnected === "true") {
      setMessage("Google account connected successfully! You can now sync Drive and Gmail.");
    } else if (googleError) {
      setMessage(`Google connection failed: ${googleError}`);
    }
  }, [searchParams]);

  useEffect(() => {
    async function loadIntegrations() {
      try {
        const response = await fetch("/api/integrations");
        const data = await response.json();
        const next: Record<Provider, IntegrationStatus | null> = {
          slack: null,
          github: null,
          notion: null,
          google_drive: null,
          jira: null,
          email: null,
        };
        for (const integration of (data.integrations ?? []) as IntegrationStatus[]) {
          next[integration.provider] = integration;
        }
        setStatuses(next);
      } catch (error) {
        console.error("Failed to load integrations:", error);
      }
    }
    loadIntegrations();
  }, []);

  // Determine if Google is connected via OAuth
  const googleStatus = statuses.google_drive;
  const isGoogleOAuth =
    googleStatus?.has_config &&
    googleStatus?.config_preview?.auth_type === "oauth";
  const googleEmail =
    isGoogleOAuth && typeof googleStatus?.config_preview?.user_email === "string"
      ? googleStatus.config_preview.user_email
      : null;

  const providerCards = useMemo(
    () =>
      providers
        .filter((p) => p !== "google_drive") // Google Drive gets its own card
        .map((provider) => ({
          provider,
          label: providerLabels[provider],
          fields: providerFields[provider],
          status: statuses[provider],
        })),
    [statuses]
  );

  const handleInputChange = (provider: Provider, key: string, value: string) => {
    setFormState((prev) => ({
      ...prev,
      [provider]: {
        ...prev[provider],
        [key]: value,
      },
    }));
  };

  const handleSave = async (provider: Provider) => {
    setSavingProvider(provider);
    setMessage("");
    setSyncFeedback((prev) => ({ ...prev, [provider]: null }));

    const payload = Object.fromEntries(
      Object.entries(formState[provider]).filter(([, value]) => value.trim() !== "")
    );

    try {
      const response = await fetch("/api/integrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider,
          config: payload,
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to save integration");
      }

      setStatuses((prev) => ({
        ...prev,
        [provider]: {
          provider,
          updated_at: data.updated_at,
          has_config: true,
          config_preview: {},
        },
      }));
      setFormState((prev) => ({ ...prev, [provider]: {} }));

      // Show sync feedback from auto-trigger
      if (data.sync) {
        if (data.sync.success && data.sync.result) {
          const summary = formatSyncResult(data.sync.result as Record<string, unknown>);
          setSyncFeedback((prev) => ({
            ...prev,
            [provider]: { success: true, message: `Saved and synced: ${summary}` },
          }));
        } else if (data.sync.error) {
          setSyncFeedback((prev) => ({
            ...prev,
            [provider]: { success: false, message: `Saved, but sync failed: ${data.sync.error}` },
          }));
        }
      } else {
        setMessage(`${providerLabels[provider]} settings saved.`);
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Unknown save error";
      setMessage(msg);
    } finally {
      setSavingProvider(null);
    }
  };

  const handleSyncNow = useCallback(async (provider: Provider, route?: string) => {
    const syncRoute = route || syncRoutes[provider];
    if (!syncRoute) return;

    setSyncingProvider(provider);
    setSyncFeedback((prev) => ({ ...prev, [provider]: null }));

    try {
      const response = await fetch(syncRoute, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cloneId: "auto" }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Sync failed");
      }

      const result = (data.result ?? data) as Record<string, unknown>;
      const summary = formatSyncResult(result);
      setSyncFeedback((prev) => ({
        ...prev,
        [provider]: { success: true, message: `Synced: ${summary}` },
      }));
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Sync failed";
      setSyncFeedback((prev) => ({
        ...prev,
        [provider]: { success: false, message: msg },
      }));
    } finally {
      setSyncingProvider(null);
    }
  }, []);

  const handleDisconnectGoogle = useCallback(async () => {
    try {
      const response = await fetch("/api/integrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: "google_drive", config: {} }),
      });
      if (response.ok) {
        setStatuses((prev) => ({ ...prev, google_drive: null }));
        setMessage("Google account disconnected.");
      }
    } catch {
      setMessage("Failed to disconnect Google account.");
    }
  }, []);

  const googleFeedback = syncFeedback.google_drive;
  const isGoogleSyncing = syncingProvider === "google_drive";

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
          Integrations
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          Connect accounts and add API keys so data sources can sync into memory for RAG.
        </p>
      </div>

      <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/20 dark:text-amber-200">
        <div className="flex items-start gap-2">
          <ShieldCheck size={16} className="mt-0.5" />
          <p>
            Credentials are stored in your Supabase table. Saving will automatically sync data into memory.
          </p>
        </div>
      </div>

      {message && (
        <div className="mb-4 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200">
          {message}
        </div>
      )}

      {/* ---- Google Account (OAuth) Card ---- */}
      <div className="mb-4 rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            <svg width="16" height="16" viewBox="0 0 48 48" className="flex-shrink-0">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
            </svg>
            Google Account
          </h2>
          <span
            className={`rounded-full px-2 py-0.5 text-xs ${
              isGoogleOAuth
                ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
                : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
            }`}
          >
            {isGoogleOAuth ? "Connected" : "Not connected"}
          </span>
        </div>

        {isGoogleOAuth ? (
          <>
            {/* Connected state */}
            <div className="mb-3 flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700 dark:border-green-900 dark:bg-green-950/20 dark:text-green-300">
              <Mail size={14} />
              <span>
                Signed in as <strong>{googleEmail || "unknown"}</strong>
              </span>
            </div>

            <p className="mb-3 text-xs text-zinc-500">
              Sync your Google Drive files and Gmail messages into organizational memory.
            </p>

            {googleFeedback && (
              <div
                className={`mb-3 rounded-lg px-3 py-2 text-xs ${
                  googleFeedback.success
                    ? "border border-green-200 bg-green-50 text-green-700 dark:border-green-900 dark:bg-green-950/20 dark:text-green-300"
                    : "border border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/20 dark:text-red-300"
                }`}
              >
                {googleFeedback.message}
              </div>
            )}

            {googleStatus?.updated_at && (
              <p className="mb-3 text-xs text-zinc-500">
                Last updated: {new Date(googleStatus.updated_at).toLocaleString()}
              </p>
            )}

            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => handleSyncNow("google_drive", "/api/google-drive/sync")}
                disabled={isGoogleSyncing}
                className="flex items-center gap-1.5 rounded-lg border border-zinc-200 px-3 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                <HardDrive size={14} className={isGoogleSyncing ? "animate-spin" : ""} />
                {isGoogleSyncing ? "Syncing..." : "Sync Drive"}
              </button>
              <button
                onClick={() => handleSyncNow("google_drive", "/api/gmail/sync")}
                disabled={isGoogleSyncing}
                className="flex items-center gap-1.5 rounded-lg border border-zinc-200 px-3 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                <Mail size={14} className={isGoogleSyncing ? "animate-spin" : ""} />
                {isGoogleSyncing ? "Syncing..." : "Sync Gmail"}
              </button>
              <button
                onClick={handleDisconnectGoogle}
                className="flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950/20"
              >
                <LogOut size={14} />
                Disconnect
              </button>
            </div>
          </>
        ) : (
          <>
            {/* Not connected state */}
            <p className="mb-3 text-sm text-zinc-500">
              Connect your Google account to sync Google Drive files and Gmail messages into organizational memory.
            </p>
            <a
              href="/api/auth/google"
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
            >
              <LogIn size={14} />
              Connect Google Account
            </a>
          </>
        )}
      </div>

      {/* ---- Other Integration Cards ---- */}
      <div className="grid gap-4 md:grid-cols-2">
        {providerCards.map(({ provider, label, fields, status }) => {
          const feedback = syncFeedback[provider];
          const isSyncable = SYNCABLE_PROVIDERS.includes(provider);
          const isSyncing = syncingProvider === provider;
          const isSaving = savingProvider === provider;

          return (
            <div
              key={provider}
              className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
            >
              <div className="mb-3 flex items-center justify-between">
                <h2 className="flex items-center gap-2 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  <KeyRound size={14} />
                  {label}
                </h2>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs ${
                    status?.has_config
                      ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
                      : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
                  }`}
                >
                  {status?.has_config ? "Configured" : "Not configured"}
                </span>
              </div>

              <div className="space-y-2">
                {fields.map((field) => (
                  <div key={field.key}>
                    <label className="mb-1 block text-xs text-zinc-500">{field.label}</label>
                    <input
                      type={field.type || "text"}
                      value={formState[provider][field.key] || ""}
                      placeholder={field.placeholder || ""}
                      onChange={(event) =>
                        handleInputChange(provider, field.key, event.target.value)
                      }
                      className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm outline-none ring-blue-500 focus:ring-2 dark:border-zinc-700 dark:bg-zinc-950"
                    />
                  </div>
                ))}
              </div>

              {feedback && (
                <div
                  className={`mt-3 rounded-lg px-3 py-2 text-xs ${
                    feedback.success
                      ? "border border-green-200 bg-green-50 text-green-700 dark:border-green-900 dark:bg-green-950/20 dark:text-green-300"
                      : "border border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/20 dark:text-red-300"
                  }`}
                >
                  {feedback.message}
                </div>
              )}

              {status?.updated_at && (
                <p className="mt-3 text-xs text-zinc-500">
                  Last updated: {new Date(status.updated_at).toLocaleString()}
                </p>
              )}

              <div className="mt-3 flex gap-2">
                <button
                  onClick={() => handleSave(provider)}
                  disabled={isSaving || isSyncing}
                  className="flex-1 rounded-lg bg-blue-600 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSaving ? "Saving & syncing..." : `Save ${label}`}
                </button>

                {isSyncable && status?.has_config && (
                  <button
                    onClick={() => handleSyncNow(provider)}
                    disabled={isSaving || isSyncing}
                    className="flex items-center gap-1.5 rounded-lg border border-zinc-200 px-3 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                  >
                    <RefreshCw size={14} className={isSyncing ? "animate-spin" : ""} />
                    {isSyncing ? "Syncing..." : "Sync Now"}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-64 items-center justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
        </div>
      }
    >
      <SettingsContent />
    </Suspense>
  );
}
