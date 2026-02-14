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
  doc_type TEXT CHECK (doc_type IN ('slack_message', 'document', 'meeting_notes', 'email')) DEFAULT 'document',
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

-- Indexes for performance
CREATE INDEX idx_chunks_clone_id ON chunks(clone_id);
CREATE INDEX idx_chunks_embedding ON chunks USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
CREATE INDEX idx_memories_clone_id ON memories(clone_id);
CREATE INDEX idx_memories_embedding ON memories USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
CREATE INDEX idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX idx_conversations_clone_id ON conversations(clone_id);
CREATE INDEX idx_clone_interactions_conversation ON clone_interactions(conversation_id);
