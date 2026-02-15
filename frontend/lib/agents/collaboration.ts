import type { Clone, CloneConsultation } from "@/lib/core/types";
import type { ChatCompletionTool } from "openai/resources/chat/completions";
import { mockClones } from "@backend/memory/mock-data";
import { buildSystemPrompt } from "./clone-brain";
import { getCloneRuntime, listClonesForApi } from "@backend/memory/clone-repository";
import { getKnowledgeContext } from "@backend/memory";
import getOpenAIClient from "./openai";

const MAX_HOPS = 2;
const MAX_CONSULTS_PER_QUESTION = 3;
const CONSULTATION_TIMEOUT_MS = 20000;

// ---------------------------------------------------------------------------
// OpenAI function-calling tool definition
// ---------------------------------------------------------------------------

export const CONSULT_CLONE_TOOL: ChatCompletionTool = {
  type: "function",
  function: {
    name: "consult_clone",
    description:
      "Consult another team member's AI clone when you don't have enough information to answer a question. " +
      "Use this when the question is about a topic outside your expertise, about another person's work, " +
      "projects, or decisions, or when you're unsure and another colleague might know.",
    parameters: {
      type: "object",
      properties: {
        topic: {
          type: "string",
          description:
            "The specific topic or question to ask the other clone. Be precise so they can give a useful answer.",
        },
        clone_name: {
          type: "string",
          description:
            "Optional: the name of the specific person whose clone to consult. " +
            "If omitted, the system will route to the most relevant clone based on the topic.",
        },
      },
      required: ["topic"],
    },
  },
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ConsultationRequest {
  callerCloneId: string;
  targetCloneName: string;
  query: string;
  depth: number;
  conversationId: string;
}

// ---------------------------------------------------------------------------
// Clone discovery
// ---------------------------------------------------------------------------

export async function listConsultableClones(
  callerCloneId: string
): Promise<Clone[]> {
  try {
    const clones = (await listClonesForApi()) as Clone[];
    const filtered = clones.filter(
      (clone) => clone.id !== callerCloneId && clone.status === "active"
    );
    if (filtered.length > 0) return filtered;
  } catch (error) {
    console.warn("Falling back to mock consultable clones:", error);
  }
  return mockClones.filter(
    (clone) => clone.id !== callerCloneId && clone.status === "active"
  );
}

/**
 * Score each clone's relevance to a topic using expertise tag overlap
 * and name matching. Returns clones sorted by score descending.
 */
function scoreCloneRelevance(
  topic: string,
  excludeCloneId: string,
  clones: Clone[]
): { clone: Clone; score: number }[] {
  const topicWords = topic.toLowerCase().split(/\s+/);

  return clones
    .filter((c) => c.id !== excludeCloneId && c.status === "active")
    .map((c) => {
      let score = 0;

      // Tag matching: each matching tag adds a point
      for (const tag of c.expertise_tags) {
        const tagLower = tag.toLowerCase();
        if (topic.toLowerCase().includes(tagLower)) {
          score += 2;
        } else if (topicWords.some((w) => tagLower.includes(w) || w.includes(tagLower))) {
          score += 1;
        }
      }

      // Role/department matching
      if (c.owner_role && topic.toLowerCase().includes(c.owner_role.toLowerCase())) {
        score += 1;
      }
      if (c.owner_department && topic.toLowerCase().includes(c.owner_department.toLowerCase())) {
        score += 1;
      }

      // Name mentioned explicitly
      const firstName = c.name.split(" ")[0].toLowerCase();
      if (topic.toLowerCase().includes(firstName)) {
        score += 5;
      }

      return { clone: c, score };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score);
}

export function findCloneByExpertise(
  topic: string,
  excludeCloneId: string,
  clones: Clone[] = mockClones
): Clone | null {
  const ranked = scoreCloneRelevance(topic, excludeCloneId, clones);
  return ranked.length > 0 ? ranked[0].clone : null;
}

export function findCloneByName(
  name: string,
  clones: Clone[] = mockClones
): Clone | null {
  const nameLower = name.toLowerCase();
  return (
    clones.find(
      (c) =>
        c.name.toLowerCase().includes(nameLower) ||
        nameLower.includes(c.name.toLowerCase().split(" ")[0])
    ) || null
  );
}

// ---------------------------------------------------------------------------
// Guard: hop / count limits
// ---------------------------------------------------------------------------

export function canConsult(
  depth: number,
  consultCount: number
): { allowed: boolean; reason?: string } {
  if (depth >= MAX_HOPS) {
    return {
      allowed: false,
      reason: `Maximum consultation depth (${MAX_HOPS}) reached`,
    };
  }
  if (consultCount >= MAX_CONSULTS_PER_QUESTION) {
    return {
      allowed: false,
      reason: `Maximum consultations (${MAX_CONSULTS_PER_QUESTION}) per question reached`,
    };
  }
  return { allowed: true };
}

// ---------------------------------------------------------------------------
// Main consultation entry point
// ---------------------------------------------------------------------------

export async function consultClone(
  request: ConsultationRequest
): Promise<CloneConsultation> {
  const startTime = Date.now();
  const consultableClones = await listConsultableClones(request.callerCloneId);

  // Resolve target: by name first, then by expertise/topic routing
  const targetClone =
    (request.targetCloneName
      ? findCloneByName(request.targetCloneName, consultableClones)
      : null) ||
    findCloneByExpertise(request.query, request.callerCloneId, consultableClones);

  if (!targetClone) {
    return {
      target_clone_id: "unknown",
      target_clone_name: request.targetCloneName || "unknown",
      query: request.query,
      response: `I couldn't find a relevant clone to consult about "${request.query}".`,
      latency_ms: Date.now() - startTime,
    };
  }

  try {
    const response = (await Promise.race([
      generateConsultationResponse(targetClone, request.query),
      new Promise<string>((_, reject) =>
        setTimeout(
          () => reject(new Error("Consultation timeout")),
          CONSULTATION_TIMEOUT_MS
        )
      ),
    ])) as string;

    return {
      target_clone_id: targetClone.id,
      target_clone_name: targetClone.name,
      query: request.query,
      response,
      latency_ms: Date.now() - startTime,
    };
  } catch {
    return {
      target_clone_id: targetClone.id,
      target_clone_name: targetClone.name,
      query: request.query,
      response: `${targetClone.name}'s clone didn't respond in time. Based on what I know, I'll provide what context I can.`,
      latency_ms: Date.now() - startTime,
    };
  }
}

// ---------------------------------------------------------------------------
// Real LLM-powered consultation response
// ---------------------------------------------------------------------------

async function generateConsultationResponse(
  clone: Clone,
  query: string
): Promise<string> {
  // 1. Load the target clone's runtime and knowledge context
  const runtime = await getCloneRuntime(clone.id);
  const knowledge = await getKnowledgeContext(clone.id, query, 5);

  // 2. Build a full system prompt for the target clone (same quality as primary)
  const systemPrompt = buildSystemPrompt(
    clone,
    knowledge
      ? {
          owner: runtime.owner,
          memories: knowledge.items
            .slice(0, 8)
            .map(
              (item) =>
                `- ${item.fact} (confidence: ${item.confidence.toFixed(2)}, source: ${item.source_type})`
            ),
          slackMessages: knowledge.resources
            .filter((r) => r.source_type === "slack")
            .slice(0, 5)
            .map((r) => `[slack] ${r.title || "message"}: ${r.content}`),
          categorySummaries: knowledge.categories.map(
            (cat) =>
              `- ${cat.category_key}: ${cat.summary} (confidence: ${cat.confidence.toFixed(2)})`
          ),
          itemFacts: knowledge.items.slice(0, 8).map((item) => `- ${item.fact}`),
          resourceHighlights: knowledge.resources
            .filter((r) => r.source_type !== "slack")
            .slice(0, 4)
            .map((r) => `- [${r.source_type}] ${r.title || "resource"}: ${r.content}`),
        }
      : { owner: runtime.owner }
  );

  // 3. Call OpenAI with the target clone's persona and context
  const openai = getOpenAIClient();

  const completion = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: systemPrompt },
      {
        role: "user",
        content:
          `A colleague's AI clone is asking you the following question on behalf of their owner. ` +
          `Answer concisely and specifically based on your knowledge. If you don't know, say so.\n\n` +
          `Question: ${query}`,
      },
    ],
    temperature: 0.6,
    max_tokens: 800,
  });

  return (
    completion.choices[0]?.message?.content?.trim() ||
    `As ${clone.name}, I don't have specific information about that topic right now.`
  );
}
