export interface ChunkResult {
  content: string;
  metadata: {
    source: string;
    chunk_index: number;
    total_chunks: number;
  };
}

export function chunkText(
  text: string,
  options?: { chunkSize?: number; overlap?: number }
): ChunkResult[] {
  const chunkSize = options?.chunkSize || 500;
  const overlap = options?.overlap || 50;
  const chunks: ChunkResult[] = [];

  const sentences = text.split(/(?<=[.!?])\s+/);
  let currentChunk = "";
  let chunkIndex = 0;

  for (const sentence of sentences) {
    if (
      (currentChunk + " " + sentence).length > chunkSize &&
      currentChunk.length > 0
    ) {
      chunks.push({
        content: currentChunk.trim(),
        metadata: { source: "", chunk_index: chunkIndex, total_chunks: 0 },
      });
      chunkIndex++;
      const words = currentChunk.split(/\s+/);
      currentChunk =
        words.slice(-Math.floor(overlap / 5)).join(" ") + " " + sentence;
    } else {
      currentChunk = currentChunk
        ? currentChunk + " " + sentence
        : sentence;
    }
  }

  if (currentChunk.trim()) {
    chunks.push({
      content: currentChunk.trim(),
      metadata: { source: "", chunk_index: chunkIndex, total_chunks: 0 },
    });
  }

  return chunks.map((c) => ({
    ...c,
    metadata: { ...c.metadata, total_chunks: chunks.length },
  }));
}
