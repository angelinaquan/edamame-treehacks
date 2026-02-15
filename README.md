# Edamame

AI clones for organizational memory. Edamame ingests knowledge from Slack, Google Drive, Gmail, GitHub, Notion, and Jira to create digital twin clones of every person in your organization — queryable 24/7 in text or voice, with source citations and continual learning.

Built at TreeHacks 2025.

## Features

- **Clone Chat** — Talk to any employee's digital twin in text or voice. Personality-aware responses with inline source citations. Clones learn from every conversation via fact extraction and episodic memory.
- **CEO Insights** — Multi-clone sentiment analysis. Ask a strategic question and poll all clones simultaneously for per-person stances, confidence scores, and aggregated themes. Animated agent network visualization shows the query in real-time.
- **Onboarding Briefs** — Auto-generated "here's what you need to know" docs for new hires: key people, recent decisions, open risks.
- **Offboarding Handoff Packs** — When someone leaves, their clone generates ownership areas, unresolved work, key links, and suggested new owners.
- **Knowledge Base** — Semantic search across all ingested memories with source and type filtering.
- **Clone-to-Clone Consultation** — When a clone doesn't know something, it consults other clones via an agent-to-agent protocol.
- **Voice I/O** — Full spoken conversations with clones using Whisper (STT) and OpenAI TTS.
- **Real-time Slack Learning** — Webhook-driven ingestion. Clones absorb new Slack messages as they're sent.
- **Synthetic Data Generation** — Seeded deterministic generator creates realistic Slack messages, Drive docs, GitHub commits, emails, Jira tickets, and Notion pages for demos.

## Architecture

```
├── frontend/              Next.js 16 app (UI + API routes)
│   ├── app/               Pages and API routes
│   │   ├── page.tsx       Landing / auth page
│   │   ├── ceo/           CEO view (insights, clones, knowledge)
│   │   ├── employee/      Employee view (chat, coworkers, knowledge)
│   │   ├── (app)/         Dashboard, settings, clone management
│   │   └── api/
│   │       ├── orgpulse/  Clone chat, insights, onboarding, offboarding
│   │       ├── chat/      General chat endpoint
│   │       ├── voice/     Whisper transcription + TTS synthesis
│   │       ├── ingest/    Data ingestion + synthetic generation
│   │       ├── memory/    Memory search + compaction
│   │       ├── clones/    Clone CRUD
│   │       ├── slack/     Slack OAuth, sync, webhook events
│   │       ├── google-drive/ Drive sync
│   │       ├── gmail/     Gmail sync
│   │       ├── github/    GitHub sync
│   │       ├── notion/    Notion sync
│   │       └── auth/      Google OAuth flow
│   ├── components/
│   │   ├── orgpulse/      InsightsView, ClonesView, EmployeeChatView,
│   │   │                  KnowledgeView, AgentNetworkView, Sidebars
│   │   ├── chat/          ChatWindow, MessageBubble, ThinkingPanel
│   │   ├── voice/         VoiceButton, Waveform
│   │   ├── dashboard/     CloneGrid, CloneCard, ConversationLog
│   │   └── clone-builder/ PersonalityForm, DocumentUpload
│   └── lib/
│       ├── agents/        OpenAI client, clone-brain prompting,
│       │                  collaboration (clone-to-clone), Perplexity
│       ├── core/          Types, Supabase client, chunker, utils
│       ├── integrations/  Slack, Google, GitHub, Notion connectors
│       ├── memory/        Frontend memory search helpers
│       └── orgpulse/      OrgPulse API client + types
├── backend/
│   ├── memory/            Memory system: retrieval, compaction,
│   │   │                  continual learning, episodic extraction
│   │   └── synthetic/     Synthetic data generators (Slack, Drive,
│   │                      email, GitHub, Jira, Notion, world builder)
│   ├── modal/             Python modules for Modal deployment
│   │                      (agent, embed, STT, TTS)
│   └── supabase/          SQL schema + migrations
└── synthetic_corpus/      Pre-generated demo data
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16, React 19, TypeScript, Tailwind CSS |
| Database | Supabase (PostgreSQL + pgvector) |
| LLM | OpenAI GPT-4o |
| Embeddings | text-embedding-3-small (1536-d), IVFFlat indexing |
| Voice | Whisper-1 (STT), TTS-1 with Nova voice |
| Integrations | Slack API, Google OAuth (Drive + Gmail), Octokit (GitHub), Notion API |
| ML Infra | Modal (optional, for hosted inference) |
| Memory | Supabase (primary), Mem0 (optional fallback) |

## Prerequisites

- Node.js 20+
- npm
- Supabase project with pgvector extension
- OpenAI API key
- Python 3.11+ (only for `backend/modal/`)

## Quick Start

### 1. Install dependencies

```bash
cd frontend
npm install
```

### 2. Configure environment

Copy `.env.example` to `frontend/.env.local` and fill in your keys (OpenAI, Supabase, and optionally Google OAuth, Slack, GitHub, Notion).

### 3. Initialize database

Run `backend/supabase/schema.sql` in your Supabase SQL editor. This creates:

- `clones` — One per person, includes personality and expertise tags
- `memories` — Unified knowledge store with type discriminators (`document`, `chunk`, `fact`, `snapshot`, `category`, `episodic`) and source tags (`slack`, `gdrive`, `email`, `github`, `notion`, `jira`, `voice`, `conversation`)
- `messages` — Flat chat history grouped by conversation
- `integrations` — OAuth credentials and sync config
- `match_memories` — pgvector cosine similarity search function

If migrating from an older schema, use `backend/supabase/migrate.sql` instead.

### 4. Run the app

```bash
cd frontend
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### 5. (Optional) Generate synthetic data

Hit `POST /api/ingest/synthetic` with a clone ID to populate a clone with realistic demo data across all sources.

## How Memory Works

All clone knowledge lives in a single `memories` table:

1. **Ingestion** — Data from Slack, Drive, Gmail, GitHub, Notion, Jira is synced and chunked (500-token segments with 50-token overlap)
2. **Embedding** — Each chunk/fact gets a 1536-d embedding via `text-embedding-3-small`
3. **Retrieval** — Semantic vector search via `match_memories` RPC with keyword fallback. Results are re-ranked using a composite score: `similarity + recencyBonus(occurred_at)`
4. **Continual Learning** — Conversations trigger fact extraction and episodic memory extraction. Near-duplicates (similarity > 0.88) are reinforced instead of duplicated
5. **Compaction** — Weekly summarization rolls up stale facts into category summaries. Monthly rewind creates snapshots

## Scripts

From `frontend/`:

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server |
| `npm run build` | Production build |
| `npm run start` | Run production server |
| `npm run lint` | Run ESLint |

## Modal (Python Backend)

`backend/modal/` contains optional Python modules for Modal-hosted inference:

- `agent.py` — Clone reasoning
- `embed.py` — Embedding generation
- `stt.py` — Speech-to-text
- `tts.py` — Text-to-speech
- `multi_agent.py` — Multi-agent orchestration

Set `MODAL_BASE_URL` in your env to point to the deployed Modal service.

```bash
cd backend/modal
pip install -r requirements.txt
```
