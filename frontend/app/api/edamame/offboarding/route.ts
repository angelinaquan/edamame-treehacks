import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/core/supabase/server";
import type { Employee, HandoffPack } from "@/lib/edamame/types";

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function stripCloneSuffix(name: string): string {
  return name.replace(/\s*\(Clone\)$/i, "");
}

interface CloneRow {
  id: string;
  name: string;
  owner_role: string | null;
  owner_department: string | null;
  expertise_tags: string[] | null;
  created_at: string;
}

interface MemoryRow {
  id: string;
  content: string;
  source: string;
  type: string;
  confidence: number | null;
  metadata: Record<string, unknown> | null;
  occurred_at: string;
}

/**
 * GET /api/edamame/offboarding
 * Returns list of clones as potential departing employees.
 */
export async function GET() {
  try {
    const supabase = createServerSupabaseClient();
    const { data: clones, error } = await supabase
      .from("clones")
      .select("id, name, owner_role, owner_department, expertise_tags, created_at")
      .order("created_at", { ascending: true });

    if (error || !clones || clones.length === 0) {
      return NextResponse.json({ employees: [] });
    }

    const employees: Employee[] = (clones as CloneRow[]).map((c) => {
      const name = stripCloneSuffix(c.name);
      return {
        id: c.id,
        name,
        role: c.owner_role || "Team Member",
        team: c.owner_department || "General",
        tenure: "",
        initials: getInitials(name),
      };
    });

    return NextResponse.json({ employees });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

/**
 * POST /api/edamame/offboarding
 * Body: { employeeId: string }
 * Generates a handoff pack from Supabase synthetic data.
 */
export async function POST(request: NextRequest) {
  try {
    const { employeeId } = (await request.json()) as { employeeId: string };

    const supabase = createServerSupabaseClient();

    // Fetch the clone
    const { data: cloneRow } = await supabase
      .from("clones")
      .select("id, name, owner_role, owner_department, expertise_tags, created_at")
      .eq("id", employeeId)
      .single();

    if (!cloneRow) {
      return NextResponse.json({ error: "Clone not found" }, { status: 404 });
    }

    const clone = cloneRow as CloneRow;
    const name = stripCloneSuffix(clone.name);

    const employee: Employee = {
      id: clone.id,
      name,
      role: clone.owner_role || "Team Member",
      team: clone.owner_department || "General",
      tenure: "",
      initials: getInitials(name),
    };

    // Fetch all other clones for suggested owners
    const { data: allClones } = await supabase
      .from("clones")
      .select("id, name, owner_role, owner_department, expertise_tags")
      .neq("id", employeeId)
      .order("created_at", { ascending: true });

    const otherClones = ((allClones || []) as CloneRow[]).map((c) => ({
      ...c,
      name: stripCloneSuffix(c.name),
    }));

    // Fetch this clone's memories
    const { data: memories } = await supabase
      .from("memories")
      .select("id, content, source, type, confidence, metadata, occurred_at")
      .eq("clone_id", employeeId)
      .order("occurred_at", { ascending: false })
      .limit(60);

    const memRows = (memories || []) as MemoryRow[];

    const facts = memRows.filter((m) => m.type === "fact");
    const documents = memRows.filter((m) => m.type === "document");

    // ---- Build summary bullets from top facts ----
    const topFacts = facts
      .sort((a, b) => (b.confidence ?? 0) - (a.confidence ?? 0))
      .slice(0, 6);
    const summaryBullets = topFacts.map((f) => f.content);
    if (summaryBullets.length === 0) {
      summaryBullets.push(
        `${name} is a ${employee.role} on the ${employee.team} team. Review their recent work for handoff context.`
      );
    }

    // ---- Build ownership areas from document sources ----
    const sourceGroups = new Map<string, MemoryRow[]>();
    for (const doc of documents) {
      const src = doc.source || "general";
      const group = sourceGroups.get(src) || [];
      group.push(doc);
      sourceGroups.set(src, group);
    }

    const ownershipAreas = Array.from(sourceGroups.entries())
      .slice(0, 4)
      .map(([source, docs], idx) => {
        const topDoc = docs[0];
        const title = (topDoc.metadata?.title as string) || `${source} work`;
        const suggestedOwner =
          otherClones.length > 0
            ? otherClones[idx % otherClones.length].name
            : undefined;
        return {
          area: title,
          description: `${docs.length} ${source} item(s) owned by ${name}. Most recent: ${topDoc.content.slice(0, 100)}…`,
          status: (idx === 0 ? "needs-owner" : "active") as
            | "active"
            | "transitioning"
            | "needs-owner",
          suggestedOwner,
        };
      });

    // ---- Build unresolved work from jira and high-priority facts ----
    const jiraDocs = documents.filter((d) => d.source === "jira");
    const githubDocs = documents.filter((d) => d.source === "github");
    const workItems = [...jiraDocs, ...githubDocs].slice(0, 4);

    const unresolvedWork = workItems.map((item) => {
      const meta = item.metadata || {};
      const title = (meta.title as string) || `${item.source} item`;
      const priority =
        item.source === "jira" && (item.confidence ?? 0) >= 0.8
          ? "critical"
          : (item.confidence ?? 0) >= 0.7
            ? "high"
            : "medium";
      return {
        title,
        priority: priority as "low" | "medium" | "high" | "critical",
        description: item.content.slice(0, 200) + (item.content.length > 200 ? "…" : ""),
        deadline: undefined as string | undefined,
      };
    });

    // ---- Build key links from document metadata ----
    const keyLinks = documents
      .filter((d) => d.metadata?.source_url)
      .slice(0, 8)
      .map((d) => {
        const meta = d.metadata || {};
        return {
          title: (meta.title as string) || `${d.source} resource`,
          url: (meta.source_url as string) || "#",
          category: d.source.charAt(0).toUpperCase() + d.source.slice(1),
        };
      });

    // If no links from metadata, create placeholder links from sources
    if (keyLinks.length === 0) {
      const sources = new Set(documents.map((d) => d.source));
      for (const src of sources) {
        keyLinks.push({
          title: `${src.charAt(0).toUpperCase() + src.slice(1)} workspace`,
          url: `#${src}`,
          category: src.charAt(0).toUpperCase() + src.slice(1),
        });
      }
    }

    const pack: HandoffPack = {
      employee,
      generatedAt: new Date().toISOString(),
      ownershipAreas,
      keyLinks: keyLinks.slice(0, 8),
      unresolvedWork,
      summaryBullets,
    };

    return NextResponse.json({ pack });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
