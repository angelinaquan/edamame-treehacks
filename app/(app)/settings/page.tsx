"use client";

import { useEffect, useMemo, useState } from "react";
import { KeyRound, ShieldCheck } from "lucide-react";

type Provider = "slack" | "github" | "notion" | "google_drive" | "jira" | "email";

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

export default function SettingsPage() {
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
  const [message, setMessage] = useState<string>("");

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

  const providerCards = useMemo(
    () =>
      providers.map((provider) => ({
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
      setMessage(`${providerLabels[provider]} settings saved.`);
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Unknown save error";
      setMessage(msg);
    } finally {
      setSavingProvider(null);
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
          Integrations
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          Add API keys and login credentials so data sources can sync into memory for RAG.
        </p>
      </div>

      <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/20 dark:text-amber-200">
        <div className="flex items-start gap-2">
          <ShieldCheck size={16} className="mt-0.5" />
          <p>
            Credentials are stored in your Supabase table `integration_credentials`. For production,
            encrypt secrets at rest with a KMS or vault before storage.
          </p>
        </div>
      </div>

      {message && (
        <div className="mb-4 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200">
          {message}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {providerCards.map(({ provider, label, fields, status }) => (
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

            {status?.updated_at && (
              <p className="mt-3 text-xs text-zinc-500">
                Last updated: {new Date(status.updated_at).toLocaleString()}
              </p>
            )}

            <button
              onClick={() => handleSave(provider)}
              disabled={savingProvider === provider}
              className="mt-3 w-full rounded-lg bg-blue-600 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {savingProvider === provider ? "Saving..." : `Save ${label}`}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
