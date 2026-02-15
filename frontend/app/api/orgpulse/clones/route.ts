import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/core/supabase/server";

/**
 * GET /api/orgpulse/clones
 *
 * Returns clone profiles from Supabase for the Agent Clones view.
 * Matches the actual Supabase schema: clones table has
 * owner_name, owner_email, owner_role, owner_department (no owner_id FK).
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

    const { data: clones, error } = await supabase
      .from("clones")
      .select(
        "id, name, avatar_url, personality, expertise_tags, status, owner_name, owner_email, owner_role, owner_department, created_at"
      )
      .order("created_at", { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!clones || clones.length === 0) {
      return NextResponse.json({ profiles: [], total: 0 });
    }

    const profiles = clones.map((clone) => {
      const personality = clone.personality as Record<string, unknown> | null;
      const tone = (personality?.tone as string) || "";
      const bio = (personality?.bio as string) || "";
      const expertiseAreas = (personality?.expertise_areas as string[]) || [];

      return {
        employee: {
          id: clone.id,
          name: `${clone.name} [Twin Clone]`,
          role: clone.owner_role || expertiseAreas[0] || "Team Member",
          team: clone.owner_department || expertiseAreas[0] || "General",
          tenure: "",
          initials: getInitials(clone.name),
        },
        personality: tone || bio || `AI digital twin of ${clone.name}.`,
        expertise: clone.expertise_tags ?? [],
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
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
