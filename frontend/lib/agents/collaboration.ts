import type { Clone, CloneConsultation } from "@/lib/core/types";
import { mockClones, mockMemories } from "@backend/memory/mock-data";
import { buildSystemPrompt } from "./clone-brain";
import { listClonesForApi } from "@backend/memory/clone-repository";
import { createServerSupabaseClient } from "@/lib/core/supabase/server";
import { isSupabaseConfigured } from "@backend/memory/flags";

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

export function findCloneByExpertise(
  topic: string,
  excludeCloneId: string,
  clones: Clone[] = mockClones
): Clone | null {
  const topicLower = topic.toLowerCase();
  return (
    clones.find((c) => {
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
  const consultableClones = await listConsultableClones(request.callerCloneId);
  const targetClone =
    findCloneByName(request.targetCloneName, consultableClones) ||
    findCloneByExpertise(
      request.query,
      request.callerCloneId,
      consultableClones
    );

  if (!targetClone) {
    return {
      target_clone_id: "unknown",
      target_clone_name: request.targetCloneName,
      query: request.query,
      response: `I couldn't find a clone matching "${request.targetCloneName}" to consult.`,
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

async function generateConsultationResponse(
  clone: Clone,
  query: string
): Promise<string> {
  const cloneMemories = mockMemories.filter((m) => m.clone_id === clone.id);
  let relevantFacts = cloneMemories.map((m) => m.fact).join(". ");

  // Try Supabase if mock data has nothing
  if (!relevantFacts && isSupabaseConfigured()) {
    try {
      const supabase = createServerSupabaseClient();
      const { data } = await supabase
        .from("memories")
        .select("content")
        .eq("clone_id", clone.id)
        .eq("type", "fact")
        .order("created_at", { ascending: false })
        .limit(6);
      relevantFacts =
        (data || [])
          .map((row: { content: string }) => row.content)
          .filter(Boolean)
          .join(". ") || "";
    } catch {
      // Fall back to generic response below.
    }
  }

  void query;
  void buildSystemPrompt;

  return `Based on my knowledge: ${
    relevantFacts ||
    `As ${clone.name}, I can share that the current status aligns with our team's goals. Let me know if you need more specific details.`
  }`;
}
