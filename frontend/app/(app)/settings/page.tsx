"use client";

import { Suspense, useEffect, useMemo, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  RefreshCw,
  LogIn,
  LogOut,
  Mail,
  HardDrive,
  Sparkles,
  ExternalLink,
  Check,
  AlertCircle,
  Github,
  MessageSquare,
  FileText,
} from "lucide-react";

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

const providerMeta: Record<
  Provider,
  { label: string; description: string; icon: React.ReactNode }
> = {
  slack: {
    label: "Slack",
    description: "Sync channels and messages into organizational memory.",
    icon: <MessageSquare size={18} />,
  },
  github: {
    label: "GitHub",
    description: "Sync repositories, issues, and PRs.",
    icon: <Github size={18} />,
  },
  notion: {
    label: "Notion",
    description: "Sync workspace pages and databases.",
    icon: <FileText size={18} />,
  },
  google_drive: {
    label: "Google",
    description: "Sync Drive files and Gmail messages.",
    icon: null, // custom SVG below
  },
  jira: {
    label: "Jira",
    description: "Sync projects, issues, and sprints.",
    icon: <ExternalLink size={18} />,
  },
  email: {
    label: "Email",
    description: "Sync email messages via IMAP.",
    icon: <Mail size={18} />,
  },
};

const providerFields: Record<Provider, ProviderField[]> = {
  slack: [
    { key: "bot_token", label: "Bot Token", type: "password", placeholder: "xoxb-..." },
  ],
  github: [
    { key: "username", label: "Username", placeholder: "octocat" },
    { key: "token", label: "Personal Access Token", type: "password", placeholder: "ghp_..." },
  ],
  notion: [
    { key: "api_key", label: "API Key", type: "password", placeholder: "ntn_..." },
  ],
  google_drive: [],
  jira: [
    { key: "base_url", label: "Base URL", placeholder: "https://your-company.atlassian.net" },
    { key: "email", label: "Email" },
    { key: "api_token", label: "API Token", type: "password" },
  ],
  email: [
    { key: "address", label: "Email Address", placeholder: "you@company.com" },
    { key: "app_password", label: "App Password", type: "password" },
  ],
};

const NON_GOOGLE_PROVIDERS: Provider[] = ["slack", "github", "notion", "jira", "email"];

function formatSyncResult(result: Record<string, unknown>): string {
  const parts: string[] = [];
  if (typeof result.channels_scanned === "number") parts.push(`${result.channels_scanned} channels`);
  if (typeof result.messages_fetched === "number") parts.push(`${result.messages_fetched} messages`);
  if (typeof result.repositories_scanned === "number") parts.push(`${result.repositories_scanned} repos`);
  if (typeof result.pages_scanned === "number") parts.push(`${result.pages_scanned} pages`);
  if (typeof result.files_scanned === "number") parts.push(`${result.files_scanned} files`);
  if (typeof result.documents_created === "number") parts.push(`${result.documents_created} docs`);
  if (typeof result.chunks_created === "number") parts.push(`${result.chunks_created} chunks`);
  return parts.length > 0 ? parts.join(", ") : "Sync complete";
}

