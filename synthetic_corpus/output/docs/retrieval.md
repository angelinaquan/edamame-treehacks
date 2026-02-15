---
id: doc-retrieval
title: "OrgPulse — Retrieval Pipeline Design"
author: videet
created: 2026-02-05
updated: 2026-02-12
status: final
references: {"decisions": ["dec-004", "dec-005", "dec-010", "dec-013", "dec-016"]}
---

# OrgPulse — Retrieval Pipeline Design

**Status:** Final | **Owner:** Videet Mehta | **Last updated:** Day 10

## Pipeline Steps

1. **Query embedding:** text-embedding-3-small (42ms avg, cached)
2. **Vector search:** pgvector cosine similarity, top-20 chunks + facts
   - WHERE clone_id = $1 (CRITICAL: ref dec-013)
   - WHERE memory_type IN ('chunk', 'fact')
3. **Reranking:** cross-encoder on Modal (180ms avg, 2 replicas)
   - Threshold: 0.7 (ref: dec-013)
   - Below threshold → filtered out
4. **Context injection:** top-5 formatted as numbered sources in system prompt
5. **Response generation:** GPT-4o streaming via SSE
6. **Citation extraction:** parse [N] markers, map to source metadata

## Decision: Plain RAG over GraphRAG (ref: dec-005)

GraphRAG would enable multi-hop reasoning ("who worked with X on Y?") but requires:
- Entity extraction pipeline
- Relationship graph storage
- Graph traversal query layer

Estimated: 2+ days to build, high debugging risk. Plain RAG with reranking covers 90% of demo queries.

## Performance Benchmarks

| Component        | Latency (avg) | Latency (p95) |
|------------------|---------------|---------------|
| Query embedding  | 42ms          | 68ms          |
| pgvector search  | 31ms          | 47ms          |
| Reranker         | 180ms         | 340ms         |
| GPT-4o (first token) | 800ms     | 1200ms        |
| **Total cold**   | **2.5s**      | **3.8s**      |
| **Total warm**   | **1.8s**      | **2.9s**      |

## Fallback Strategy (ref: dec-016)
- Reranker timeout (3s) → fall back to raw pgvector top-5
- Embedding timeout (2s) → use cached embedding if available
- Supabase timeout (5s) → show retry message

## Reranker Threshold Eval (ref: dec-013)

| Threshold | Precision@5 | Recall@5 | Wrong-clone citations |
|-----------|------------|----------|----------------------|
| 0.4       | 0.72       | 0.91     | 3 / 50               |
| 0.5       | 0.81       | 0.84     | 2 / 50               |
| 0.6       | 0.89       | 0.76     | 2 / 50               |
| **0.7**   | **0.94**   | **0.68** | **0 / 50**           |
