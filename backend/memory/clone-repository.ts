import { getCloneById, mockClones, mockDocuments, mockMemories, mockPeople } from "./mock-data";
import { isSupabaseConfigured } from "./flags";
import { createServerSupabaseClient } from "@/lib/core/supabase/server";
import type {
  Clone,
  ClonePersonality,
  Memory,
  PersonContext,
} from "@/lib/core/types";

interface SupabaseCloneRow {
  id: string;
  name: string;
  avatar_url: string | null;
  personality: unknown;
  expertise_tags: string[] | null;
  status: Clone["status"];
  owner_name: string | null;
  owner_email: string | null;
  owner_role: string | null;
  owner_department: string | null;
  created_at: string;
  trained_at: string | null;
}

type RuntimeOwner = {
  name: string;
  role: string;
  department?: string;
};

export interface CloneRuntime {
  clone: Clone | null;
  owner?: RuntimeOwner;
}

export interface CloneApiSummary extends Clone {
  owner_name?: string;
  owner_role?: string;
  owner_department?: string;
}

// Legacy Document shape for the detail API
interface DocumentView {
  id: string;
  clone_id: string;
  title: string;
  content: string;
  doc_type: string;
  created_at: string;
}

export interface CloneApiDetail {
  clone: Clone & {
    owner: PersonContext;
    documents: DocumentView[];
    memories: Memory[];
    stats: {
      document_count: number;
      memory_count: number;
      training_sources: string[];
    };
  };
}

function buildMockCloneDetail(cloneId: string): CloneApiDetail | null {
  const clone = getCloneById(cloneId);
  if (!clone) return null;
  const owner = mockPeople.find((p) => p.id === clone.owner_id);
  const documents = mockDocuments.filter((d) => d.clone_id === clone.id);
  const memories = mockMemories.filter((m) => m.clone_id === clone.id);
  return {
    clone: {
      ...clone,
      owner: owner as PersonContext,
      documents,
      memories: memories.map((m) => ({
        id: m.id,
        clone_id: m.clone_id,
        type: "fact" as const,
        source: "manual" as const,
        content: m.fact,
        confidence: m.confidence,
        metadata: {},
        occurred_at: m.created_at,
        created_at: m.created_at,
      })),
      stats: {
        document_count: documents.length,
        memory_count: memories.length,
        training_sources: documents.map((d) => d.doc_type),
      },
    },
  };
}

function defaultPersonality(): ClonePersonality {
  return {
    communication_style: "direct",
    tone: "",
    bio: "",
    expertise_areas: [],
  };
}

function normalizePersonality(value: unknown): ClonePersonality {
  if (!value || typeof value !== "object") return defaultPersonality();
  const raw = value as Partial<ClonePersonality>;
  const style =
    raw.communication_style === "direct" ||
    raw.communication_style === "detailed" ||
    raw.communication_style === "casual" ||
    raw.communication_style === "formal"
      ? raw.communication_style
      : "direct";
  return {
    communication_style: style,
    tone: raw.tone || "",
    bio: raw.bio || "",
    expertise_areas: Array.isArray(raw.expertise_areas)
      ? raw.expertise_areas.filter((v): v is string => typeof v === "string")
      : [],
  };
}

function stripCloneSuffix(name: string): string {
  return name.replace(/\s*\(Clone\)$/i, "");
}

function mapClone(row: SupabaseCloneRow): Clone {
  return {
    id: row.id,
    name: stripCloneSuffix(row.name),
    avatar_url: row.avatar_url || undefined,
    personality: normalizePersonality(row.personality),
    expertise_tags: row.expertise_tags || [],
    status: row.status,
    owner_name: row.owner_name || undefined,
    owner_email: row.owner_email || undefined,
    owner_role: row.owner_role || undefined,
    owner_department: row.owner_department || undefined,
    created_at: row.created_at,
    trained_at: row.trained_at || undefined,
  };
}

function ownerFromClone(clone: Clone): PersonContext {
  return {
    id: clone.id,
    name: clone.owner_name || clone.name,
    role: clone.owner_role || "member",
    department: clone.owner_department || "Unknown",
    avatar_url: clone.avatar_url,
    recent_interactions: [],
    relationship: "Owner profile loaded from workspace data.",
    key_facts: clone.owner_email
      ? [`Primary email: ${clone.owner_email}`]
      : ["No owner profile available."],
  };
}

