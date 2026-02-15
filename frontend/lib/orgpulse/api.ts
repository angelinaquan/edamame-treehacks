/**
 * OrgPulse — Backend-agnostic data access layer.
 *
 * Calls real API routes (/api/orgpulse/*) for data from Supabase.
 * Falls back to mock data when the backend has no data or errors.
 *
 * Mock "streaming" is implemented with async generators that the UI
 * consumes with `for await (const event of stream)`.
 */

import type {
  InsightEvent,
  InsightsFilters,
  QueryPlan,
  OnboardingBrief,
  MemoryItem,
  HandoffPack,
  MemoryType,
  CloneProfile,
  Citation,
  Employee,
} from "./types";
import {
  ALL_TEAMS,
  employees,
  getResponsesForQuery,
  computeAggregation,
  onboardingBriefs,
  memoryItems as mockMemoryItems,
  handoffPacks,
  offboardingEmployees,
  onboardingOptions,
  cloneProfiles as mockCloneProfiles,
  cloneResponses,
  cloneFallbackResponses,
} from "./mock-data";

// ---- Helpers ----

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

// ============================================
// INSIGHTS — Streaming query (mock — needs LLM for real)
// ============================================

export async function* streamInsightsQuery(
  query: string,
  filters: InsightsFilters,
  signal?: AbortSignal
): AsyncGenerator<InsightEvent> {
  const rng = seededRandom(42);

  yield {
    type: "stage",
    stage: "planning",
    message: "Analyzing your question and identifying relevant employees…",
  };
  await delay(1200);
  if (signal?.aborted) return;

  const targetTeams =
    filters.teams.length > 0 ? filters.teams : [...ALL_TEAMS];
  const targetEmployees = employees.filter(
    (e) => filters.teams.length === 0 || filters.teams.includes(e.team)
  );

  const plan: QueryPlan = {
    question: query,
    targetTeams,
    estimatedResponses: targetEmployees.length,
    steps: [
      `Identify ${targetEmployees.length} relevant employees across ${targetTeams.length} teams`,
      "Query each employee's digital twin in parallel",
      "Aggregate stances and extract common themes",
      "Compute confidence intervals and surface evidence",
    ],
  };

  yield { type: "plan", plan };
  await delay(600);
  if (signal?.aborted) return;

  yield {
    type: "stage",
    stage: "querying",
    message: `Querying ${targetEmployees.length} employee digital twins…`,
  };
  await delay(400);

  const responses = getResponsesForQuery(query, filters);
  for (const response of responses) {
    if (signal?.aborted) return;
    const d = 280 + Math.floor(rng() * 200);
    await delay(d);
    yield { type: "employee_response", response };
  }

  await delay(600);
  if (signal?.aborted) return;

  yield {
    type: "stage",
    stage: "aggregating",
    message: "Identifying patterns and synthesizing insights…",
  };
  await delay(1000);

  const aggregation = computeAggregation(responses, filters);
  yield { type: "aggregation", data: aggregation };

  await delay(300);
  yield { type: "stage", stage: "complete", message: "Analysis complete." };
}

// ============================================
// KNOWLEDGE — Onboarding (REAL DATA from Supabase with mock fallback)
// ============================================

let _cachedOnboardingOptions: { role: string; team: string }[] | null = null;

export async function fetchOnboardingOptions(): Promise<
  { role: string; team: string }[]
> {
  try {
    const res = await fetch("/api/orgpulse/onboarding");
    if (!res.ok) throw new Error("API error");
    const data = await res.json();
    if (data.options && data.options.length > 0) {
      _cachedOnboardingOptions = data.options;
      return data.options;
    }
  } catch {
    // fall through
  }
  _cachedOnboardingOptions = onboardingOptions;
  return onboardingOptions;
}

export function getOnboardingOptions() {
  return _cachedOnboardingOptions ?? onboardingOptions;
}

export async function generateOnboardingBrief(
  role: string,
  team: string
): Promise<OnboardingBrief> {
  try {
    const res = await fetch("/api/orgpulse/onboarding", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role, team }),
    });
    if (!res.ok) throw new Error("API error");
    const data = await res.json();
    if (data.brief) return data.brief as OnboardingBrief;
  } catch {
    // fall through
  }
  // Mock fallback
  await delay(500);
  const key = `${role}-${team}`;
  return (
    onboardingBriefs[key] ?? onboardingBriefs["Senior Product Manager-AI Platform"]
  );
}

// ============================================
// KNOWLEDGE — Memory Explorer (REAL DATA from Supabase)
// ============================================

export async function searchMemories(
  query: string,
  typeFilter?: MemoryType | "all"
): Promise<MemoryItem[]> {
  try {
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (typeFilter && typeFilter !== "all") params.set("type", typeFilter);

    const res = await fetch(`/api/orgpulse/documents?${params.toString()}`);
    if (!res.ok) throw new Error("API error");

    const data = await res.json();
    const items = data.items as MemoryItem[];

    // If backend returned real data, use it
    if (items && items.length > 0) {
      return items;
    }

    // Fall back to mock data
    return searchMemoriesMock(query, typeFilter);
  } catch {
    // Backend unavailable — fall back to mock
    return searchMemoriesMock(query, typeFilter);
  }
}

