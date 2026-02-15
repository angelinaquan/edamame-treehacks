import type { Memory, Chunk } from "./types";
import { mockMemories, mockDocuments } from "./mock-data";

export function searchKnowledgeBase(
  cloneId: string,
  query: string,
  topK: number = 5
): Chunk[] {
  // In production, this does vector similarity search against pgvector
  // For demo, we do simple keyword matching against mock data
  const queryTerms = query.toLowerCase().split(/\s+/);
  const cloneDocs = mockDocuments.filter((d) => d.clone_id === cloneId);

  const results = cloneDocs
    .map((doc) => ({
      id: doc.id,
      document_id: doc.id,
      clone_id: cloneId,
      content: doc.content,
      metadata: { title: doc.title, doc_type: doc.doc_type } as Record<
        string,
        unknown
      >,
      created_at: doc.created_at,
      score: queryTerms.filter((term) =>
        doc.content.toLowerCase().includes(term)
      ).length,
    }))
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);

  return results;
}

export function getCloneMemories(cloneId: string): Memory[] {
  return mockMemories.filter((m) => m.clone_id === cloneId);
}

export function extractFacts(content: string): string[] {
  const sentences = content
    .split(/[.!?]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 20);
  return sentences.filter((s) => {
    const factPatterns = [
      /deadline|due date|by \w+day/i,
      /decided|agreed|confirmed/i,
      /will|going to|plan to/i,
      /budget|cost|price|revenue/i,
      /\d+%|\$\d+/,
      /important|critical|urgent/i,
    ];
    return factPatterns.some((p) => p.test(s));
  });
}

export function saveFact(
  cloneId: string,
  fact: string,
  conversationId: string
): Memory {
  const memory: Memory = {
    id: `mem_${Date.now()}`,
    clone_id: cloneId,
    fact,
    source_conversation_id: conversationId,
    confidence: 0.85,
    created_at: new Date().toISOString(),
  };
  return memory;
}
