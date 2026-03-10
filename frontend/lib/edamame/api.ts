/**
 * Edamame — Backend data access layer.
 *
 * Calls real API routes (/api/edamame/*) for data from Supabase.
 * No mock fallbacks — requires a working backend.
 */

import type {
  InsightEvent,
  InsightsFilters,
  OnboardingBrief,
  MemoryItem,
  HandoffPack,
  MemoryType,
  CloneProfile,
  Citation,
  Employee,
} from "./types";

// ---- Helpers ----

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ============================================
// INSIGHTS — Streaming query
// ============================================

export async function* streamInsightsQuery(
  query: string,
  filters: InsightsFilters,
  signal?: AbortSignal
): AsyncGenerator<InsightEvent> {
  const res = await fetch("/api/edamame/insights", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question: query, filters }),
    signal,
  });

  if (!res.ok || !res.body) {
    yield { type: "stage", stage: "complete", message: "Analysis failed. Check backend connection." };
    return;
  }

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
        if (event.type === "stage") {
          yield { type: "stage", stage: event.stage, message: event.message };
        } else if (event.type === "plan") {
          if (event.plan?.availableTeams) {
            _cachedAvailableTeams = event.plan.availableTeams;
          }
          yield { type: "plan", plan: event.plan };
        } else if (event.type === "employee_response") {
          yield { type: "employee_response", response: event.response };
        } else if (event.type === "aggregation") {
          if (event.data?.availableTeams) {
            _cachedAvailableTeams = event.data.availableTeams;
          }
          yield { type: "aggregation", data: event.data };
        } else if (event.type === "error") {
          throw new Error(event.message);
        }
      } catch (parseErr) {
        if (parseErr instanceof Error && parseErr.message) {
          throw parseErr;
        }
      }
    }
  }
}

// ============================================
// INSIGHTS — Available teams
// ============================================

let _cachedAvailableTeams: string[] | null = null;

/**
 * Returns available teams for the insights filter UI.
 * Uses teams from the last real API response.
 */
export function getAvailableTeams(): string[] {
  return _cachedAvailableTeams ?? [];
}

// ============================================
// KNOWLEDGE — Onboarding
// ============================================

let _cachedOnboardingOptions: { role: string; team: string }[] | null = null;

export async function fetchOnboardingOptions(): Promise<
  { role: string; team: string }[]
> {
  try {
    const res = await fetch("/api/edamame/onboarding");
    if (!res.ok) throw new Error("API error");
    const data = await res.json();
    if (data.options && data.options.length > 0) {
      _cachedOnboardingOptions = data.options;
      return data.options;
    }
  } catch {
    // API unavailable
  }
  return _cachedOnboardingOptions ?? [];
}

export function getOnboardingOptions() {
  return _cachedOnboardingOptions ?? [];
}

export async function generateOnboardingBrief(
  role: string,
  team: string
): Promise<OnboardingBrief> {
  const res = await fetch("/api/edamame/onboarding", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ role, team }),
  });
  if (!res.ok) throw new Error("Failed to generate onboarding brief");
  const data = await res.json();
  if (data.brief) return data.brief as OnboardingBrief;
  throw new Error("No brief returned");
}

// ============================================
// KNOWLEDGE — Memory Explorer
// ============================================

export async function searchMemories(
  query: string,
  typeFilter?: MemoryType | "all"
): Promise<MemoryItem[]> {
  try {
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (typeFilter && typeFilter !== "all") params.set("type", typeFilter);

    const res = await fetch(`/api/edamame/documents?${params.toString()}`);
    if (!res.ok) throw new Error("API error");

    const data = await res.json();
    const items = data.items as MemoryItem[];
    return items ?? [];
  } catch {
    return [];
  }
}

// ============================================
// KNOWLEDGE — Offboarding
// ============================================

let _cachedOffboardingEmployees: Employee[] | null = null;

export async function fetchOffboardingEmployees(): Promise<Employee[]> {
  try {
    const res = await fetch("/api/edamame/offboarding");
    if (!res.ok) throw new Error("API error");
    const data = await res.json();
    if (data.employees && data.employees.length > 0) {
      _cachedOffboardingEmployees = data.employees;
      return data.employees;
    }
  } catch {
    // API unavailable
  }
  return _cachedOffboardingEmployees ?? [];
}

export function getOffboardingEmployees() {
  return _cachedOffboardingEmployees ?? [];
}

export async function generateHandoffPack(
  employeeId: string
): Promise<HandoffPack | null> {
  try {
    const res = await fetch("/api/edamame/offboarding", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ employeeId }),
    });
    if (!res.ok) throw new Error("API error");
    const data = await res.json();
    if (data.pack) return data.pack as HandoffPack;
  } catch {
    // API unavailable
  }
  return null;
}

// ============================================
// AGENT CLONES — Profiles
// ============================================

let _cachedProfiles: CloneProfile[] | null = null;

export function getCloneProfiles(): CloneProfile[] {
  return _cachedProfiles ?? [];
}

/**
 * Async fetch that tries the real API.
 * Call this once on mount; getCloneProfiles() returns the cached result.
 */
export async function fetchCloneProfiles(): Promise<CloneProfile[]> {
  try {
    const res = await fetch("/api/edamame/clones");
    if (!res.ok) throw new Error("API error");
    const data = await res.json();
    const profiles = data.profiles as CloneProfile[];
    if (profiles && profiles.length > 0) {
      _cachedProfiles = profiles;
      return profiles;
    }
  } catch {
    // API unavailable
  }
  return _cachedProfiles ?? [];
}

// ============================================
// AGENT CLONES — Chat
// ============================================

export async function* streamCloneChat(
  employeeId: string,
  question: string,
  signal?: AbortSignal,
  history?: { role: string; content: string }[]
): AsyncGenerator<
  | { type: "chunk"; text: string }
  | { type: "citations"; citations: Citation[] }
  | { type: "learning"; learning: { factsExtracted: number; factsSaved: number; factsReinforced: number } }
  | { type: "done" }
> {
  const res = await fetch("/api/edamame/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ cloneId: employeeId, question, history }),
    signal,
  });

  if (!res.ok || !res.body) {
    yield { type: "chunk", text: "Failed to connect to clone. Please check your backend connection." };
    yield { type: "done" };
    return;
  }

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
        } else if (event.type === "learning") {
          yield { type: "learning", learning: event.learning };
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
}
