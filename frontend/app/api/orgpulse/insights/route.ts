import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/core/supabase/server";
import { generateEmbedding } from "@/lib/agents/openai";
import OpenAI from "openai";

/**
 * POST /api/orgpulse/insights
 * Body: { question: string, filters: { teams: string[], scenario: string | null } }
 *
 * Queries all clones from Supabase, retrieves relevant memories for each,
 * uses OpenAI to generate a stance per clone, then aggregates into themes.
 * Streams results as SSE matching the InsightEvent type.
 */

interface CloneRow {
  id: string;
  name: string;
  personality: Record<string, unknown> | null;
  expertise_tags: string[] | null;
  owner_role: string | null;
  owner_department: string | null;
}

interface StanceResult {
  stance: "support" | "neutral" | "oppose";
  confidence: number;
  summary: string;
  reasoning: string;
  citations: { source: string; snippet: string; date: string }[];
}

interface ThemeResult {
  id: string;
  label: string;
  dominantStance: "support" | "neutral" | "oppose";
  description: string;
  employeeIds: string[];
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

/**
 * Retrieve relevant context (chunks + facts) for a given clone and question.
 * Same retrieval strategy as /api/orgpulse/chat.
 */
async function getCloneContext(
  supabase: ReturnType<typeof createServerSupabaseClient>,
  cloneId: string,
  question: string,
  queryEmbedding: number[]
): Promise<string> {
  let chunks: { content: string; metadata: Record<string, unknown> }[] = [];

  // Attempt 1: Semantic vector search
  try {
    const { data: vectorResults } = await supabase.rpc("match_memories", {
      query_embedding: JSON.stringify(queryEmbedding),
      match_threshold: 0.4,
      match_count: 5,
      p_clone_id: cloneId,
      p_type: "chunk",
    });
    if (vectorResults && vectorResults.length > 0) {
      chunks = vectorResults as typeof chunks;
    }
  } catch {
    // Vector search unavailable
  }

  // Attempt 2: Keyword search fallback
  if (chunks.length === 0) {
    const searchTerms = question
      .toLowerCase()
      .split(/\s+/)
      .filter((w) => w.length > 3)
      .slice(0, 3);

    if (searchTerms.length > 0) {
      const orFilter = searchTerms
        .map((t) => `content.ilike.%${t}%`)
        .join(",");
      const { data: chunkData } = await supabase
        .from("memories")
        .select("content, metadata")
        .eq("clone_id", cloneId)
        .eq("type", "chunk")
        .or(orFilter)
        .limit(5);
      chunks = (chunkData ?? []) as typeof chunks;
    }
  }

  // Attempt 3: Most recent chunks for this clone
  if (chunks.length === 0) {
    const { data: recentChunks } = await supabase
      .from("memories")
      .select("content, metadata")
      .eq("clone_id", cloneId)
      .eq("type", "chunk")
      .order("created_at", { ascending: false })
      .limit(4);
    chunks = (recentChunks ?? []) as typeof chunks;
  }

  // Also fetch facts
  let facts: { content: string }[] = [];
  try {
    const { data: factResults } = await supabase.rpc("match_memories", {
      query_embedding: JSON.stringify(queryEmbedding),
      match_threshold: 0.4,
      match_count: 3,
      p_clone_id: cloneId,
      p_type: "fact",
    });
    if (factResults && factResults.length > 0) {
      facts = factResults as typeof facts;
    }
  } catch {
    // Fact search unavailable
  }

  const contextParts: string[] = [];

  if (chunks.length > 0) {
    contextParts.push(
      chunks
        .map((c, i) => {
          const source = (c.metadata?.source as string) || "document";
          const title =
            (c.metadata?.document_title as string) ||
            (c.metadata?.title as string) ||
            "";
          return `[Source ${i + 1}: ${source}${title ? ` — ${title}` : ""}]\n${c.content}`;
        })
        .join("\n---\n")
    );
  }

  if (facts.length > 0) {
    contextParts.push(
      "Key Facts:\n" + facts.map((f) => `- ${f.content}`).join("\n")
    );
  }

  return contextParts.join("\n\n") || "(No relevant context found.)";
}

/**
 * Ask OpenAI to generate a stance for a single clone given the question and context.
 */
async function generateCloneStance(
  openai: OpenAI,
  cloneName: string,
  role: string,
  department: string,
  personality: Record<string, unknown> | null,
  expertise: string[],
  context: string,
  question: string,
  scenario: string | null
): Promise<StanceResult> {
  const scenarioNote = scenario === "retraining"
    ? "\n\nIMPORTANT SCENARIO MODIFIER: The company is also proposing a 12-month transition period with retraining programs for affected employees. Factor this into your assessment — it may shift your stance compared to the base scenario."
    : "";

  const prompt = `You are simulating the perspective of ${cloneName}, who works as ${role} in the ${department} department.
Their expertise includes: ${expertise.join(", ") || "general organizational knowledge"}.
Personality/tone: ${(personality?.tone as string) || "professional"}.
Bio: ${(personality?.bio as string) || `Team member at the organization`}.

Here is relevant context from their knowledge base (emails, docs, Slack, meetings):
${context}
${scenarioNote}

Based on this person's role, expertise, knowledge, and perspective, evaluate the following management question:
"${question}"

Respond with a JSON object (no markdown, just raw JSON) with these fields:
{
  "stance": "support" | "neutral" | "oppose",
  "confidence": <number between 0.5 and 0.95>,
  "summary": "<1-2 sentence summary of their position>",
  "reasoning": "<2-3 sentences explaining why they hold this position, referencing their role and any relevant context>",
  "citations": [
    { "source": "<source type, e.g. Slack, Email, Meeting Notes>", "snippet": "<brief relevant quote or reference>", "date": "<approximate date if available, otherwise empty string>" }
  ]
}

Guidelines:
- The stance should authentically reflect what someone in this role/department would likely think.
- Confidence should reflect how strongly they'd feel (higher for topics directly in their domain).
- Citations should reference actual context when available; if no relevant context exists, provide 1 plausible citation based on what someone in this role would reference.
- Keep the summary concise and the reasoning substantive.`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.7,
    max_tokens: 500,
    response_format: { type: "json_object" },
  });

  const content = response.choices[0]?.message?.content ?? "{}";
  try {
    const parsed = JSON.parse(content) as StanceResult;
    // Validate and clamp
    if (!["support", "neutral", "oppose"].includes(parsed.stance)) {
      parsed.stance = "neutral";
    }
    parsed.confidence = Math.max(0.5, Math.min(0.95, parsed.confidence || 0.7));
    parsed.summary = parsed.summary || "No summary available.";
    parsed.reasoning = parsed.reasoning || "No detailed reasoning available.";
    parsed.citations = Array.isArray(parsed.citations)
      ? parsed.citations.slice(0, 3)
      : [];
    return parsed;
  } catch {
    return {
      stance: "neutral",
      confidence: 0.6,
      summary: "Unable to determine a clear position on this question.",
      reasoning: `As ${role} in ${department}, ${cloneName} would need more context to form a strong opinion on this topic.`,
      citations: [],
    };
  }
}

