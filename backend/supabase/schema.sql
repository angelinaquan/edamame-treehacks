-- AI Clone Platform Database Schema (Consolidated)
-- Run this in your Supabase SQL editor

-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

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

-- Memories (all clone knowledge: documents, chunks, facts, snapshots, categories, episodic)
--   type: what kind of memory this is
--   source: where it came from
--   metadata: type-specific fields (title, author, channel_id, repo, doc_type, etc.)
--   For type='episodic', metadata contains: event_type, participants, location,
--     emotional_valence, causal_context, outcome, conversation_id
CREATE TABLE memories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clone_id UUID REFERENCES clones(id) ON DELETE CASCADE,
  type TEXT CHECK (type IN ('document', 'chunk', 'fact', 'snapshot', 'category', 'episodic')) NOT NULL,
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

-- Indexes
CREATE INDEX idx_memories_clone_id ON memories(clone_id);
CREATE INDEX idx_memories_type ON memories(clone_id, type);
CREATE INDEX idx_memories_source ON memories(clone_id, source);
CREATE INDEX idx_memories_occurred_at ON memories(occurred_at DESC);
CREATE INDEX idx_memories_embedding ON memories USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
CREATE INDEX idx_messages_clone_id ON messages(clone_id);
CREATE INDEX idx_messages_conversation ON messages(conversation_id);
CREATE INDEX idx_integrations_provider ON integrations(provider);

-- Vector similarity search function for semantic retrieval
CREATE OR REPLACE FUNCTION match_memories(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.5,
  match_count int DEFAULT 10,
  p_clone_id uuid DEFAULT NULL,
  p_type text DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  clone_id uuid,
  type text,
  source text,
  content text,
  confidence float,
  metadata jsonb,
  occurred_at timestamptz,
  created_at timestamptz,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
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
    1 - (m.embedding <=> query_embedding) as similarity
  FROM memories m
  WHERE m.embedding IS NOT NULL
    AND (p_clone_id IS NULL OR m.clone_id = p_clone_id)
    AND (p_type IS NULL OR m.type = p_type)
    AND 1 - (m.embedding <=> query_embedding) > match_threshold
  ORDER BY m.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
