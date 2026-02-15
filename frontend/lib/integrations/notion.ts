import { Client } from "@notionhq/client";
import { chunkText } from "@/lib/core/chunker";
import { createServerSupabaseClient } from "@/lib/core/supabase/server";
import { getNotionApiKey } from "./credentials";

interface NotionSearchPage {
  id: string;
  url?: string;
  last_edited_time?: string;
  properties?: Record<string, unknown>;
}

export interface NotionPageSnapshot {
  page_id: string;
  title: string;
  url: string | null;
  last_edited_time: string | null;
  content: string;
}

export interface NotionContextSnapshot {
  query?: string;
  generated_at: string;
  pages_scanned: number;
  pages: NotionPageSnapshot[];
}

export interface NotionSyncResult {
  snapshot_id: string;
  pages_scanned: number;
  documents_created: number;
  chunks_created: number;
}

async function createNotionClient(): Promise<Client> {
  const token = await getNotionApiKey();
  return new Client({ auth: token });
}

function extractPlainText(richText: unknown): string {
  if (!Array.isArray(richText)) return "";
  return richText
    .map((item) => {
      if (item && typeof item === "object" && "plain_text" in item) {
        const plain = (item as { plain_text?: unknown }).plain_text;
        return typeof plain === "string" ? plain : "";
      }
      return "";
    })
    .filter(Boolean)
    .join("");
}

function extractPageTitle(page: NotionSearchPage): string {
  const properties = page.properties ?? {};
  for (const value of Object.values(properties)) {
    if (
      value &&
      typeof value === "object" &&
      "type" in value &&
      (value as { type?: unknown }).type === "title"
    ) {
      const title = extractPlainText((value as { title?: unknown }).title);
      if (title.trim()) return title;
    }
  }
  return `Untitled ${page.id.slice(0, 8)}`;
}

function extractBlockText(block: Record<string, unknown>): string {
  const type = typeof block.type === "string" ? block.type : "";
  if (!type) return "";
  const typePayload = block[type];
  if (!typePayload || typeof typePayload !== "object") return "";

  if ("rich_text" in typePayload) {
    const text = extractPlainText(
      (typePayload as { rich_text?: unknown }).rich_text
    );
    return text.trim();
  }

  if ("title" in typePayload) {
    const text = extractPlainText((typePayload as { title?: unknown }).title);
    return text.trim();
  }

  return "";
}

async function fetchPageBlocksRecursively(
  notion: Client,
  blockId: string,
  depth = 0,
  maxDepth = 4
): Promise<string[]> {
  if (depth > maxDepth) return [];

  const lines: string[] = [];
  let cursor: string | undefined;

  do {
    const response = await notion.blocks.children.list({
      block_id: blockId,
      start_cursor: cursor,
      page_size: 100,
    });

    for (const rawBlock of response.results as Record<string, unknown>[]) {
      const line = extractBlockText(rawBlock);
      if (line) lines.push(line);

      const hasChildren = Boolean(rawBlock.has_children);
      const childId =
        typeof rawBlock.id === "string" ? rawBlock.id : undefined;

      if (hasChildren && childId) {
        const childLines = await fetchPageBlocksRecursively(
          notion,
          childId,
          depth + 1,
          maxDepth
        );
        lines.push(...childLines);
      }
    }

    cursor = response.has_more ? response.next_cursor ?? undefined : undefined;
  } while (cursor);

  return lines;
}

