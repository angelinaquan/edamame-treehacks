/**
 * OrgPulse — Backend-agnostic data access layer.
 *
 * All data fetching is isolated here so swapping to a real backend
 * (REST / GraphQL / SSE / WebSocket) requires changes only in this file.
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
} from "./types";
import {
  ALL_TEAMS,
  employees,
  getResponsesForQuery,
  computeAggregation,
  onboardingBriefs,
  memoryItems,
  handoffPacks,
  offboardingEmployees,
  onboardingOptions,
  cloneProfiles,
  cloneResponses,
  cloneFallbackResponses,
} from "./mock-data";

// ---- Helpers ----

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Seeded PRNG for deterministic demo behaviour
function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

// ============================================
// INSIGHTS — Streaming query
// ============================================

export async function* streamInsightsQuery(
  query: string,
  filters: InsightsFilters,
  signal?: AbortSignal
): AsyncGenerator<InsightEvent> {
  const rng = seededRandom(42);

  // ---- Stage 1: Planning ----
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

  // ---- Stage 2: Querying employees ----
  yield {
    type: "stage",
    stage: "querying",
    message: `Querying ${targetEmployees.length} employee digital twins…`,
  };
  await delay(400);

  const responses = getResponsesForQuery(query, filters);

  for (const response of responses) {
    if (signal?.aborted) return;
    // Deterministic-ish delay: 280–480ms per card
    const d = 280 + Math.floor(rng() * 200);
    await delay(d);
    yield { type: "employee_response", response };
  }

  await delay(600);
  if (signal?.aborted) return;

  // ---- Stage 3: Aggregating ----
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
// KNOWLEDGE — Onboarding
// ============================================

export function getOnboardingOptions() {
  return onboardingOptions;
}

export async function generateOnboardingBrief(
  role: string,
  team: string
): Promise<OnboardingBrief> {
  // Simulate brief generation latency
  await delay(1500);
  const key = `${role}-${team}`;
  return (
    onboardingBriefs[key] ?? onboardingBriefs["Senior Product Manager-AI Platform"]
  );
}

// ============================================
// KNOWLEDGE — Memory explorer
// ============================================

export async function searchMemories(
  query: string,
  typeFilter?: MemoryType | "all"
): Promise<MemoryItem[]> {
  await delay(400);
  const q = query.toLowerCase();
  let results = memoryItems;

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
// KNOWLEDGE — Offboarding
// ============================================

export function getOffboardingEmployees() {
  return offboardingEmployees;
}

export async function generateHandoffPack(
  employeeId: string
): Promise<HandoffPack | null> {
  await delay(1200);
  return handoffPacks[employeeId] ?? null;
}

// ============================================
// AGENT CLONES — Individual chat
// ============================================

export function getCloneProfiles(): CloneProfile[] {
  return cloneProfiles;
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
  const fallback = cloneFallbackResponses[employeeId] ??
    "That's a great question. Let me think about it from my perspective and experience at Meridian. Could you be more specific about what aspect you'd like me to address?";
  return { response: fallback, citations: [] };
}

export async function* streamCloneChat(
  employeeId: string,
  question: string,
  signal?: AbortSignal
): AsyncGenerator<{ type: "chunk"; text: string } | { type: "citations"; citations: Citation[] } | { type: "done" }> {
  const { response, citations } = matchCloneResponse(employeeId, question);

  // Simulate "thinking" delay
  await delay(600 + Math.random() * 400);
  if (signal?.aborted) return;

  // Stream word-by-word
  const words = response.split(" ");
  for (let i = 0; i < words.length; i++) {
    if (signal?.aborted) return;
    const d = 20 + Math.random() * 30;
    await delay(d);
    yield { type: "chunk", text: words[i] + (i < words.length - 1 ? " " : "") };
  }

  // Yield citations at the end
  if (citations.length > 0) {
    await delay(200);
    yield { type: "citations", citations };
  }

  yield { type: "done" };
}