export async function getCloneRuntime(cloneId?: string): Promise<CloneRuntime> {
  const requestedId = cloneId || "clone_self";
  if (!isSupabaseConfigured()) {
    const clone = getCloneById(requestedId) || null;
    const owner = clone
      ? mockPeople.find((p) => p.id === clone.owner_id)
      : undefined;
    return {
      clone,
      owner: owner
        ? { name: owner.name, role: owner.role, department: owner.department }
        : undefined,
    };
  }

  const supabase = createServerSupabaseClient();
  const { data: cloneRow } = await supabase
    .from("clones")
    .select(
      "id, name, avatar_url, personality, expertise_tags, status, owner_name, owner_email, owner_role, owner_department, created_at, trained_at"
    )
    .eq("id", requestedId)
    .maybeSingle();

  if (!cloneRow) {
    const fallback = getCloneById(requestedId) || null;
    const owner = fallback
      ? mockPeople.find((p) => p.id === fallback.owner_id)
      : undefined;
    return {
      clone: fallback,
      owner: owner
        ? { name: owner.name, role: owner.role, department: owner.department }
        : undefined,
    };
  }

  const mappedClone = mapClone(cloneRow as SupabaseCloneRow);
  return {
    clone: mappedClone,
    owner: {
      name: mappedClone.owner_name || mappedClone.name,
      role: mappedClone.owner_role || "member",
      department: mappedClone.owner_department || "Unknown",
    },
  };
}

export async function listClonesForApi(): Promise<CloneApiSummary[]> {
  if (!isSupabaseConfigured()) {
    return mockClones.map((clone) => {
      const owner = mockPeople.find((p) => p.id === clone.owner_id);
      return {
        ...clone,
        owner_name: owner?.name,
        owner_role: owner?.role,
        owner_department: owner?.department,
      };
    });
  }

  const supabase = createServerSupabaseClient();
  const { data: cloneRows } = await supabase
    .from("clones")
    .select(
      "id, name, avatar_url, personality, expertise_tags, status, owner_name, owner_email, owner_role, owner_department, created_at, trained_at"
    )
    .order("created_at", { ascending: false });

  if (!cloneRows || cloneRows.length === 0) {
    return mockClones.map((clone) => {
      const owner = mockPeople.find((p) => p.id === clone.owner_id);
      return {
        ...clone,
        owner_name: owner?.name,
        owner_role: owner?.role,
        owner_department: owner?.department,
      };
    });
  }

  return (cloneRows as SupabaseCloneRow[]).map((row) => {
    const clone = mapClone(row);
    return {
      ...clone,
      owner_name: clone.owner_name,
      owner_role: clone.owner_role,
      owner_department: clone.owner_department,
    };
  });
}

export async function getCloneDetailForApi(
  cloneId: string
): Promise<CloneApiDetail | null> {
  if (!isSupabaseConfigured()) {
    return buildMockCloneDetail(cloneId);
  }

  const supabase = createServerSupabaseClient();
  const { data: cloneRow } = await supabase
    .from("clones")
    .select(
      "id, name, avatar_url, personality, expertise_tags, status, owner_name, owner_email, owner_role, owner_department, created_at, trained_at"
    )
    .eq("id", cloneId)
    .maybeSingle();

  if (!cloneRow) return buildMockCloneDetail(cloneId);
  const clone = mapClone(cloneRow as SupabaseCloneRow);

  // Fetch documents and facts from the unified memories table
  const [{ data: documentRows }, { data: factRows }] = await Promise.all([
    supabase
      .from("memories")
      .select("id, clone_id, content, metadata, created_at")
      .eq("clone_id", clone.id)
      .eq("type", "document")
      .order("created_at", { ascending: false }),
    supabase
      .from("memories")
      .select("id, clone_id, type, source, content, confidence, metadata, occurred_at, created_at")
      .eq("clone_id", clone.id)
      .eq("type", "fact")
      .order("created_at", { ascending: false }),
  ]);

  const documents: DocumentView[] =
    (documentRows || []).map((row: { id: string; clone_id: string; content: string; metadata: Record<string, unknown>; created_at: string }) => ({
      id: row.id,
      clone_id: row.clone_id,
      title: (row.metadata?.title as string) || "Untitled",
      content: row.content,
      doc_type: (row.metadata?.doc_type as string) || "document",
      created_at: row.created_at,
    }));

  const memories: Memory[] = (factRows as Memory[]) || [];
  const owner = ownerFromClone(clone);

  return {
    clone: {
      ...clone,
      owner,
      documents,
      memories,
      stats: {
        document_count: documents.length,
        memory_count: memories.length,
        training_sources: Array.from(
          new Set(documents.map((d) => d.doc_type))
        ),
      },
    },
  };
}
