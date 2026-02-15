import {
  getMemoryProvider,
  isMem0Configured,
  isMem0MemoryEnabled,
  readRuntimeEnv,
} from "./flags";
import type { KnowledgeContext } from "./memory";
import type { MemoryResourceInput } from "./types";

interface Mem0ItemLike {
  id?: string;
  memory?: string;
  content?: string;
  text?: string;
  score?: number;
  confidence?: number;
  created_at?: string;
  metadata?: Record<string, unknown>;
}

interface Mem0SyncResult {
  synced: number;
  failed: number;
  errors: string[];
}

const DEFAULT_MEM0_BASE_URL = "https://api.mem0.ai";

function getMem0BaseUrl(): string {
  return readRuntimeEnv("MEM0_BASE_URL") || DEFAULT_MEM0_BASE_URL;
}

function getMem0AuthHeader(): string {
  const apiKey = readRuntimeEnv("MEM0_API_KEY") || "";
  const scheme = readRuntimeEnv("MEM0_AUTH_SCHEME") || "Token";
  return `${scheme} ${apiKey}`;
}

function getMem0AddPath(): string {
  return readRuntimeEnv("MEM0_ADD_PATH") || "/v2/memories/";
}

function getMem0SearchPath(): string {
  return readRuntimeEnv("MEM0_SEARCH_PATH") || "/v2/memories/search/";
}

function getMem0FilterField(): string {
  return readRuntimeEnv("MEM0_FILTER_FIELD") || "user_id";
}

async function postMem0(path: string, body: Record<string, unknown>) {
  const url = `${getMem0BaseUrl().replace(/\/$/, "")}${path}`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: getMem0AuthHeader(),
    },
    body: JSON.stringify(body),
  });

  const text = await response.text();
  let parsed: unknown = null;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    parsed = text;
  }

  if (!response.ok) {
    throw new Error(
      `Mem0 request failed (${response.status}): ${
        typeof parsed === "string"
          ? parsed
          : JSON.stringify(parsed || { error: "Unknown Mem0 error" })
      }`
    );
  }

  return parsed;
}

function getItemText(item: Mem0ItemLike): string {
  return item.memory || item.content || item.text || "";
}

function getItemConfidence(item: Mem0ItemLike): number {
  const raw = item.confidence ?? item.score ?? 0.75;
  if (Number.isNaN(raw)) return 0.75;
  return Math.max(0, Math.min(1, Number(raw)));
}

function normalizeMem0Items(payload: unknown): Mem0ItemLike[] {
  if (!payload || typeof payload !== "object") return [];
  const container = payload as Record<string, unknown>;
  const candidates = [
    container.results,
    container.memories,
    container.data,
    container.items,
  ];
  for (const value of candidates) {
    if (Array.isArray(value)) {
      return value.filter(
        (item): item is Mem0ItemLike => Boolean(item && typeof item === "object")
      );
    }
  }
  return [];
}

function inferCategoryKey(metadata: Record<string, unknown>): string {
  const direct =
    metadata.category_key ||
    metadata.channel_name ||
    metadata.repo ||
    metadata.page_id ||
    metadata.source_type;
  return String(direct || "general");
}

export function shouldUseMem0(): boolean {
  return getMemoryProvider() === "mem0";
}

export async function syncResourcesToMem0(
  cloneId: string,
  resources: MemoryResourceInput[]
): Promise<Mem0SyncResult> {
  if (!isMem0Configured()) {
    return {
      synced: 0,
      failed: resources.length,
      errors: ["Mem0 is not configured. Set MEM0_API_KEY."],
    };
  }

  const errors: string[] = [];
  let synced = 0;
  for (const resource of resources) {
    try {
      const sourceMetadata =
        resource.source_metadata && typeof resource.source_metadata === "object"
          ? (resource.source_metadata as Record<string, unknown>)
          : {};
      await postMem0(getMem0AddPath(), {
        messages: [{ role: "user", content: resource.content }],
        user_id: cloneId,
        agent_id: cloneId,
        metadata: {
          clone_id: cloneId,
          source_type: resource.source_type,
          external_id: resource.external_id,
          title: resource.title,
          author: resource.author,
          occurred_at: resource.occurred_at,
          ...sourceMetadata,
        },
      });
      synced += 1;
    } catch (error) {
      errors.push(
        error instanceof Error ? error.message : "Unknown Mem0 sync failure"
      );
    }
  }

  return {
    synced,
    failed: resources.length - synced,
    errors,
  };
}

export async function searchMem0KnowledgeContext(
  cloneId: string,
  query: string,
  topK = 5
): Promise<KnowledgeContext | null> {
  if (!isMem0MemoryEnabled()) return null;

  const filterField = getMem0FilterField();
  const payload = await postMem0(getMem0SearchPath(), {
    query,
    version: "v2",
    filters: {
      OR: [
        {
          [filterField]: cloneId,
        },
      ],
    },
    user_id: cloneId,
    agent_id: cloneId,
    limit: Math.max(topK * 3, 6),
  });

  const items = normalizeMem0Items(payload)
    .map((item) => {
      const metadata =
        item.metadata && typeof item.metadata === "object"
          ? (item.metadata as Record<string, unknown>)
          : {};
      const text = getItemText(item).trim();
      if (!text) return null;
      return {
        fact: text,
        confidence: getItemConfidence(item),
        source_type: String(metadata.source_type || "mem0"),
        occurred_at: String(
          metadata.occurred_at || item.created_at || new Date().toISOString()
        ),
        category_key: inferCategoryKey(metadata),
        metadata,
      };
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item));

  const grouped = new Map<
    string,
    Array<{
      fact: string;
      confidence: number;
      source_type: string;
      occurred_at: string;
      category_key: string;
      metadata: Record<string, unknown>;
    }>
  >();

  for (const item of items) {
    const key = item.category_key || "general";
    const existing = grouped.get(key) || [];
    existing.push(item);
    grouped.set(key, existing);
  }

  const categories = Array.from(grouped.entries())
    .slice(0, 6)
    .map(([categoryKey, categoryItems]) => ({
      category_key: categoryKey,
      summary: categoryItems
        .slice(0, 3)
        .map((i) => i.fact)
        .join(" "),
      confidence:
        categoryItems.reduce((sum, i) => sum + i.confidence, 0) /
        categoryItems.length,
    }));

  const resources = items.slice(0, topK * 2).map((item) => ({
    source_type: item.source_type,
    title:
      typeof item.metadata.title === "string"
        ? item.metadata.title
        : undefined,
    author:
      typeof item.metadata.author === "string"
        ? item.metadata.author
        : undefined,
    occurred_at: item.occurred_at,
    content: item.fact,
  }));

  return {
    categories,
    items: items.slice(0, topK * 2).map((item) => ({
      fact: item.fact,
      confidence: item.confidence,
      source_type: item.source_type,
      occurred_at: item.occurred_at,
      category_key: item.category_key,
    })),
    chunks: [],
    resources,
  };
}