export async function buildNotionContext(opts: {
  query?: string;
  pageLimit?: number;
}): Promise<NotionContextSnapshot> {
  const notion = await createNotionClient();
  const pageLimit = Math.min(Math.max(opts.pageLimit ?? 20, 1), 100);

  const searchResponse = await notion.search({
    query: opts.query,
    filter: { property: "object", value: "page" },
    sort: { direction: "descending", timestamp: "last_edited_time" },
    page_size: pageLimit,
  });

  const pages = (searchResponse.results as unknown[])
    .filter(
      (result): result is NotionSearchPage =>
        Boolean(result) &&
        result !== null &&
        typeof result === "object" &&
        "id" in result &&
        "object" in result &&
        (result as { object?: unknown }).object === "page"
    )
    .map((result) => result as NotionSearchPage);

  const pageSnapshots: NotionPageSnapshot[] = [];
  for (const page of pages) {
    const lines = await fetchPageBlocksRecursively(notion, page.id);
    pageSnapshots.push({
      page_id: page.id,
      title: extractPageTitle(page),
      url: page.url ?? null,
      last_edited_time: page.last_edited_time ?? null,
      content: lines.join("\n").trim(),
    });
  }

  return {
    query: opts.query,
    generated_at: new Date().toISOString(),
    pages_scanned: pageSnapshots.length,
    pages: pageSnapshots,
  };
}

export async function syncNotionContextToSupabase(opts: {
  cloneId: string;
  query?: string;
  pageLimit?: number;
}): Promise<NotionSyncResult> {
  const context = await buildNotionContext({
    query: opts.query,
    pageLimit: opts.pageLimit,
  });
  const supabase = createServerSupabaseClient();
  const now = new Date().toISOString();

  const snapshotInsert = await supabase
    .from("memories")
    .insert({
      clone_id: opts.cloneId,
      type: "snapshot",
      source: "notion",
      content: JSON.stringify(context),
      confidence: 1.0,
      metadata: { query: opts.query, pages_scanned: context.pages_scanned },
      occurred_at: now,
    })
    .select("id")
    .single();

  if (snapshotInsert.error || !snapshotInsert.data) {
    throw new Error(
      `Failed to save Notion snapshot: ${snapshotInsert.error?.message ?? "unknown error"}`
    );
  }

  const snapshotId = snapshotInsert.data.id as string;
  if (context.pages.length === 0) {
    return {
      snapshot_id: snapshotId,
      pages_scanned: 0,
      documents_created: 0,
      chunks_created: 0,
    };
  }

  const memoryRows: Array<{
    clone_id: string;
    type: string;
    source: string;
    content: string;
    confidence: number;
    metadata: Record<string, unknown>;
    occurred_at: string;
  }> = [];

  let chunksCreated = 0;
  for (const page of context.pages) {
    const docTitle = `Notion: ${page.title}`;
    const docContent =
      `Notion page snapshot\n` +
      `Title: ${page.title}\n` +
      `URL: ${page.url ?? "N/A"}\n` +
      `Last edited: ${page.last_edited_time ?? "N/A"}\n\n` +
      `${page.content}`;
    const occurredAt = page.last_edited_time || now;

    memoryRows.push({
      clone_id: opts.cloneId,
      type: "document",
      source: "notion",
      content: docContent,
      confidence: 0.9,
      metadata: {
        title: docTitle,
        doc_type: "notion_page",
        snapshot_id: snapshotId,
        notion_page_id: page.page_id,
        notion_page_url: page.url,
      },
      occurred_at: occurredAt,
    });

    if (docContent.trim()) {
      const chunks = chunkText(docContent, { chunkSize: 700, overlap: 100 });
      for (const chunk of chunks) {
        memoryRows.push({
          clone_id: opts.cloneId,
          type: "chunk",
          source: "notion",
          content: chunk.content,
          confidence: 0.8,
          metadata: {
            ...chunk.metadata,
            source_type: "page_snapshot",
            snapshot_id: snapshotId,
            notion_page_id: page.page_id,
            notion_page_url: page.url,
            document_title: docTitle,
          },
          occurred_at: occurredAt,
        });
        chunksCreated++;
      }
    }
  }

  if (memoryRows.length > 0) {
    const { error } = await supabase.from("memories").insert(memoryRows);
    if (error) {
      throw new Error(`Failed to save Notion memories: ${error.message}`);
    }
  }

  return {
    snapshot_id: snapshotId,
    pages_scanned: context.pages_scanned,
    documents_created: context.pages.length,
    chunks_created: chunksCreated,
  };
}
