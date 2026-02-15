---
id: doc-arch
title: "OrgPulse — System Architecture"
author: angelina
created: 2026-02-04
updated: 2026-02-12
status: final
references: {"decisions": ["dec-002", "dec-003", "dec-005", "dec-008", "dec-009", "dec-010", "dec-012", "dec-013"]}
---

# OrgPulse — System Architecture

**Status:** Final | **Owner:** Angelina Quan | **Last updated:** Day 10

## Overview

OrgPulse is an AI-native memory layer that ingests organizational knowledge from multiple sources, creates semantic embeddings, and serves it through digital twin clones.

## Data Flow

```
Sources (Slack, Drive, Gmail)
  → Ingestion Pipeline
  → Chunking (500 tokens)
  → Embedding (text-embedding-3-small, 1536d)
  → Supabase (pgvector)
  → Retrieval (cosine sim → reranker → top-5)
  → LLM Synthesis (GPT-4o)
  → Streaming Response (SSE)
```

## Memory Hierarchy (ref: dec-003)

| Level    | Description                          | Embedding? | Example                                    |
|----------|--------------------------------------|------------|--------------------------------------------|
| document | Raw ingested content                 | No         | Full Slack channel dump                    |
| chunk    | 500-token segment                    | Yes (1536d)| "In yesterday's sync, James said..."       |
| fact     | Atomic extracted claim               | Yes (1536d)| "James prefers RAG over fine-tuning"       |
| category | Clustered summary across facts       | No         | "Team favors pragmatic approaches"         |

## Key Components

### Retrieval Pipeline (ref: dec-005, dec-010)
1. Embed query → pgvector cosine similarity → top-20
2. Cross-encoder reranker → top-5 (threshold: 0.7, ref: dec-013)
3. Inject into GPT-4o system prompt with source metadata
4. Stream response with inline citation markers

### Continual Learning (ref: dec-008)
1. User sends message → relevance filter (min info density)
2. GPT-4o extracts atomic facts (structured output)
3. Facts embedded + stored as memory_type='fact'
4. Learning panel shows extraction in real-time

### CEO Insights (ref: dec-009)
1. CEO asks a management question
2. Round 1: each clone gives independent stance
3. Round 2: clones see others' positions, can update
4. Aggregate: sentiment distribution + key themes

## Infrastructure (Owner: Videet)
- **Database:** Supabase PostgreSQL + pgvector extension
- **Compute:** Modal for Whisper, reranker, batch embeddings
- **Hosting:** Vercel (Next.js frontend + API routes)
- **Embeddings:** text-embedding-3-small (1536d, ~40ms/call)

## Post-incident Changes (ref: dec-012, dec-013)
- All retrieval queries include WHERE clone_id filter
- Reranker threshold raised to 0.7 (from 0.4)
- Post-retrieval clone_id assertion added
- Automated clone isolation test (50 queries, 0 violations)
