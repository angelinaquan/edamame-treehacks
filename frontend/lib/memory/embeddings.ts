import { generateEmbedding } from "@/lib/agents/openai";

export interface EmbeddableMemoryRow {
  content: string;
  embedding?: number[] | null;
}

interface AttachEmbeddingsOptions {
  maxContentChars?: number;
  concurrency?: number;
}

const DEFAULT_MAX_CONTENT_CHARS = 6000;
const DEFAULT_CONCURRENCY = 3;

function canGenerateEmbeddings(): boolean {
  return Boolean(process.env.OPENAI_API_KEY);
}

/**
 * Best-effort embedding enrichment for memory rows.
 * If embedding generation fails, rows are returned without embeddings.
 */
export async function attachEmbeddingsToMemoryRows<T extends EmbeddableMemoryRow>(
  rows: T[],
  options: AttachEmbeddingsOptions = {}
): Promise<T[]> {
  if (rows.length === 0 || !canGenerateEmbeddings()) return rows;

  const maxContentChars = options.maxContentChars ?? DEFAULT_MAX_CONTENT_CHARS;
  const concurrency = Math.max(
    1,
    Math.min(options.concurrency ?? DEFAULT_CONCURRENCY, rows.length)
  );

  const output = rows.map((row) => ({ ...row }));
  let nextIndex = 0;

  async function worker() {
    while (true) {
      const current = nextIndex;
      nextIndex += 1;
      if (current >= output.length) return;

      const text = output[current]?.content?.trim();
      if (!text) continue;

      try {
        const embedding = await generateEmbedding(text.slice(0, maxContentChars));
        output[current] = {
          ...output[current],
          embedding,
        };
      } catch (error) {
        console.warn("Failed to generate embedding for memory row:", error);
      }
    }
  }

  await Promise.all(Array.from({ length: concurrency }, () => worker()));
  return output as T[];
}
