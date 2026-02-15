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

    const { data: clones, error } = await supabase
      .from("clones")
      .select(`
        id,
        name,
        avatar_url,
        personality,
        expertise_tags,
        status,
        created_at,
        owner_id,
        users!clones_owner_id_fkey (
          name,
          email,
          role
        )
      `)
      .order("created_at", { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const profiles = (clones ?? []).map((clone) => {
      const user = clone.users as unknown as { name: string; email: string; role: string } | null;
      const personality = clone.personality as Record<string, unknown> | null;

      return {
        employee: {
          id: clone.id,
          name: clone.name,
          role: user?.role || (personality?.bio as string)?.split(".")[0] || "Team Member",
          team: (personality?.expertise_areas as string[])?.[0] || "General",
          tenure: "",
          initials: getInitials(clone.name),
        },
        personality:
          (personality?.tone as string) ||
          (personality?.bio as string) ||
          `AI digital twin of ${clone.name}.`,
        expertise: clone.expertise_tags ?? [],
        suggestedQuestions: [
          `What are you currently working on?`,
          `What's the most important thing I should know?`,
          `What are the biggest risks right now?`,
          `Tell me about recent decisions and their context.`,
        ],
      };
    });

    return NextResponse.json({ profiles, total: profiles.length });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
