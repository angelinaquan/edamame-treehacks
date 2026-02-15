-- AI Clone Platform Database Schema
-- Run this in your Supabase SQL editor

-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Organizations
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Users
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  avatar_url TEXT,
  role TEXT CHECK (role IN ('owner', 'manager', 'member')) DEFAULT 'member',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Clones (one per user)
CREATE TABLE clones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  owner_id UUID UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  avatar_url TEXT,
  personality JSONB DEFAULT '{}',
  expertise_tags TEXT[] DEFAULT '{}',
  status TEXT CHECK (status IN ('untrained', 'training', 'active', 'inactive')) DEFAULT 'untrained',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  trained_at TIMESTAMPTZ
);

-- Documents uploaded for clone training
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clone_id UUID REFERENCES clones(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT,
  file_url TEXT,
  doc_type TEXT CHECK (doc_type IN ('slack_message', 'document', 'meeting_notes', 'email', 'notion_page', 'github_commit', 'jira_ticket', 'gdrive_doc')) DEFAULT 'document',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Chunks (embedded pieces of documents)
CREATE TABLE chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
  clone_id UUID REFERENCES clones(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  embedding VECTOR(1536),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Conversations
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clone_id UUID REFERENCES clones(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  title TEXT,
  mode TEXT CHECK (mode IN ('text', 'voice')) DEFAULT 'text',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Messages within conversations
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  role TEXT CHECK (role IN ('user', 'assistant', 'system')) NOT NULL,
  content TEXT NOT NULL,
  reasoning TEXT,
  tool_calls JSONB,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Clone-to-clone interactions
CREATE TABLE clone_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  caller_clone_id UUID REFERENCES clones(id) ON DELETE CASCADE,
  target_clone_id UUID REFERENCES clones(id) ON DELETE CASCADE,
  query TEXT NOT NULL,
  response TEXT,
  depth INTEGER DEFAULT 0,
  latency_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Long-term memories extracted from conversations
CREATE TABLE memories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clone_id UUID REFERENCES clones(id) ON DELETE CASCADE,
  fact TEXT NOT NULL,
  embedding VECTOR(1536),
  source_conversation_id UUID REFERENCES conversations(id),
  confidence FLOAT DEFAULT 0.5,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Memory ingestion and compaction runs
CREATE TABLE memory_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clone_id UUID REFERENCES clones(id) ON DELETE CASCADE,
  trigger_type TEXT CHECK (trigger_type IN ('manual', 'scheduled', 'mcp_sync')) DEFAULT 'manual',
  seed TEXT,
  sources TEXT[] DEFAULT '{}',
  status TEXT CHECK (status IN ('running', 'completed', 'failed')) DEFAULT 'running',
  resources_count INTEGER DEFAULT 0,
  items_count INTEGER DEFAULT 0,
  categories_count INTEGER DEFAULT 0,
  projected_documents_count INTEGER DEFAULT 0,
  projected_chunks_count INTEGER DEFAULT 0,
  projected_memories_count INTEGER DEFAULT 0,
  error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Layer 0: immutable raw resources normalized from integrations
CREATE TABLE memory_resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clone_id UUID REFERENCES clones(id) ON DELETE CASCADE,
  run_id UUID REFERENCES memory_runs(id) ON DELETE SET NULL,
  source_type TEXT CHECK (source_type IN ('slack', 'notion', 'github', 'jira', 'gdrive', 'email', 'voice')) NOT NULL,
  external_id TEXT NOT NULL,
  title TEXT,
  author TEXT,
  content TEXT NOT NULL,
  occurred_at TIMESTAMPTZ DEFAULT NOW(),
  modality TEXT CHECK (modality IN ('text', 'audio', 'image', 'video')) DEFAULT 'text',
  media_url TEXT,
  transcript TEXT,
  source_metadata JSONB DEFAULT '{}'::jsonb,
  raw_payload JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Layer 1: extracted atomic facts/items
CREATE TABLE memory_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clone_id UUID REFERENCES clones(id) ON DELETE CASCADE,
  resource_id UUID REFERENCES memory_resources(id) ON DELETE CASCADE,
  source_type TEXT CHECK (source_type IN ('slack', 'notion', 'github', 'jira', 'gdrive', 'email', 'voice')) NOT NULL,
  fact TEXT NOT NULL,
  normalized_fact TEXT,
  category_key TEXT,
  importance FLOAT DEFAULT 0.5,
  confidence FLOAT DEFAULT 0.5,
  occurred_at TIMESTAMPTZ DEFAULT NOW(),
  embedding VECTOR(1536),
  metadata JSONB DEFAULT '{}'::jsonb,
  compaction_state TEXT CHECK (compaction_state IN ('active', 'weekly_summarized', 'monthly_rewound')) DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Layer 2: evolving category summaries (including monthly rewind snapshots)
CREATE TABLE memory_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clone_id UUID REFERENCES clones(id) ON DELETE CASCADE,
  category_type TEXT CHECK (category_type IN ('topic', 'person', 'project', 'timeline')) NOT NULL,
  category_key TEXT NOT NULL,
  summary TEXT NOT NULL,
  item_count INTEGER DEFAULT 0,
  confidence FLOAT DEFAULT 0.5,
  time_window_start TIMESTAMPTZ,
  time_window_end TIMESTAMPTZ,
  last_item_at TIMESTAMPTZ,
  embedding VECTOR(1536),
  metadata JSONB DEFAULT '{}'::jsonb,
  is_monthly_snapshot BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_chunks_clone_id ON chunks(clone_id);
CREATE INDEX idx_chunks_embedding ON chunks USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
CREATE INDEX idx_memories_clone_id ON memories(clone_id);
CREATE INDEX idx_memories_embedding ON memories USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
CREATE INDEX idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX idx_conversations_clone_id ON conversations(clone_id);
CREATE INDEX idx_clone_interactions_conversation ON clone_interactions(conversation_id);
CREATE INDEX idx_memory_runs_clone_id ON memory_runs(clone_id);
CREATE INDEX idx_memory_runs_status ON memory_runs(status);
CREATE INDEX idx_memory_resources_clone_id ON memory_resources(clone_id);
CREATE INDEX idx_memory_resources_source_type ON memory_resources(source_type);
CREATE INDEX idx_memory_resources_occurred_at ON memory_resources(occurred_at DESC);
CREATE INDEX idx_memory_items_clone_id ON memory_items(clone_id);
CREATE INDEX idx_memory_items_resource_id ON memory_items(resource_id);
CREATE INDEX idx_memory_items_state ON memory_items(compaction_state);
CREATE INDEX idx_memory_items_embedding ON memory_items USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
CREATE INDEX idx_memory_categories_clone_id ON memory_categories(clone_id);
CREATE INDEX idx_memory_categories_type_key ON memory_categories(clone_id, category_type, category_key);
CREATE INDEX idx_memory_categories_snapshot ON memory_categories(clone_id, is_monthly_snapshot);
CREATE INDEX idx_memory_categories_embedding ON memory_categories USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);