import type { Clone, CloneConsultation } from "@/lib/core/types";
import { mockClones, mockMemories } from "@/lib/memory/mock-data";
import { buildSystemPrompt } from "./clone-brain";

const MAX_HOPS = 2;
const MAX_CONSULTS_PER_QUESTION = 3;
const CONSULTATION_TIMEOUT_MS = 15000;

export interface ConsultationRequest {
  callerCloneId: string;
  targetCloneName: string;
  query: string;
  depth: number;
  conversationId: string;
}

export function findCloneByExpertise(
  topic: string,
  excludeCloneId: string
): Clone | null {
  const topicLower = topic.toLowerCase();
  return (
    mockClones.find((c) => {
      if (c.id === excludeCloneId) return false;
      if (c.status !== "active") return false;
      const tagMatch = c.expertise_tags.some((tag) =>
        topicLower.includes(tag.toLowerCase())
      );
      const nameMatch = c.name.toLowerCase().includes(topicLower);
      return tagMatch || nameMatch;
    }) || null
  );
}

export function findCloneByName(name: string): Clone | null {
  const nameLower = name.toLowerCase();
  return (
    mockClones.find(
      (c) =>
        c.name.toLowerCase().includes(nameLower) ||
        nameLower.includes(c.name.toLowerCase().split(" ")[0])
    ) || null
  );
}

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

export async function consultClone(
  request: ConsultationRequest
): Promise<CloneConsultation> {
  const startTime = Date.now();
  const targetClone =
    findCloneByName(request.targetCloneName) ||
    findCloneByExpertise(request.query, request.callerCloneId);

  if (!targetClone) {
    return {
      target_clone_id: "unknown",
      target_clone_name: request.targetCloneName,
      query: request.query,
      response: `I couldn't find a clone matching "${request.targetCloneName}" to consult.`,
      latency_ms: Date.now() - startTime,
    };
  }

  // In production, this calls the clone's brain on Modal
  // For demo, use mock data to generate a contextual response
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

async function generateConsultationResponse(
  clone: Clone,
  query: string
): Promise<string> {
  const cloneMemories = mockMemories.filter((m) => m.clone_id === clone.id);
  const relevantFacts = cloneMemories.map((m) => m.fact).join(". ");

  return `Based on my knowledge: ${
    relevantFacts ||
    `As ${clone.name}, I can share that the current status aligns with our team's goals. Let me know if you need more specific details.`
  }`;
}

// Suppress unused variable warning - buildSystemPrompt is used in production path
void buildSystemPrompt;
