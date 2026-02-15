import { getCloneById, mockClones, mockDocuments, mockMemories, mockPeople } from "./mock-data";
import { isSupabaseConfigured } from "./flags";
import { createServerSupabaseClient } from "@/lib/core/supabase/server";
import type {
  Clone,
  ClonePersonality,
  Document,
  Memory,
  PersonContext,
} from "@/lib/core/types";

interface SupabaseCloneRow {
  id: string;
  org_id: string;
  owner_id: string;
  name: string;
  avatar_url: string | null;
  personality: unknown;
  expertise_tags: string[] | null;
  status: Clone["status"];
  created_at: string;
  trained_at: string | null;
}

interface SupabaseUserRow {
  id: string;
  name: string;
  role: string;
  email: string;
  avatar_url: string | null;
}

interface SupabaseDocumentRow {
  id: string;
  clone_id: string;
  title: string;
  content: string | null;
  file_url: string | null;
  doc_type: Document["doc_type"];
  created_at: string;
}

interface SupabaseMemoryRow {
  id: string;
  clone_id: string;
  fact: string;
  source_conversation_id: string | null;
  confidence: number;
  created_at: string;
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

export interface CloneApiDetail {
  clone: Clone & {
    owner: PersonContext;
    documents: Document[];
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
      memories,
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

function mapClone(row: SupabaseCloneRow): Clone {
  return {
    id: row.id,
    org_id: row.org_id,
    owner_id: row.owner_id,
    name: row.name,
    avatar_url: row.avatar_url || undefined,
    personality: normalizePersonality(row.personality),
    expertise_tags: row.expertise_tags || [],
    status: row.status,
    created_at: row.created_at,
    trained_at: row.trained_at || undefined,
  };
}

function mapOwnerToPersonContext(
  owner: SupabaseUserRow | undefined,
  cloneName: string
): PersonContext {
  return {
    id: owner?.id || `owner_${cloneName}`,
    name: owner?.name || cloneName,
    role: owner?.role || "member",
    department: "Unknown",
    avatar_url: owner?.avatar_url || undefined,
    recent_interactions: [],
    relationship: "Owner profile loaded from workspace data.",
    key_facts: owner
      ? [`Primary email: ${owner.email}`]
      : ["No owner profile available."],
  };
}

function toDocument(row: SupabaseDocumentRow): Document {
  return {
    id: row.id,
    clone_id: row.clone_id,
    title: row.title,
    content: row.content || "",
    file_url: row.file_url || undefined,
    doc_type: row.doc_type,
    created_at: row.created_at,
  };
}

function toMemory(row: SupabaseMemoryRow): Memory {
  return {
    id: row.id,
    clone_id: row.clone_id,
    fact: row.fact,
    source_conversation_id: row.source_conversation_id || undefined,
    confidence: row.confidence,
    created_at: row.created_at,
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
      "id, org_id, owner_id, name, avatar_url, personality, expertise_tags, status, created_at, trained_at"
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
  const { data: ownerRow } = await supabase
    .from("users")
    .select("id, name, role, email, avatar_url")
    .eq("id", mappedClone.owner_id)
    .maybeSingle();

  return {
    clone: mappedClone,
    owner: ownerRow
      ? {
          name: ownerRow.name,
          role: ownerRow.role,
          department: "Unknown",
        }
      : undefined,
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
      "id, org_id, owner_id, name, avatar_url, personality, expertise_tags, status, created_at, trained_at"
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

  const mappedClones = (cloneRows as SupabaseCloneRow[]).map(mapClone);
  const ownerIds = Array.from(new Set(mappedClones.map((c) => c.owner_id)));
  const { data: ownerRows } = await supabase
    .from("users")
    .select("id, name, role, email, avatar_url")
    .in("id", ownerIds);
  const typedOwnerRows = (ownerRows as SupabaseUserRow[] | null) || [];
  const ownersById = new Map<string, SupabaseUserRow>(
    typedOwnerRows.map((row: SupabaseUserRow) => [row.id, row])
  );

  return mappedClones.map((clone) => {
    const owner = ownersById.get(clone.owner_id);
    return {
      ...clone,
      owner_name: owner?.name,
      owner_role: owner?.role,
      owner_department: "Unknown",
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
      "id, org_id, owner_id, name, avatar_url, personality, expertise_tags, status, created_at, trained_at"
    )
    .eq("id", cloneId)
    .maybeSingle();

  if (!cloneRow) return buildMockCloneDetail(cloneId);
  const clone = mapClone(cloneRow as SupabaseCloneRow);

  const [{ data: ownerRow }, { data: documentRows }, { data: memoryRows }] =
    await Promise.all([
      supabase
        .from("users")
        .select("id, name, role, email, avatar_url")
        .eq("id", clone.owner_id)
        .maybeSingle(),
      supabase
        .from("documents")
        .select("id, clone_id, title, content, file_url, doc_type, created_at")
        .eq("clone_id", clone.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("memories")
        .select(
          "id, clone_id, fact, source_conversation_id, confidence, created_at"
        )
        .eq("clone_id", clone.id)
        .order("created_at", { ascending: false }),
    ]);

  const documents = (documentRows as SupabaseDocumentRow[] | null)?.map(toDocument) || [];
  const memories = (memoryRows as SupabaseMemoryRow[] | null)?.map(toMemory) || [];
  const owner = mapOwnerToPersonContext(ownerRow as SupabaseUserRow | undefined, clone.name);

  return {
    clone: {
      ...clone,
      owner,
      documents,
      memories,
      stats: {
        document_count: documents.length,
        memory_count: memories.length,
        training_sources: Array.from(new Set(documents.map((d) => d.doc_type))),
      },
    },
  };
}