function searchMemoriesMock(
  query: string,
  typeFilter?: MemoryType | "all"
): MemoryItem[] {
  const q = query.toLowerCase();
  let results = mockMemoryItems;
  if (typeFilter && typeFilter !== "all") {
    results = results.filter((m) => m.type === typeFilter);
  }
  if (q.length > 0) {
    results = results.filter(
      (m) =>
        m.title.toLowerCase().includes(q) ||
        m.content.toLowerCase().includes(q) ||
        m.tags.some((t) => t.toLowerCase().includes(q))
    );
  }
  return results.sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
}

// ============================================
// KNOWLEDGE — Offboarding (REAL DATA from Supabase with mock fallback)
// ============================================

let _cachedOffboardingEmployees: Employee[] | null = null;

export async function fetchOffboardingEmployees(): Promise<Employee[]> {
  try {
    const res = await fetch("/api/orgpulse/offboarding");
    if (!res.ok) throw new Error("API error");
    const data = await res.json();
    if (data.employees && data.employees.length > 0) {
      _cachedOffboardingEmployees = data.employees;
      return data.employees;
    }
  } catch {
    // fall through
  }
  _cachedOffboardingEmployees = offboardingEmployees;
  return offboardingEmployees;
}

export function getOffboardingEmployees() {
  return _cachedOffboardingEmployees ?? offboardingEmployees;
}

export async function generateHandoffPack(
  employeeId: string
): Promise<HandoffPack | null> {
  try {
    const res = await fetch("/api/orgpulse/offboarding", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ employeeId }),
    });
    if (!res.ok) throw new Error("API error");
    const data = await res.json();
    if (data.pack) return data.pack as HandoffPack;
  } catch {
    // fall through
  }
  // Mock fallback
  await delay(500);
  return handoffPacks[employeeId] ?? null;
}

// ============================================
// AGENT CLONES — Profiles (REAL DATA from Supabase with mock fallback)
// ============================================

let _cachedProfiles: CloneProfile[] | null = null;

export function getCloneProfiles(): CloneProfile[] {
  // Return cached if available (populated by fetchCloneProfiles)
  return _cachedProfiles ?? mockCloneProfiles;
}

/**
 * Async fetch that tries the real API first.
 * Call this once on mount; getCloneProfiles() returns the cached result.
 */
export async function fetchCloneProfiles(): Promise<CloneProfile[]> {
  try {
    const res = await fetch("/api/orgpulse/clones");
    if (!res.ok) throw new Error("API error");
    const data = await res.json();
    const profiles = data.profiles as CloneProfile[];
    if (profiles && profiles.length > 0) {
      _cachedProfiles = profiles;
      return profiles;
    }
  } catch {
    // fall through
  }
  _cachedProfiles = mockCloneProfiles;
  return mockCloneProfiles;
}

// ============================================
// AGENT CLONES — Chat (REAL OpenAI RAG with mock fallback)
// ============================================

export async function* streamCloneChat(
  employeeId: string,
  question: string,
  signal?: AbortSignal,
  history?: { role: string; content: string }[]
): AsyncGenerator<
  | { type: "chunk"; text: string }
  | { type: "citations"; citations: Citation[] }
  | { type: "done" }
> {
  // Try real API first
  try {
    const res = await fetch("/api/orgpulse/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cloneId: employeeId, question, history }),
      signal,
    });

    if (res.ok && res.body) {
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const event = JSON.parse(line.slice(6));
            if (event.type === "chunk") {
              yield { type: "chunk", text: event.text };
            } else if (event.type === "citations") {
              yield { type: "citations", citations: event.citations };
            } else if (event.type === "done") {
              yield { type: "done" };
              return;
            } else if (event.type === "error") {
              throw new Error(event.message);
            }
          } catch {
            // skip malformed lines
          }
        }
      }
      yield { type: "done" };
      return;
    }
    // Non-OK response — fall through to mock
  } catch (err) {
    if (signal?.aborted) return;
    // Fall through to mock
  }

  // ---- Mock fallback ----
  yield* streamCloneChatMock(employeeId, question, signal);
}

async function* streamCloneChatMock(
  employeeId: string,
  question: string,
  signal?: AbortSignal
): AsyncGenerator<
  | { type: "chunk"; text: string }
  | { type: "citations"; citations: Citation[] }
  | { type: "done" }
> {
  const { response, citations } = matchCloneResponse(employeeId, question);

  await delay(600 + Math.random() * 400);
  if (signal?.aborted) return;

  const words = response.split(" ");
  for (let i = 0; i < words.length; i++) {
    if (signal?.aborted) return;
    await delay(20 + Math.random() * 30);
    yield { type: "chunk", text: words[i] + (i < words.length - 1 ? " " : "") };
  }

  if (citations.length > 0) {
    await delay(200);
    yield { type: "citations", citations };
  }

  yield { type: "done" };
}

function matchCloneResponse(
  employeeId: string,
  question: string
): { response: string; citations: Citation[] } {
  const responses = cloneResponses[employeeId];
  if (responses) {
    const q = question.toLowerCase();
    for (const entry of responses) {
      if (entry.keywords.some((kw) => q.includes(kw))) {
        return { response: entry.response, citations: entry.citations };
      }
    }
  }
  const fallback =
    cloneFallbackResponses[employeeId] ??
    "That's a great question. Let me think about it from my perspective and experience. Could you be more specific about what aspect you'd like me to address?";
  return { response: fallback, citations: [] };
}
