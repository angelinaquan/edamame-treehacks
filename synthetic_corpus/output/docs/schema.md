---
id: doc-schema
title: "Edamame — Database Schema"
author: angelina
created: 2026-02-04
updated: 2026-02-11
status: final
references: {"decisions": ["dec-002", "dec-003", "dec-004", "dec-012", "dec-013"]}
---

# Edamame — Database Schema

**Status:** Final | **Owner:** Angelina Quan + Ella Lan | **Last updated:** Day 9

## Core Tables

### clones
```sql
create table clones (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  personality text,
  expertise text[],
  suggested_questions text[],
  created_at timestamptz default now()
);
```

### memories (ref: dec-002, dec-003)
```sql
create table memories (
  id uuid primary key default gen_random_uuid(),
  clone_id uuid references clones(id) not null,
  source_type text not null,      -- 'slack' | 'gdrive' | 'email' | 'github'
  memory_type text not null,      -- 'document' | 'chunk' | 'fact' | 'category'
  content text not null,
  embedding vector(1536),         -- text-embedding-3-small (ref: dec-004)
  confidence float default 1.0,   -- for facts: extraction confidence
  source_metadata jsonb default '{}',
  occurred_at timestamptz,
  created_at timestamptz default now()
);

-- Partitioned indexes for retrieval performance (ref: Videet's benchmarks)
create index chunks_embedding_idx on memories
  using ivfflat (embedding vector_cosine_ops) with (lists = 100)
  where memory_type = 'chunk';

create index facts_embedding_idx on memories
  using ivfflat (embedding vector_cosine_ops) with (lists = 50)
  where memory_type = 'fact';

-- Embedding cache for deduplication
create index embedding_cache_idx on memories (md5(content))
  where embedding is not null;
```

### messages
```sql
create table messages (
  id uuid primary key default gen_random_uuid(),
  clone_id uuid references clones(id),
  role text not null,    -- 'user' | 'assistant'
  content text not null,
  created_at timestamptz default now()
);
```

### integrations
```sql
create table integrations (
  id uuid primary key default gen_random_uuid(),
  provider text not null,   -- 'slack' | 'gdrive' | 'gmail' | 'github' | 'notion'
  config jsonb not null default '{}',
  last_synced_at timestamptz,
  created_at timestamptz default now()
);
```

## Critical Constraint (ref: dec-012, dec-013)
ALL queries against the memories table MUST include `WHERE clone_id = $1`.
This prevents cross-clone data leakage (see postmortem).