// ---- Google logo SVG ----
function GoogleLogo({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" className="flex-shrink-0">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  );
}

// ============================================
// Main component
// ============================================

function SettingsContent() {
  const searchParams = useSearchParams();
  const [formState, setFormState] = useState<Record<Provider, Record<string, string>>>({
    slack: {}, github: {}, notion: {}, google_drive: {}, jira: {}, email: {},
  });
  const [statuses, setStatuses] = useState<Record<Provider, IntegrationStatus | null>>({
    slack: null, github: null, notion: null, google_drive: null, jira: null, email: null,
  });
  const [savingProvider, setSavingProvider] = useState<Provider | null>(null);
  const [syncingProvider, setSyncingProvider] = useState<Provider | null>(null);
  const [syncFeedback, setSyncFeedback] = useState<Record<Provider, SyncFeedback | null>>({
    slack: null, github: null, notion: null, google_drive: null, jira: null, email: null,
  });
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" | "info" } | null>(null);

  // Handle Google OAuth redirects
  useEffect(() => {
    const connected = searchParams.get("google_connected");
    const error = searchParams.get("google_error");
    if (connected === "true") {
      setMessage({ text: "Google account connected successfully.", type: "success" });
    } else if (error) {
      setMessage({ text: `Google connection failed: ${error}`, type: "error" });
    }
  }, [searchParams]);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/integrations");
        const data = await res.json();
        const next: Record<Provider, IntegrationStatus | null> = {
          slack: null, github: null, notion: null, google_drive: null, jira: null, email: null,
        };
        for (const i of (data.integrations ?? []) as IntegrationStatus[]) {
          next[i.provider] = i;
        }
        setStatuses(next);
      } catch {
        // ignore load errors
      }
    }
    load();
  }, []);

  const googleStatus = statuses.google_drive;
  const isGoogleOAuth = googleStatus?.has_config && googleStatus?.config_preview?.auth_type === "oauth";
  const googleEmail = isGoogleOAuth && typeof googleStatus?.config_preview?.user_email === "string"
    ? googleStatus.config_preview.user_email : null;

  const handleInputChange = (provider: Provider, key: string, value: string) => {
    setFormState((prev) => ({ ...prev, [provider]: { ...prev[provider], [key]: value } }));
  };

  const handleSave = async (provider: Provider) => {
    setSavingProvider(provider);
    setMessage(null);
    setSyncFeedback((prev) => ({ ...prev, [provider]: null }));
    const payload = Object.fromEntries(
      Object.entries(formState[provider]).filter(([, v]) => v.trim() !== "")
    );
    try {
      const res = await fetch("/api/integrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, config: payload }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save");
      setStatuses((prev) => ({
        ...prev,
        [provider]: { provider, updated_at: data.updated_at, has_config: true, config_preview: {} },
      }));
      setFormState((prev) => ({ ...prev, [provider]: {} }));
      if (data.sync?.success && data.sync.result) {
        const summary = formatSyncResult(data.sync.result as Record<string, unknown>);
        setSyncFeedback((prev) => ({ ...prev, [provider]: { success: true, message: `Saved & synced: ${summary}` } }));
      } else if (data.sync?.error) {
        setSyncFeedback((prev) => ({ ...prev, [provider]: { success: false, message: `Saved, sync failed: ${data.sync.error}` } }));
      } else {
        setMessage({ text: `${providerMeta[provider].label} saved.`, type: "success" });
      }
    } catch (err) {
      setMessage({ text: err instanceof Error ? err.message : "Save failed", type: "error" });
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
      const res = await fetch(syncRoute, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cloneId: "auto" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Sync failed");
      const result = (data.result ?? data) as Record<string, unknown>;
      setSyncFeedback((prev) => ({ ...prev, [provider]: { success: true, message: `Synced: ${formatSyncResult(result)}` } }));
    } catch (err) {
      setSyncFeedback((prev) => ({ ...prev, [provider]: { success: false, message: err instanceof Error ? err.message : "Sync failed" } }));
    } finally {
      setSyncingProvider(null);
    }
  }, []);

  const handleDisconnectGoogle = useCallback(async () => {
    try {
      const res = await fetch("/api/integrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: "google_drive", config: {} }),
      });
      if (res.ok) {
        setStatuses((prev) => ({ ...prev, google_drive: null }));
        setMessage({ text: "Google account disconnected.", type: "info" });
      }
    } catch {
      setMessage({ text: "Failed to disconnect.", type: "error" });
    }
  }, []);

  const isGoogleSyncing = syncingProvider === "google_drive";
  const googleFeedback = syncFeedback.google_drive;

  return (
    <div className="flex h-screen bg-white">
      {/* Slim sidebar nav */}
      <aside className="flex w-[240px] flex-shrink-0 flex-col border-r border-neutral-200 bg-neutral-50/70">
        <div className="flex items-center gap-2 px-5 py-5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600 text-white">
            <Sparkles size={15} />
          </div>
          <span className="text-[15px] font-semibold tracking-tight text-neutral-900">OrgPulse</span>
        </div>
        <nav className="flex-1 px-3">
          <a
            href="/"
            className="mb-1 flex items-center gap-2.5 rounded-md px-2.5 py-2 text-[13.5px] text-neutral-600 transition-colors hover:bg-neutral-100 hover:text-neutral-800"
          >
            <ArrowLeft size={16} className="text-neutral-400" />
            Back to OrgPulse
          </a>
        </nav>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-3xl px-8 py-10">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-[22px] font-semibold tracking-tight text-neutral-900">
              Integrations
            </h1>
            <p className="mt-1 text-[13.5px] text-neutral-500">
              Connect data sources to sync into organizational memory for RAG.
            </p>
          </div>

          {/* Flash message */}
          {message && (
            <div
              className={`mb-6 flex items-center gap-2.5 rounded-xl border px-4 py-3 text-[13px] ${
                message.type === "success"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : message.type === "error"
                  ? "border-red-200 bg-red-50 text-red-700"
                  : "border-neutral-200 bg-neutral-50 text-neutral-700"
              }`}
            >
              {message.type === "success" ? <Check size={14} /> : <AlertCircle size={14} />}
              {message.text}
              <button
                onClick={() => setMessage(null)}
                className="ml-auto text-current opacity-50 hover:opacity-80"
              >
                &times;
              </button>
            </div>
          )}

          {/* ---- Google Account Card ---- */}
          <div className="mb-6 rounded-xl border border-neutral-200 bg-white p-6">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <GoogleLogo size={22} />
                <div>
                  <h2 className="text-[14px] font-semibold text-neutral-900">Google Account</h2>
                  <p className="text-[12.5px] text-neutral-500">Google Drive & Gmail</p>
                </div>
              </div>
              <span
                className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${
                  isGoogleOAuth
                    ? "bg-emerald-50 text-emerald-600"
                    : "bg-neutral-100 text-neutral-500"
                }`}
              >
                {isGoogleOAuth ? "Connected" : "Not connected"}
              </span>
            </div>

            {isGoogleOAuth ? (
              <>
                <div className="mb-4 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50/50 px-3 py-2.5 text-[13px] text-emerald-700">
                  <Check size={14} />
                  Signed in as <strong>{googleEmail || "unknown"}</strong>
                </div>

                {googleFeedback && (
                  <div
                    className={`mb-4 rounded-lg border px-3 py-2.5 text-[12px] ${
                      googleFeedback.success
                        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                        : "border-red-200 bg-red-50 text-red-700"
                    }`}
                  >
                    {googleFeedback.message}
                  </div>
                )}

                {googleStatus?.updated_at && (
                  <p className="mb-4 text-[11.5px] text-neutral-400">
                    Last synced: {new Date(googleStatus.updated_at).toLocaleString()}
                  </p>
                )}

                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => handleSyncNow("google_drive", "/api/google-drive/sync")}
                    disabled={isGoogleSyncing}
                    className="flex items-center gap-2 rounded-lg border border-neutral-200 bg-white px-3.5 py-2 text-[13px] font-medium text-neutral-700 transition-colors hover:bg-neutral-50 disabled:opacity-50"
                  >
                    <HardDrive size={14} className={isGoogleSyncing ? "animate-spin" : ""} />
                    {isGoogleSyncing ? "Syncing..." : "Sync Drive"}
                  </button>
                  <button
                    onClick={() => handleSyncNow("google_drive", "/api/gmail/sync")}
                    disabled={isGoogleSyncing}
                    className="flex items-center gap-2 rounded-lg border border-neutral-200 bg-white px-3.5 py-2 text-[13px] font-medium text-neutral-700 transition-colors hover:bg-neutral-50 disabled:opacity-50"
                  >
                    <Mail size={14} className={isGoogleSyncing ? "animate-spin" : ""} />
                    {isGoogleSyncing ? "Syncing..." : "Sync Gmail"}
                  </button>
                  <button
                    onClick={handleDisconnectGoogle}
                    className="flex items-center gap-2 rounded-lg border border-red-200 px-3.5 py-2 text-[13px] font-medium text-red-600 transition-colors hover:bg-red-50"
                  >
                    <LogOut size={14} />
                    Disconnect
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="mb-4 text-[13px] leading-relaxed text-neutral-500">
                  Connect your Google account to sync Drive files and Gmail messages into organizational memory.
                  Requires OAuth credentials configured on the server.
                </p>
                <a
                  href="/api/auth/google"
                  className="inline-flex items-center gap-2 rounded-lg bg-neutral-900 px-4 py-2.5 text-[13px] font-medium text-white transition-colors hover:bg-neutral-800"
                >
                  <LogIn size={14} />
                  Connect Google Account
                </a>
              </>
            )}
          </div>

          {/* ---- Other Integrations ---- */}
          <div className="mb-4">
            <h2 className="text-[14px] font-semibold text-neutral-900">Other Integrations</h2>
            <p className="mt-0.5 text-[12.5px] text-neutral-500">
              Add API keys to connect additional data sources.
            </p>
          </div>

          <div className="space-y-4">
            {NON_GOOGLE_PROVIDERS.map((provider) => {
              const meta = providerMeta[provider];
              const fields = providerFields[provider];
              const status = statuses[provider];
              const feedback = syncFeedback[provider];
              const isSyncable = SYNCABLE_PROVIDERS.includes(provider);
              const isSyncing = syncingProvider === provider;
              const isSaving = savingProvider === provider;

              return (
                <div
                  key={provider}
                  className="rounded-xl border border-neutral-200 bg-white p-5"
                >
                  <div className="mb-3 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className="text-neutral-400">{meta.icon}</span>
                      <div>
                        <h3 className="text-[13.5px] font-semibold text-neutral-900">{meta.label}</h3>
                        <p className="text-[11.5px] text-neutral-500">{meta.description}</p>
                      </div>
                    </div>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${
                        status?.has_config
                          ? "bg-emerald-50 text-emerald-600"
                          : "bg-neutral-100 text-neutral-500"
                      }`}
                    >
                      {status?.has_config ? "Connected" : "Not configured"}
                    </span>
                  </div>

                  {fields.length > 0 && (
                    <div className="mb-3 space-y-2">
                      {fields.map((field) => (
                        <div key={field.key}>
                          <label className="mb-1 block text-[11.5px] font-medium text-neutral-500">
                            {field.label}
                          </label>
                          <input
                            type={field.type || "text"}
                            value={formState[provider][field.key] || ""}
                            placeholder={field.placeholder || ""}
                            onChange={(e) => handleInputChange(provider, field.key, e.target.value)}
                            className="w-full rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-[13px] text-neutral-800 placeholder:text-neutral-400 focus:border-indigo-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-100"
                          />
                        </div>
                      ))}
                    </div>
                  )}

                  {feedback && (
                    <div
                      className={`mb-3 rounded-lg border px-3 py-2 text-[12px] ${
                        feedback.success
                          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                          : "border-red-200 bg-red-50 text-red-700"
                      }`}
                    >
                      {feedback.message}
                    </div>
                  )}

                  {status?.updated_at && (
                    <p className="mb-3 text-[11.5px] text-neutral-400">
                      Last updated: {new Date(status.updated_at).toLocaleString()}
                    </p>
                  )}

                  <div className="flex gap-2">
                    {fields.length > 0 && (
                      <button
                        onClick={() => handleSave(provider)}
                        disabled={isSaving || isSyncing}
                        className="flex items-center gap-2 rounded-lg bg-neutral-900 px-4 py-2 text-[13px] font-medium text-white transition-colors hover:bg-neutral-800 disabled:opacity-50"
                      >
                        {isSaving ? "Saving..." : `Save`}
                      </button>
                    )}
                    {isSyncable && status?.has_config && (
                      <button
                        onClick={() => handleSyncNow(provider)}
                        disabled={isSaving || isSyncing}
                        className="flex items-center gap-2 rounded-lg border border-neutral-200 bg-white px-3.5 py-2 text-[13px] font-medium text-neutral-700 transition-colors hover:bg-neutral-50 disabled:opacity-50"
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
      </main>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen items-center justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
        </div>
      }
    >
      <SettingsContent />
    </Suspense>
  );
}
