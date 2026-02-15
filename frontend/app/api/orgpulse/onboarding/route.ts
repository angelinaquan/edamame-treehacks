import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/core/supabase/server";
import type { OnboardingBrief } from "@/lib/orgpulse/types";

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

interface CloneRow {
  id: string;
  name: string;
  owner_role: string | null;
  owner_department: string | null;
  expertise_tags: string[] | null;
  personality: Record<string, unknown> | null;
}

interface MemoryRow {
  content: string;
  source: string;
  confidence: number | null;
  metadata: Record<string, unknown> | null;
  occurred_at: string;
}

/**
 * GET /api/orgpulse/onboarding
 * Returns available onboarding options (roles/teams) from real clone data.
 */
export async function GET() {
  try {
    const supabase = createServerSupabaseClient();
    const { data: clones, error } = await supabase
      .from("clones")
      .select("id, name, owner_role, owner_department")
      .order("created_at", { ascending: true });

    if (error || !clones || clones.length === 0) {
      return NextResponse.json({ options: [] });
    }

    // Build unique role/team combinations from real clones
    const seen = new Set<string>();
    const options: { role: string; team: string }[] = [];
    for (const c of clones) {
      const role = c.owner_role || "Team Member";
      const team = c.owner_department || "General";
      const key = `${role}-${team}`;
      if (!seen.has(key)) {
        seen.add(key);
        options.push({ role, team });
      }
    }

    return NextResponse.json({ options });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

/**
 * POST /api/orgpulse/onboarding
 * Body: { role: string, team: string }
 * Generates an onboarding brief from Supabase synthetic data.
 */
export async function POST(request: NextRequest) {
  try {
    const { role, team } = (await request.json()) as {
      role: string;
      team: string;
    };

    const supabase = createServerSupabaseClient();

    // Fetch all clones for "key people"
    const { data: clones } = await supabase
      .from("clones")
      .select(
        "id, name, owner_role, owner_department, expertise_tags, personality"
      )
      .order("created_at", { ascending: true });

    const allClones = (clones || []) as CloneRow[];

    // Pick a clone whose role/department matches, or first clone
    const targetClone =
      allClones.find(
        (c) =>
          (c.owner_role || "").toLowerCase() === role.toLowerCase() ||
          (c.owner_department || "").toLowerCase() === team.toLowerCase()
      ) || allClones[0];

    const cloneId = targetClone?.id;

    // Fetch fact memories for context and decisions
    const { data: facts } = await supabase
      .from("memories")
      .select("content, source, confidence, metadata, occurred_at")
      .eq("type", "fact")
      .order("confidence", { ascending: false })
      .limit(30);

    // Fetch document memories for key docs
    const { data: docs } = await supabase
      .from("memories")
      .select("content, source, confidence, metadata, occurred_at")
      .eq("type", "document")
      .order("occurred_at", { ascending: false })
      .limit(15);

    const factRows = (facts || []) as MemoryRow[];
    const docRows = (docs || []) as MemoryRow[];

    // ---- Build key context from top facts ----
    const keyContext: string[] = [];
    // Add team overview
    keyContext.push(
      `The team consists of ${allClones.length} members: ${allClones.map((c) => `${c.name.replace(/\s*\(Clone\)$/i, "")} (${c.owner_role || "Team Member"})`).join(", ")}.`
    );
    // Add top facts as context
    const topFacts = factRows
      .filter((f) => (f.confidence ?? 0) >= 0.7)
      .slice(0, 4);
    for (const fact of topFacts) {
      keyContext.push(fact.content);
    }

    // ---- Build key people from all clones ----
    const keyPeople = allClones.map((c) => {
      const name = c.name.replace(/\s*\(Clone\)$/i, "");
      const cRole = c.owner_role || "Team Member";
      const expertise = c.expertise_tags?.slice(0, 3).join(", ") || "";
      const personality = c.personality as Record<string, unknown> | null;
      const bio = (personality?.bio as string) || "";
      const tone = (personality?.tone as string) || "";

      return {
        name,
        role: cRole,
        relationship:
          c.id === cloneId
            ? `Your role counterpart on the ${c.owner_department || "team"} team.`
            : `${cRole} on the ${c.owner_department || "team"} team. Expertise: ${expertise || "general"}.`,
        tip: tone || bio || `Connect about ${expertise || "their area of work"}.`,
      };
    });

    // ---- Build key docs from document memories ----
    const keyDocs = docRows.slice(0, 5).map((doc) => {
      const meta = doc.metadata || {};
      const title = (meta.title as string) || "Document";
      const sourceType = doc.source || "document";
      const sourceUrl = (meta.source_url as string) || "";
      return {
        title,
        type: sourceType,
        url: sourceUrl || `#${sourceType}`,
        relevance: doc.content.slice(0, 120) + (doc.content.length > 120 ? "…" : ""),
      };
    });

    // ---- Build decisions from fact memories with decision keywords ----
    const decisionFacts = factRows.filter((f) =>
      /decided|confirmed|agreed|approved|going with|chose|locked|prioriti/i.test(
        f.content
      )
    );
    const decisions = decisionFacts.slice(0, 4).map((f) => {
      const meta = f.metadata || {};
      const date = new Date(f.occurred_at).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
      const participants = allClones
        .filter((c) => {
          const name = c.name.replace(/\s*\(Clone\)$/i, "");
          return f.content.includes(name);
        })
        .map((c) => c.name.replace(/\s*\(Clone\)$/i, ""));
      if (participants.length === 0 && meta.author) {
        participants.push(String(meta.author));
      }
      return {
        decision: f.content,
        date,
        rationale: `From ${f.source} source (confidence: ${((f.confidence ?? 0.5) * 100).toFixed(0)}%).`,
        participants:
          participants.length > 0
            ? participants
            : allClones.slice(0, 2).map((c) => c.name.replace(/\s*\(Clone\)$/i, "")),
      };
    });

    // ---- Build risks from conflict/risk-related facts ----
    const riskFacts = factRows.filter((f) =>
      /risk|blocker|problem|issue|concern|behind|slip|fail|critical|broke|revert|outage|deadline|bug/i.test(
        f.content
      )
    );
    const risks = riskFacts.slice(0, 4).map((f) => {
      const conf = f.confidence ?? 0.5;
      const severity: "low" | "medium" | "high" =
        conf >= 0.85 ? "high" : conf >= 0.7 ? "medium" : "low";
      return {
        risk: f.content,
        severity,
        context: `Source: ${f.source}. Occurred ${new Date(f.occurred_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}.`,
      };
    });

    const brief: OnboardingBrief = {
      role,
      team,
      generatedAt: new Date().toISOString(),
      keyContext,
      keyPeople,
      keyDocs,
      decisions,
      risks,
    };

    return NextResponse.json({ brief });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
