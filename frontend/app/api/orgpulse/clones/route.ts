import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/core/supabase/server";

/**
 * GET /api/orgpulse/clones
 *
 * Returns clone profiles from Supabase for the Agent Clones view.
 * Maps DB clones to CloneProfile shape for the frontend.
 */

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export async function GET() {
  try {
    const supabase = createServerSupabaseClient();

    // Simple query — no joins that might fail
    const { data: clones, error } = await supabase
      .from("clones")
      .select("id, name, avatar_url, personality, expertise_tags, status, created_at, owner_id")
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Clones query error:", error);
      return NextResponse.json({ error: error.message, clones: [] }, { status: 500 });
    }

    if (!clones || clones.length === 0) {
      return NextResponse.json({ profiles: [], total: 0, debug: "no clones in table" });
    }

    const profiles = clones.map((clone) => {
      const personality = clone.personality as Record<string, unknown> | null;
      const expertiseAreas = (personality?.expertise_areas as string[]) ?? [];
      const commStyle = (personality?.communication_style as string) ?? "";
      const tone = (personality?.tone as string) ?? "";
      const bio = (personality?.bio as string) ?? "";

      const displayName = clone.name.replace(/\s*\(Clone\)$/i, "");

      return {
        employee: {
          id: clone.id,
          name: `${displayName} [Twin Clone]`,
          role: expertiseAreas[0] || "Team Member",
          team: expertiseAreas[0] || "General",
          tenure: "",
          initials: getInitials(displayName),
        },
        personality: tone || bio || commStyle || `AI digital twin of ${displayName}.`,
        expertise: clone.expertise_tags ?? expertiseAreas,
        suggestedQuestions: [
          "What are you currently working on?",
          "What's the most important thing I should know?",
          "What are the biggest risks right now?",
          "Tell me about recent decisions and their context.",
        ],
      };
    });

    return NextResponse.json({ profiles, total: profiles.length });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("Clones route error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
