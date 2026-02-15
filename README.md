# AI Clone Platform

Treehacks project for creating and chatting with "AI clones" that use organizational memory and integrations (Slack, Google, GitHub, Notion, etc.).

## Project Layout

- `frontend/`: Next.js 16 app (UI + API routes).
- `backend/memory/`: Memory retrieval, compaction, and provider switching (Supabase or Mem0).
- `backend/modal/`: Python helpers for clone reasoning, embeddings, STT, and TTS (for Modal-hosted inference services).
- `backend/supabase/`: SQL schema and migration scripts.

## Prerequisites

- Node.js 20+
- npm
- Supabase project (recommended for full memory features)
- OpenAI API key
- Python 3.11+ (only if you want to run or extend `backend/modal`)

## Quick Start

### 1) Install frontend dependencies

```bash
cd frontend
npm install
```

### 2) Create environment file

Create `frontend/.env.local`:

```bash
OPENAI_API_KEY=your_openai_key

# Supabase (required for persisted memory and clone data)
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
USE_SUPABASE_MEMORY=true
MEMORY_PROVIDER=supabase

# App URLs (used in OAuth callbacks)
NEXT_PUBLIC_BASE_URL=http://localhost:3000
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Optional: external memory provider
# MEMORY_PROVIDER=mem0
# MEM0_API_KEY=...
# MEM0_BASE_URL=https://api.mem0.ai
# MEM0_AUTH_SCHEME=Token
# MEM0_ADD_PATH=/v2/memories/
# MEM0_SEARCH_PATH=/v2/memories/search/
# MEM0_FILTER_FIELD=user_id

# Optional: integrations
# GITHUB_TOKEN=...
# NOTION_API_KEY=...
# GOOGLE_CLIENT_ID=...
# GOOGLE_CLIENT_SECRET=...
# GOOGLE_SERVICE_ACCOUNT_JSON=...   # or set GOOGLE_SERVICE_ACCOUNT_KEY_FILE
# GOOGLE_SERVICE_ACCOUNT_KEY_FILE=service-account.json
# SLACK_CLIENT_ID=...
# SLACK_CLIENT_SECRET=...
# SLACK_BOT_TOKEN=...
# PERPLEXITY_API_KEY=...

# Optional: external Modal service URL
# MODAL_BASE_URL=http://localhost:8000
```

### 3) Initialize database schema

In your Supabase SQL editor, run:

- `backend/supabase/schema.sql` for clean setup, or
- `backend/supabase/migrate.sql` if you are migrating from older tables.

### 4) Run the app

```bash
cd frontend
npm run dev
```

Open `http://localhost:3000`.

## Modal / Python Backend Notes

`backend/modal/` currently contains reusable Python modules (`agent.py`, `embed.py`, `stt.py`, `tts.py`) and Modal app/image config in `app.py`. If you deploy these as an HTTP service, point `MODAL_BASE_URL` to that service so the frontend can call endpoints like:

- `/agent/run`
- `/embed`
- `/stt/transcribe`
- `/tts/synthesize`

Install Python dependencies with:

```bash
cd backend/modal
pip install -r requirements.txt
```

## Scripts

From `frontend/`:

- `npm run dev`: start local dev server
- `npm run build`: production build
- `npm run start`: run production server
- `npm run lint`: run ESLint

## Memory Provider Behavior

- `MEMORY_PROVIDER=supabase`: reads/writes memory in Supabase (recommended default).
- `MEMORY_PROVIDER=mem0`: routes memory context lookups through Mem0 when configured.
- If Mem0 fails at runtime, code attempts Supabase fallback when `USE_SUPABASE_MEMORY=true` and Supabase credentials are available.