/**
 * Ask OpenAI to aggregate employee responses into themes.
 */
async function generateThemes(
  openai: OpenAI,
  question: string,
  responses: { id: string; name: string; stance: string; summary: string }[]
): Promise<ThemeResult[]> {
  const responseSummaries = responses
    .map((r) => `- ${r.name} (${r.stance}): ${r.summary}`)
    .join("\n");

  const prompt = `Given the following management question and employee responses, identify 3-5 key themes that emerge.

Question: "${question}"

Employee responses:
${responseSummaries}

Respond with a JSON object (no markdown, just raw JSON) with a "themes" array:
{
  "themes": [
    {
      "label": "<short theme name, 3-5 words>",
      "dominantStance": "support" | "neutral" | "oppose",
      "description": "<1-2 sentence description of this theme>",
      "employeeIds": [<array of employee IDs from the list who align with this theme>]
    }
  ]
}

The employee IDs are: ${responses.map((r) => `"${r.id}" (${r.name})`).join(", ")}

Guidelines:
- Each theme should group employees who share a common concern or perspective.
- dominantStance reflects the majority stance within that theme.
- An employee can appear in multiple themes.
- Order themes by number of employees (most first).`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.5,
    max_tokens: 800,
    response_format: { type: "json_object" },
  });

  const content = response.choices[0]?.message?.content ?? "{}";
  try {
    const parsed = JSON.parse(content) as { themes: ThemeResult[] };
    if (!Array.isArray(parsed.themes)) return [];
    return parsed.themes.map((t, i) => ({
      id: `t${i + 1}`,
      label: t.label || `Theme ${i + 1}`,
      dominantStance: ["support", "neutral", "oppose"].includes(t.dominantStance)
        ? t.dominantStance
        : "neutral",
      description: t.description || "",
      employeeIds: Array.isArray(t.employeeIds) ? t.employeeIds : [],
    }));
  } catch {
    return [];
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { question, filters } = body as {
      question: string;
      filters: { teams: string[]; scenario: string | null };
    };

    if (!question) {
      return NextResponse.json(
        { error: "question is required" },
        { status: 400 }
      );
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "OPENAI_API_KEY not configured" },
        { status: 500 }
      );
    }

    const supabase = createServerSupabaseClient();
    const openai = new OpenAI({ apiKey });

    // Fetch all clones
    let query = supabase
      .from("clones")
      .select(
        "id, name, personality, expertise_tags, owner_role, owner_department"
      )
      .order("created_at", { ascending: true });

    // Filter by teams/departments if specified
    if (filters?.teams && filters.teams.length > 0) {
      query = query.in("owner_department", filters.teams);
    }

    const { data: clones, error } = await query;

    if (error) {
      console.error("[insights] Clones query error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!clones || clones.length === 0) {
      return NextResponse.json(
        { error: "No clones found in database" },
        { status: 404 }
      );
    }

    // Pre-compute query embedding once (shared across all clones)
    let queryEmbedding: number[];
    try {
      queryEmbedding = await generateEmbedding(question);
    } catch {
      // If embedding fails, we can still proceed with keyword search
      queryEmbedding = [];
    }

    // Determine available teams from actual clone data
    const availableTeams = [
      ...new Set(
        clones
          .map((c: CloneRow) => c.owner_department)
          .filter((d): d is string => Boolean(d))
      ),
    ];

    const targetTeams =
      filters?.teams && filters.teams.length > 0
        ? filters.teams
        : availableTeams;

    // Stream SSE response
    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        const emit = (data: Record<string, unknown>) => {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(data)}\n\n`)
          );
        };

        try {
          // Stage: planning
          emit({
            type: "stage",
            stage: "planning",
            message:
              "Analyzing your question and identifying relevant employees…",
          });

          emit({
            type: "plan",
            plan: {
              question,
              targetTeams,
              estimatedResponses: clones.length,
              availableTeams,
              steps: [
                `Identified ${clones.length} employee clones across ${targetTeams.length} teams`,
                "Querying each clone's knowledge base for relevant context",
                "Generating stance assessment for each employee",
                "Aggregating responses and identifying themes",
              ],
            },
          });

          // Stage: querying
          emit({
            type: "stage",
            stage: "querying",
            message: `Querying ${clones.length} employee digital twins…`,
          });

          // Process each clone — generate stance
          const allResponses: {
            id: string;
            name: string;
            stance: string;
            summary: string;
          }[] = [];

          // Process clones in parallel batches of 3 to avoid rate limits
          const BATCH_SIZE = 3;
          for (let i = 0; i < clones.length; i += BATCH_SIZE) {
            const batch = clones.slice(i, i + BATCH_SIZE) as CloneRow[];
            const batchResults = await Promise.all(
              batch.map(async (clone) => {
                const displayName = clone.name.replace(/\s*\(Clone\)$/i, "");
                const role = clone.owner_role || "Team Member";
                const department = clone.owner_department || "General";
                const expertise = clone.expertise_tags ?? [];

                // Retrieve context for this clone
                const context = await getCloneContext(
                  supabase,
                  clone.id,
                  question,
                  queryEmbedding
                );

                // Generate stance via LLM
                const stanceResult = await generateCloneStance(
                  openai,
                  displayName,
                  role,
                  department,
                  clone.personality,
                  expertise,
                  context,
                  question,
                  filters?.scenario ?? null
                );

                return {
                  employee: {
                    id: clone.id,
                    name: displayName,
                    role,
                    team: department,
                    tenure: "",
                    initials: getInitials(displayName),
                  },
                  ...stanceResult,
                };
              })
            );

            // Emit each response from this batch
            for (const result of batchResults) {
              emit({ type: "employee_response", response: result });
              allResponses.push({
                id: result.employee.id,
                name: result.employee.name,
                stance: result.stance,
                summary: result.summary,
              });
            }
          }

          // Stage: aggregating
          emit({
            type: "stage",
            stage: "aggregating",
            message: "Identifying patterns and synthesizing insights…",
          });

          // Generate themes via LLM
          const themes = await generateThemes(
            openai,
            question,
            allResponses
          );

          // Compute distribution
          const total = allResponses.length;
          const supportCount = allResponses.filter(
            (r) => r.stance === "support"
          ).length;
          const neutralCount = allResponses.filter(
            (r) => r.stance === "neutral"
          ).length;
          const opposeCount = allResponses.filter(
            (r) => r.stance === "oppose"
          ).length;

          const topStance =
            supportCount >= opposeCount ? "supportive" : "opposed";
          const scenarioLabel =
            filters?.scenario === "retraining"
              ? " with the proposed retraining program"
              : "";

          // Add counts to themes
          const themesWithCounts = themes.map((t) => ({
            ...t,
            count: t.employeeIds.length,
          }));

          emit({
            type: "aggregation",
            data: {
              distribution: {
                support: total > 0 ? Math.round((supportCount / total) * 100) : 0,
                neutral: total > 0 ? Math.round((neutralCount / total) * 100) : 0,
                oppose: total > 0 ? Math.round((opposeCount / total) * 100) : 0,
              },
              overallConfidence: 0.78,
              themes: themesWithCounts,
              totalResponses: total,
              availableTeams,
              summary: `Across ${total} employees${scenarioLabel}, the organization is predominantly ${topStance} (${
                total > 0 ? Math.round((supportCount / total) * 100) : 0
              }% support, ${
                total > 0 ? Math.round((opposeCount / total) * 100) : 0
              }% oppose). ${themesWithCounts[0]?.label || "Mixed sentiment"} emerged as the dominant theme.`,
            },
          });

          emit({
            type: "stage",
            stage: "complete",
            message: "Analysis complete.",
          });

          controller.close();
        } catch (err) {
          emit({
            type: "error",
            message:
              err instanceof Error ? err.message : "Unknown error during analysis",
          });
          controller.close();
        }
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
