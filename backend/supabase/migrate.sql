-- =============================================================
-- MIGRATION: Consolidate 18 tables → 4 tables
-- Run this in your Supabase SQL Editor (https://supabase.com/dashboard/project/_/sql)
-- =============================================================

-- Step 1: Drop all old tables (order matters due to foreign keys)
-- Drop tables that reference other tables first

DROP TABLE IF EXISTS integrations CASCADE;
DROP TABLE IF EXISTS clone_interactions CASCADE;
DROP TABLE IF EXISTS messages CASCADE;
DROP TABLE IF EXISTS conversations CASCADE;
DROP TABLE IF EXISTS memories CASCADE;
DROP TABLE IF EXISTS chunks CASCADE;
DROP TABLE IF EXISTS documents CASCADE;
DROP TABLE IF EXISTS memory_items CASCADE;
DROP TABLE IF EXISTS memory_categories CASCADE;
DROP TABLE IF EXISTS memory_resources CASCADE;
DROP TABLE IF EXISTS memory_runs CASCADE;
DROP TABLE IF EXISTS github_context_snapshots CASCADE;
DROP TABLE IF EXISTS notion_context_snapshots CASCADE;
DROP TABLE IF EXISTS google_drive_context_snapshots CASCADE;
DROP TABLE IF EXISTS slack_context_snapshots CASCADE;
DROP TABLE IF EXISTS integration_credentials CASCADE;
DROP TABLE IF EXISTS clones CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS organizations CASCADE;

-- Step 2: Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Step 3: Create consolidated schema (4 tables)

-- Clones (one per person — includes owner info directly)
CREATE TABLE clones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  avatar_url TEXT,
  personality JSONB DEFAULT '{}',
  expertise_tags TEXT[] DEFAULT '{}',
  status TEXT CHECK (status IN ('untrained', 'training', 'active', 'inactive')) DEFAULT 'untrained',
  owner_name TEXT,
  owner_email TEXT,
  owner_role TEXT,
  owner_department TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  trained_at TIMESTAMPTZ
);

-- Memories (all clone knowledge: documents, chunks, facts, snapshots, categories)
CREATE TABLE memories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clone_id UUID REFERENCES clones(id) ON DELETE CASCADE,
  type TEXT CHECK (type IN ('document', 'chunk', 'fact', 'snapshot', 'category')) NOT NULL,
  source TEXT CHECK (source IN ('slack', 'notion', 'github', 'gdrive', 'email', 'jira', 'voice', 'conversation', 'manual')) DEFAULT 'manual',
  content TEXT NOT NULL,
  embedding VECTOR(1536),
  confidence FLOAT DEFAULT 0.5,
  metadata JSONB DEFAULT '{}',
  occurred_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Messages (flat chat history — conversation_id groups messages together)
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clone_id UUID REFERENCES clones(id) ON DELETE CASCADE,
  conversation_id TEXT NOT NULL,
  role TEXT CHECK (role IN ('user', 'assistant', 'system')) NOT NULL,
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Integrations (OAuth credentials and config for connected services)
CREATE TABLE integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT CHECK (provider IN ('slack', 'github', 'notion', 'google_drive', 'jira', 'email')) UNIQUE NOT NULL,
  config JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 4: Create indexes
CREATE INDEX idx_memories_clone_id ON memories(clone_id);
CREATE INDEX idx_memories_type ON memories(clone_id, type);
CREATE INDEX idx_memories_source ON memories(clone_id, source);
CREATE INDEX idx_memories_occurred_at ON memories(occurred_at DESC);
CREATE INDEX idx_memories_embedding ON memories USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
CREATE INDEX idx_messages_clone_id ON messages(clone_id);
CREATE INDEX idx_messages_conversation ON messages(conversation_id);
CREATE INDEX idx_integrations_provider ON integrations(provider);

-- Step 5: Create vector similarity helper function
CREATE OR REPLACE FUNCTION match_memories(
  p_clone_id UUID,
  p_query_embedding VECTOR(1536),
  p_match_count INT DEFAULT 20,
  p_types TEXT[] DEFAULT ARRAY['fact', 'chunk']
)
RETURNS TABLE (
  id UUID,
  clone_id UUID,
  type TEXT,
  source TEXT,
  content TEXT,
  confidence FLOAT,
  metadata JSONB,
  occurred_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ,
  similarity FLOAT
)
LANGUAGE SQL
STABLE
AS $$
  SELECT
    m.id,
    m.clone_id,
    m.type,
    m.source,
    m.content,
    m.confidence,
    m.metadata,
    m.occurred_at,
    m.created_at,
    (1 - (m.embedding <=> p_query_embedding))::float AS similarity
  FROM memories m
  WHERE m.clone_id = p_clone_id
    AND m.embedding IS NOT NULL
    AND (p_types IS NULL OR m.type = ANY(p_types))
  ORDER BY m.embedding <=> p_query_embedding
  LIMIT GREATEST(p_match_count, 1);
$$;
