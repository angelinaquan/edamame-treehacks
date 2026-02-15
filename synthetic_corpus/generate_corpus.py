#!/usr/bin/env python3
"""
Deterministic synthetic corpus generator for the OrgPulse hackathon team.

Generates internally-consistent, cross-referenced collaboration artifacts
for a 4-person TreeHacks team building an AI-native memory layer demo.

Usage:
    python generate_corpus.py --out synthetic_corpus --seed 42 --days 12
"""

import argparse
import json
import os
import random
import textwrap
from datetime import datetime, timedelta
from typing import Any

# ════════════════════════════════════════════════════════════════
#  SCHEMAS & ID GENERATION
# ════════════════════════════════════════════════════════════════

BASE_DATE = datetime(2026, 2, 3, 9, 0, 0)  # Mon Feb 3 2026 9 AM PT

_counters: dict[str, int] = {}

def _next_id(prefix: str) -> str:
    _counters[prefix] = _counters.get(prefix, 0) + 1
    return f"{prefix}-{_counters[prefix]:03d}"

def reset_ids():
    _counters.clear()

# ════════════════════════════════════════════════════════════════
#  PERSONAS
# ════════════════════════════════════════════════════════════════

PEOPLE = [
    {
        "id": "james",
        "name": "James Liu",
        "role": "Strategy & Demo Narrative Lead",
        "school": "Stanford",
        "tells": [
            "starts messages with 'look,' or 'here's the thing —'",
            "uses em dashes extensively",
            "drops articles: 'need to ship' not 'we need to ship'",
            "recurring phrase: 'judges will eat this up'",
            "recurring phrase: 'are we being bold enough?'",
            "ends with action-oriented directives",
        ],
        "biases": [
            "Pushes for bold features that win prizes over safe choices",
            "Cuts scope aggressively — prefers 3 polished features to 8 rough ones",
            "Narrative-driven: every feature must serve the demo story",
            "Impatient with ambiguity — wants fast decisions, will force a call",
            "Thinks 'judge wow factor' trumps technical elegance",
        ],
    },
    {
        "id": "angelina",
        "name": "Angelina Quan",
        "role": "Engineering Lead",
        "school": "MIT",
        "tells": [
            "uses bullet points and numbered lists even in Slack",
            "precise technical language, never vague",
            "starts with 'Let me push back —' or 'To be precise:'",
            "recurring phrase: 'the abstraction should be'",
            "recurring phrase: 'this feels brittle'",
            "references Cursor engineering practices",
        ],
        "biases": [
            "Correctness and reproducibility over speed",
            "Clean abstractions — hates special-casing",
            "Strong opinions about privacy boundaries in memory systems",
            "Pushes for evaluation rigor: 'if we can't measure it, it doesn't count'",
            "Skeptical of hacks that 'work in demo but break under scrutiny'",
        ],
    },
    {
        "id": "videet",
        "name": "Videet Mehta",
        "role": "Systems & Infrastructure",
        "school": "MIT",
        "tells": [
            "uses time estimates constantly: 'I can ship this by 6pm'",
            "starts messages with 'constraint:' or 'tradeoff:'",
            "recurring phrase: 'what's the fallback?'",
            "recurring phrase: 'will this survive a live demo?'",
            "cites concrete numbers: latencies, token counts, costs",
            "references Modal, pgvector internals, cold starts",
        ],
        "biases": [
            "Obsessed with shipping a working demo — nothing else matters",
            "Pragmatic tradeoffs: time-boxed decisions, fallback plans",
            "Performance-focused: latency, throughput, cold starts",
            "Integration-focused: how do the pieces actually connect?",
            "Will sacrifice elegance for reliability every time",
        ],
    },
    {
        "id": "ella",
        "name": "Ella Lan",
        "role": "Product & UX Lead",
        "school": "Stanford",
        "tells": [
            "frames everything from judge/user perspective",
            "uses questions to steer: 'but what does the judge actually see?'",
            "starts with 'stepping back —' or 'from the judge's chair:'",
            "recurring phrase: 'the story needs to be'",
            "recurring phrase: 'three minutes, they need to get it instantly'",
            "sketches user flows in text: 'screen 1 → screen 2 → aha moment'",
        ],
        "biases": [
            "Coherence and user flow over technical sophistication",
            "Insists on clear story + measurable 'why it works'",
            "Pushes for crisp UI that communicates instantly",
            "Wants every feature to be explainable in one sentence",
            "Judges have 200 projects to see — first 10 seconds decide everything",
        ],
    },
]

# ════════════════════════════════════════════════════════════════
#  CONTENT: DECISIONS
# ════════════════════════════════════════════════════════════════

def build_decisions() -> list[dict]:
    return [
        {
            "id": "dec-001", "day": 1,
            "title": "Core demo thesis: AI-native memory layer with digital twin clones",
            "proposer": "james",
            "status": "accepted",
            "rationale": "Memory loss is a universal org problem. Digital twins are visually compelling. RAG + embeddings is proven tech we can execute on in 12 days.",
            "dissent": {"angelina": "Need to define what 'memory' means precisely — episodic vs semantic vs procedural. Vague framing leads to vague architecture."},
            "follow_ups": ["dec-002", "doc-arch"],
            "references": [],
        },
        {
            "id": "dec-002", "day": 2,
            "title": "Unified memories table with type discriminators over separate tables per source",
            "proposer": "angelina",
            "status": "accepted",
            "rationale": "One table with (source_type, memory_type, embedding) columns. pgvector index on embedding. Simpler schema, source-agnostic queries, extensible without migrations.",
            "dissent": {"videet": "Worried about index bloat — mixing 500-token chunks and 1-sentence facts in the same vector space might hurt retrieval quality. Can we at least partition the IVFFlat index?"},
            "follow_ups": ["doc-schema", "dec-003"],
            "references": ["doc-arch"],
        },
        {
            "id": "dec-003", "day": 2,
            "title": "Memory type taxonomy: document → chunk → fact → category",
            "proposer": "angelina",
            "status": "accepted",
            "rationale": "Four-level hierarchy: raw documents are chunked (500 tokens), facts are extracted (atomic claims), categories are clustered summaries. Each level has embeddings.",
            "dissent": {"james": "Four levels feels over-engineered for a hackathon. Do we really need 'category'? Can we ship with just chunk + fact?"},
            "follow_ups": ["doc-schema"],
            "references": ["dec-002"],
        },
        {
            "id": "dec-004", "day": 3,
            "title": "text-embedding-3-small (1536d) over text-embedding-3-large (3072d)",
            "proposer": "videet",
            "status": "accepted",
            "rationale": "Latency: 40ms vs 120ms per call. Storage: half the vector size. Quality delta is <2% on our eval set. For real-time chat, latency wins.",
            "dissent": {"angelina": "We haven't actually measured the quality delta on OUR data. '< 2%' is from OpenAI's benchmark, not org memory retrieval. Can we at least A/B test?"},
            "follow_ups": ["dec-008"],
            "references": ["doc-arch"],
        },
        {
            "id": "dec-005", "day": 4,
            "title": "Plain RAG over GraphRAG-lite for MVP",
            "proposer": "videet",
            "status": "accepted",
            "rationale": "GraphRAG requires entity extraction + relationship storage + graph traversal. That's 3 more components to build and debug. Plain RAG with reranking gets us 80% of the quality in 20% of the time.",
            "dissent": {"james": "GraphRAG would be a differentiator. Every other hackathon team does plain RAG. If we can show entity-relationship reasoning, judges will notice.", "angelina": "If we do GraphRAG, we need proper entity resolution and deduplication. Half-built GraphRAG is worse than no GraphRAG."},
            "follow_ups": ["doc-retrieval"],
            "references": ["dec-002", "dec-004"],
        },
        {
            "id": "dec-006", "day": 5,
            "title": "MVP demo features: 5 not 8",
            "proposer": "james",
            "status": "accepted",
            "rationale": "Cut: Jira sync, Notion sync, voice cloning. Keep: clone chat, CEO insights, continual learning, onboarding briefs, live Slack learning. 5 polished > 8 broken.",
            "dissent": {"ella": "I actually think we should cut to 4. The onboarding brief might confuse judges — it's a different use case from clone chat. Keep the story tight."},
            "follow_ups": ["doc-demo"],
            "references": ["dec-001"],
        },
        {
            "id": "dec-007", "day": 5,
            "title": "Shared Google OAuth for Drive + Gmail (one consent screen)",
            "proposer": "ella",
            "status": "accepted",
            "rationale": "One OAuth flow, one consent screen, both Drive and Gmail access. Better UX, less code, fewer tokens to manage.",
            "dissent": {},
            "follow_ups": [],
            "references": [],
        },
        {
            "id": "dec-008", "day": 6,
            "title": "Continual learning: extract facts from every chat turn, embed, store",
            "proposer": "james",
            "status": "accepted",
            "rationale": "After each user message, GPT-4o extracts atomic facts, generates embeddings, stores as memory_type='fact'. Clone gets smarter over time. This is the demo wow moment.",
            "dissent": {"angelina": "Extracting facts from every single message is noisy. 'Hi how are you' generates garbage facts. We need a relevance filter — minimum information density threshold.", "videet": "Each extraction adds ~800ms to the response loop. Can we do it async? Fire-and-forget after the response streams."},
            "follow_ups": ["dec-012"],
            "references": ["dec-003", "doc-schema"],
        },
        {
            "id": "dec-009", "day": 7,
            "title": "Two-round decision rehearsal: independent stances → cross-influence → diff",
            "proposer": "james",
            "status": "accepted",
            "rationale": "Round 1: each clone gives independent stance. Round 2: clones see each other's positions, can update. Show the DIFF. Judges see AI agents actually deliberating, not just parroting.",
            "dissent": {"ella": "This is confusing to explain in 30 seconds. 'The AIs argue with each other and change their minds' — can we make it visual? Like a before/after sentiment bar?", "videet": "Two rounds means 2x the LLM calls per query. With 4 clones that's 8 calls. Latency will be 15-20 seconds. Can we parallelize round 1?"},
            "follow_ups": ["doc-retrieval"],
            "references": ["dec-006"],
        },
        {
            "id": "dec-010", "day": 8,
            "title": "Reranking with cross-encoder before LLM context injection",
            "proposer": "angelina",
            "status": "accepted",
            "rationale": "Top-20 from pgvector → cross-encoder reranker → top-5 injected into prompt. Reduces hallucination from irrelevant chunks. Cost: ~200ms extra latency.",
            "dissent": {"videet": "200ms is a lot when we're already at 3-4 seconds per response. Can we cache the reranking results for repeated queries?"},
            "follow_ups": ["dec-013"],
            "references": ["dec-004", "dec-005"],
        },
        {
            "id": "dec-011", "day": 9,
            "title": "Citation format: inline [Source N] markers with expandable footnotes",
            "proposer": "ella",
            "status": "accepted",
            "rationale": "Clone responses include [1], [2] etc. Click to expand shows source snippet + metadata. Visual proof the AI isn't hallucinating. Judges love evidence.",
            "dissent": {"james": "Inline citations might clutter the response. Can we do a collapsible 'Sources' section at the bottom instead?"},
            "follow_ups": [],
            "references": ["dec-010"],
        },
        {
            "id": "dec-012", "day": 9,
            "title": "INCIDENT: Wrong citation in clone chat — chunk from wrong person attributed",
            "proposer": "angelina",
            "status": "resolved",
            "rationale": "Root cause: clone_id filter was missing from the pgvector query. All clones searched the global memory space. Marcus's clone cited Sarah's Slack messages as its own knowledge.",
            "dissent": {},
            "follow_ups": ["doc-postmortem", "dec-013"],
            "references": ["dec-010", "dec-008"],
        },
        {
            "id": "dec-013", "day": 10,
            "title": "Post-incident: add clone_id WHERE clause to ALL retrieval queries + raise reranker threshold to 0.7",
            "proposer": "angelina",
            "status": "accepted",
            "rationale": "Two fixes: (1) every pgvector search now includes WHERE clone_id = $1, (2) reranker confidence threshold raised from 0.4 to 0.7 to filter marginal matches.",
            "dissent": {"james": "0.7 threshold might be too aggressive — we'll get fewer citations which makes responses look less grounded. Can we do 0.6?", "videet": "I tested 0.5, 0.6, 0.7 on 20 test queries. 0.6 still lets through 2 wrong citations. 0.7 is clean. Going with 0.7."},
            "follow_ups": ["doc-eval"],
            "references": ["dec-012", "doc-postmortem"],
        },
        {
            "id": "dec-014", "day": 11,
            "title": "Demo order: CEO insights → clone chat → live Slack learning → onboarding brief",
            "proposer": "ella",
            "status": "accepted",
            "rationale": "Open big (multi-agent sentiment), go personal (1:1 clone chat), go live (Slack message → clone learns), close practical (onboarding doc). Narrative arc: org-wide → personal → real-time → actionable.",
            "dissent": {"james": "I wanted to open with clone chat because it's the most intuitive. But Ella's arc is better — it builds from impressive to intimate to live to practical."},
            "follow_ups": ["doc-demo"],
            "references": ["dec-006", "dec-009"],
        },
        {
            "id": "dec-015", "day": 11,
            "title": "Onboarding packet as demo feature: auto-generated 'first week' doc for new hires",
            "proposer": "ella",
            "status": "accepted",
            "rationale": "Pulls from memory layer: key people, recent decisions, risks, key docs. Shows practical enterprise value beyond just chatting. Judges want to see 'why would a company pay for this?'",
            "dissent": {"videet": "It's another API endpoint + frontend view to build in 3 days. Can we mock the data and just show the UI?", "angelina": "If we mock it, someone will ask 'is this real data?' and we'll have to say no. Let's wire it to real memories or cut it."},
            "follow_ups": ["doc-demo"],
            "references": ["dec-006"],
        },
        {
            "id": "dec-016", "day": 12,
            "title": "Backup plan: pre-recorded video if live demo crashes",
            "proposer": "videet",
            "status": "accepted",
            "rationale": "Record a flawless run-through as .mp4. If Supabase goes down or Modal cold-starts, switch to video. Losing 'live demo' points is better than showing a crash.",
            "dissent": {"james": "I hate backup videos — judges always know. But Videet's right, a crash is worse. Record it but pray we don't need it."},
            "follow_ups": [],
            "references": ["dec-014"],
        },
    ]


# ════════════════════════════════════════════════════════════════
#  CONTENT: SLACK MESSAGES
# ════════════════════════════════════════════════════════════════

def build_slack(decisions: list[dict]) -> list[dict]:
    """Build all Slack messages, organized by day and channel."""
    dec_map = {d["id"]: d for d in decisions}
    msgs: list[dict] = []

    def m(day, ch, author, text, refs=None, thread=None):
        mid = _next_id("msg")
        msgs.append({
            "id": mid, "day": day, "channel": ch,
            "author": author, "text": textwrap.dedent(text).strip(),
            "references": refs or {},
            "thread_id": thread,
        })
        return mid

    # ── DAY 1: Kickoff ──────────────────────────────────
    t1 = m(1, "general", "james",
        """look, we have 12 days until TreeHacks demo. here's the thing — every other team will build a chatbot wrapper. we need something that makes judges stop scrolling. proposal: AI-native memory layer with digital twin clones. every org's knowledge — Slack, Drive, email — ingested, embedded, queryable through a clone that actually sounds like the person. judges will eat this up.""",
        refs={"decisions": ["dec-001"]})
    m(1, "general", "angelina",
        """Let me push back on one thing — "memory layer" is dangerously vague.

We need to decide upfront:
1. What counts as a "memory"? Raw docs? Extracted facts? Beliefs?
2. What's the retrieval contract? Top-K cosine sim? Filtered by person?
3. How do we handle conflicting information across sources?

If we don't nail the abstraction, we'll end up with a pile of embeddings and no coherent retrieval story. I've seen this at Cursor — vague data models lead to brittle systems.""",
        refs={"decisions": ["dec-001"]}, thread=t1)
    m(1, "general", "videet",
        """constraint: we have 12 days and 4 people. whatever we build needs to survive a live demo on janky conference wifi. my priorities:
- Supabase + pgvector (I can have this running by tonight)
- text-embedding-3-small for speed (40ms/call vs 120ms for large)
- Modal for any heavy compute (Whisper, batch embeddings)
- fallback for everything — if Modal cold-starts, we need a plan B

what's the fallback if pgvector is too slow on 10K+ memories?""",
        refs={"decisions": ["dec-001"]}, thread=t1)
    m(1, "general", "ella",
        """stepping back — before we get into architecture, what does the judge actually see? they have 3 minutes. they've seen 200 projects. the first 10 seconds decide everything.

I think the story needs to be:
screen 1: "ask a question to the whole org" → see multi-agent sentiment
screen 2: "drill into one person's clone" → 1:1 chat with citations
screen 3: "send a Slack message" → watch the clone learn it LIVE
screen 4: "generate an onboarding doc" → practical enterprise value

that's the arc: org-wide → personal → real-time → actionable. each screen is one sentence to explain.""",
        refs={"decisions": ["dec-001"]})
    m(1, "build", "angelina",
        """Starting on the data model. Here's my initial schema sketch for the memories table:

```sql
create table memories (
  id uuid primary key default gen_random_uuid(),
  clone_id uuid references clones(id),
  source_type text not null,  -- 'slack' | 'gdrive' | 'email' | 'github'
  memory_type text not null,  -- 'document' | 'chunk' | 'fact' | 'category'
  content text not null,
  embedding vector(1536),
  source_metadata jsonb default '{}',
  occurred_at timestamptz,
  created_at timestamptz default now()
);

create index on memories using ivfflat (embedding vector_cosine_ops) with (lists = 100);
```

Key decision: one table for everything. Type discriminators over separate tables. Thoughts?""",
        refs={"decisions": ["dec-002"], "docs": ["doc-schema"]})
    m(1, "build", "videet",
        """tradeoff: unified table is cleaner but I'm worried about the IVFFlat index mixing 500-token chunks with 1-sentence facts in the same vector space. the cluster centroids will be pulled in weird directions.

can we at least add a partial index? something like:
```sql
create index chunks_embedding_idx on memories
  using ivfflat (embedding vector_cosine_ops)
  where memory_type = 'chunk';
```
that way chunk retrieval isn't polluted by fact embeddings. I can benchmark this tonight.""",
        refs={"decisions": ["dec-002"]})
    m(1, "design", "ella",
        """first UI wireframe for the clone chat:

left panel: clone selector (avatar, name, role, expertise tags)
center: chat interface (streaming messages, citation markers [1] [2])
right: "continual learning" panel showing new facts being extracted in real-time

the right panel is KEY — it's the visual proof that the clone is getting smarter. judges need to see the system learning, not just responding.""")

    # ── DAY 2: Architecture ──────────────────────────────
    m(2, "build", "angelina",
        """To be precise: I'm proposing a four-level memory hierarchy.

1. **document**: raw ingested content (a Slack channel dump, a Drive file)
2. **chunk**: 500-token segment of a document, with its own embedding
3. **fact**: atomic extracted claim ("James prefers RAG over fine-tuning"), with embedding + confidence score
4. **category**: clustered summary across multiple facts ("Team generally favors pragmatic approaches over novel ones")

Retrieval searches chunks (for grounded answers) and facts (for belief-level queries). Categories are for the CEO insights aggregation.

ref: dec-003""",
        refs={"decisions": ["dec-003"], "docs": ["doc-schema"]})
    m(2, "build", "james",
        """four levels feels over-engineered for a hackathon. do we really need 'category'? that's a clustering job we'd need to run periodically. can we ship with chunk + fact and add category as a stretch goal?

here's the thing — every hour we spend on abstraction elegance is an hour we don't spend on demo features. judges don't grade schema design.""",
        refs={"decisions": ["dec-003"]})
    m(2, "build", "angelina",
        """Counter: category is what powers the CEO insights view. When the CEO asks "what does the team think about our timeline?" — we need pre-aggregated theme clusters, not raw chunks. Without category, the insights view is just... a search bar.

I'll implement it as a background job that runs after fact extraction. Lightweight k-means on fact embeddings, GPT summary per cluster. ~50 lines of code.

This is an abstraction worth having.""",
        refs={"decisions": ["dec-003"]})
    m(2, "build", "videet",
        """I benchmarked the partial index approach:
- unified index (all memory_types): avg query 47ms on 5K rows
- partitioned index (chunks only): avg query 31ms on 5K rows
- delta: 16ms, ~34% faster for chunk retrieval

going with partitioned. I'll create separate indexes for chunks and facts. categories don't need vector search — they're accessed by clone_id + topic.""",
        refs={"decisions": ["dec-002"], "docs": ["doc-schema"]})
    m(2, "design", "ella",
        """but what does the judge actually see when we say "memory hierarchy"? they don't care about document → chunk → fact → category. they care about:

1. "I asked the clone a question and it gave a specific, cited answer" (chunks)
2. "The clone remembers something I told it 5 minutes ago" (facts)
3. "The CEO can see what the whole team thinks" (categories → insights)

let's frame the hierarchy through these three user stories, not through database terminology.""")

    # ── DAY 3: Retrieval Design ──────────────────────────
    t3 = m(3, "build", "james",
        """retrieval pipeline proposal:
1. embed query with text-embedding-3-small
2. pgvector cosine similarity → top-20 chunks
3. rerank with cross-encoder → top-5
4. inject top-5 into GPT-4o system prompt
5. stream response with inline citation markers

question: should we add a GraphRAG layer? entity extraction → relationship graph → multi-hop retrieval. it would let the clone answer questions like "who worked with Marcus on the auth module?" which plain RAG can't do.""",
        refs={"decisions": ["dec-005"], "docs": ["doc-retrieval"]})
    m(3, "build", "videet",
        """constraint: GraphRAG is 3 more components — entity extractor, graph store (probably Neo4j or just Supabase with a join table), and a traversal query layer. that's at least 2 days of work for one person.

tradeoff: is multi-hop reasoning worth 2 days? what percentage of demo queries actually need it?

my recommendation: ship plain RAG with reranking. if we finish early, I can bolt on a lightweight entity table in Supabase (no Neo4j). but don't plan for it.""",
        refs={"decisions": ["dec-005"]}, thread=t3)
    m(3, "build", "angelina",
        """Let me push back on both sides.

Plain RAG with good reranking is fine for 90% of queries. But the CEO insights view specifically needs cross-person reasoning — "compare what James thinks vs what Ella thinks about X." That's not multi-hop graph traversal, it's just querying multiple clones and aggregating.

If we build GraphRAG, we need proper entity resolution (is "James" == "James Liu" == "jamesliu535b"?). Half-built GraphRAG with duplicate entities is worse than no GraphRAG.

Decision: plain RAG for clone chat, multi-clone parallel query for insights. No graph.""",
        refs={"decisions": ["dec-005"]}, thread=t3)
    m(3, "build", "ella",
        """from the judge's chair: they won't ask "does this use GraphRAG?" they'll ask "did the AI give a good answer with evidence?" 

plain RAG with clear citations beats GraphRAG with confusing multi-hop chains. keep it simple, make it work, show the evidence.""",
        refs={"decisions": ["dec-005"]}, thread=t3)
    m(3, "build", "videet",
        """decision: plain RAG. ref: dec-005.

here's my implementation plan for the retrieval pipeline:
- pgvector search with cosine distance, LIMIT 20
- WHERE clone_id = $1 AND memory_type IN ('chunk', 'fact')
- pass top-20 to cross-encoder reranker (I'll use a lightweight model on Modal)
- take top-5 above threshold 0.4
- format as numbered sources in the system prompt
- return source metadata alongside the streamed response

I can ship this by end of day tomorrow.""",
        refs={"decisions": ["dec-005", "dec-010"], "docs": ["doc-retrieval"]})

    # ── DAY 4: Retrieval Deep-Dive ──────────────────────
    m(4, "build", "angelina",
        """Videet — I reviewed your retrieval code. Two issues:

1. The WHERE clause doesn't filter by clone_id. This means Marcus's clone will retrieve Sarah's Slack messages. That's a correctness bug, not a performance issue.

2. The reranker threshold is 0.4 — that's very permissive. I tested with 20 queries and 3 of them returned chunks that were topically related but factually wrong person. We need at least 0.6.

This is exactly the kind of "works in demo but breaks under scrutiny" issue I keep flagging.""",
        refs={"decisions": ["dec-010"]})
    m(4, "build", "videet",
        """you're right on #1 — that's a bug, fixing now. WHERE clone_id = $1 added.

on #2: 0.4 vs 0.6 is a tradeoff. higher threshold = fewer but more precise citations. lower = more citations but risk of wrong-person attribution. I'll run a proper eval tonight — 50 test queries, measure precision@5 at thresholds 0.4, 0.5, 0.6, 0.7.

will this survive a live demo? yes if we get the threshold right. no if we guess.""",
        refs={"decisions": ["dec-010"]})
    m(4, "design", "ella",
        """question for the team: how should citations look in the UI?

option A: inline markers [1] [2] with hover tooltip showing source
option B: collapsible "Sources" section at the bottom of each response
option C: side panel that updates as the response streams

I'm leaning toward A — inline markers are what judges expect from AI products (Perplexity, ChatGPT with browsing). It's familiar and it proves the answer is grounded.""",
        refs={"decisions": ["dec-011"]})
    m(4, "design", "james",
        """inline citations might clutter the response. but ella's right — judges expect them now. let's do inline markers with a small expandable footnote section below each message. click [1] and it shows the source snippet + metadata. best of both worlds.

also — we should log every retrieval trace. which chunks were retrieved, reranked scores, which were injected into context. not for the demo UI, but for our postmortem / eval. ref: doc-eval""",
        refs={"decisions": ["dec-011"], "docs": ["doc-eval"]})

    # ── DAY 5: MVP Scoping ──────────────────────────────
    t5 = m(5, "general", "james",
        """alright let's get brutal about scope. here's my cut list:

KEEP (demo-critical):
1. Clone chat with RAG + citations ← core experience
2. CEO insights with multi-clone sentiment ← differentiator
3. Continual learning from chat ← wow moment
4. Live Slack learning (webhook) ← "it's REAL" moment
5. Onboarding brief generation ← enterprise value proof

CUT:
- Jira integration (nice-to-have, not demo-critical)
- Notion integration (same)
- Voice clone mode (too risky — TTS quality is inconsistent)
- GraphRAG (dec-005: already cut)
- Offboarding handoff packs (cool but confuses the narrative)

5 features. 7 days left. doable?""",
        refs={"decisions": ["dec-006"]})
    m(5, "general", "ella",
        """stepping back — I actually think we should cut to 4. here's why:

the onboarding brief is a DIFFERENT use case from clone chat. clone chat = "talk to a person's AI twin." onboarding brief = "auto-generate a document." mixing them in a 3-minute demo might confuse judges.

the story needs to be tight:
1. ask the org a question (insights)
2. drill into one person (clone chat)
3. watch it learn live (Slack webhook)
4. see the evidence (citations + learning panel)

four acts. one story. no detours.""",
        refs={"decisions": ["dec-006"]}, thread=t5)
    m(5, "general", "james",
        """counterpoint: the onboarding brief is the "so what?" moment. judges will think "cool chatbot" unless we show a concrete enterprise use case. "when someone joins your company, OrgPulse generates their first-week briefing automatically" — that's the pitch that makes VCs lean in.

keeping it. but ella's right about narrative focus — we'll show it LAST, as the "and there's more" closer. 30 seconds max.""",
        refs={"decisions": ["dec-006", "dec-015"]}, thread=t5)
    m(5, "general", "angelina",
        """Fine with 5 features IF we have real eval metrics for each one. I'm tired of hackathon demos where everything "works" but nobody measured anything.

My proposal for eval plan:
- Clone chat: measure retrieval precision@5 on 50 test queries
- Insights: measure stance accuracy vs ground truth on 10 scenarios
- Learning: measure fact extraction recall (did it capture the key info?)
- Citations: measure attribution accuracy (is [1] actually the right source?)

ref: doc-eval""",
        refs={"decisions": ["dec-006"], "docs": ["doc-eval"]})
    m(5, "build", "videet",
        """shipping update: retrieval pipeline is live. end-to-end flow working:
1. user sends message → embed with text-embedding-3-small (42ms avg)
2. pgvector top-20 (31ms avg with partitioned index)
3. cross-encoder rerank (180ms on Modal)
4. top-5 injected into GPT-4o-mini context
5. streamed response via SSE

total cold path: ~2.5 seconds. warm path (embedding cached): ~1.8 seconds.

will this survive a live demo? yes, if Modal doesn't cold-start. I added a keep-alive ping every 5 min to prevent it.""",
        refs={"decisions": ["dec-004", "dec-010"]})

    # ── DAY 6: Continual Learning ────────────────────────
    m(6, "build", "james",
        """continual learning design. after every user message in clone chat:
1. GPT-4o extracts atomic facts from the message (structured output)
2. each fact gets embedded + stored as memory_type='fact'
3. facts appear in the "Continual Learning" panel in real-time
4. next query, the clone has MORE context to draw from

the clone literally gets smarter with every conversation. judges will eat this up.

question: should extraction be sync (block response) or async (fire-and-forget)?""",
        refs={"decisions": ["dec-008"]})
    m(6, "build", "videet",
        """async, 100%. extraction adds ~800ms if we do it inline. the user doesn't need to wait for fact storage before seeing the clone's response.

implementation: after the SSE stream finishes, fire a background POST to /api/memory/extract with the conversation context. extraction + embedding + storage happens asynchronously. the learning panel polls every 2 seconds.

what's the fallback if extraction fails? nothing — the clone just doesn't learn that turn. silent failure is fine here.""",
        refs={"decisions": ["dec-008"]})
    m(6, "build", "angelina",
        """Let me push back on "extract from every message." The input "hi how are you" generates garbage facts. We need a relevance filter.

Proposal:
1. Before extraction, run a quick classifier: "does this message contain extractable information?" (simple GPT call, ~100ms)
2. Only extract from messages that pass the filter
3. Set a minimum confidence threshold for extracted facts (0.7)

This prevents the memory store from filling with noise. Quality of facts > quantity of facts.""",
        refs={"decisions": ["dec-008"]})
    m(6, "design", "ella",
        """the learning panel is the visual payoff. here's my design:

when a new fact is extracted:
1. show "Extracting..." with a spinning indicator (amber)
2. transition to "Stored" with a green checkmark
3. show the fact text + source attribution
4. timestamp

old facts scroll down, new ones appear at top. the panel should feel like a live feed of the clone "thinking."

from the judge's chair: this is the moment they go "oh, it's actually learning." make it feel alive.""")

    # ── DAY 7: Decision Rehearsal ────────────────────────
    t7 = m(7, "build", "james",
        """here's the feature I think wins us the hackathon: two-round decision rehearsal.

CEO asks: "should we discontinue Product X?"

round 1: each clone gives INDEPENDENT stance (support/neutral/oppose) with reasoning + evidence. no clone sees what the others said.

round 2: each clone sees the OTHER clones' positions. they can UPDATE their stance. show the DIFF — who changed their mind and why.

this is AI agents actually DELIBERATING, not just answering. nobody at TreeHacks is showing this. judges will eat this up.""",
        refs={"decisions": ["dec-009"]})
    m(7, "build", "videet",
        """constraint: two rounds means 2x LLM calls. with 4 clones:
- round 1: 4 parallel calls (~3 sec with Promise.all)
- round 2: 4 sequential calls (each needs round 1 context) (~12 sec)
- total: ~15 seconds for a full rehearsal

that's a LOT of wait time in a demo. can we:
1. parallelize round 2 as well? (each clone only needs its OWN round-1 answer + others' answers)
2. stream round 2 responses as they come in?

I can ship this by tomorrow evening if we parallelize both rounds.""",
        refs={"decisions": ["dec-009"]}, thread=t7)
    m(7, "design", "ella",
        """but what does the judge actually see during those 15 seconds? a spinner? that's death.

proposal: show each clone's round-1 response as it arrives. animated entry. then show a "deliberation" phase with the agent visualization — particles flying between nodes. then round-2 updates appear as diffs.

the WAITING becomes the show. the judge watches the AI system think.

ref: the agent topology visualization Angelina built.""",
        refs={"decisions": ["dec-009"]}, thread=t7)
    m(7, "build", "angelina",
        """I can make the deliberation phase visually compelling. When round 2 starts, the agent topology lights up — particles fly from each clone to every other clone, showing them "reading" each other's positions. Nodes pulse. The event stream panel shows the cross-influence events.

Then each clone's updated stance appears with a highlighted diff. Changed opinions get a yellow "UPDATED" badge.

This is a 4-hour build but worth it for the demo impact.""",
        refs={"decisions": ["dec-009"]}, thread=t7)

    # ── DAY 8: Implementation Sprint ─────────────────────
    m(8, "build", "videet",
        """shipping update — end of day 8:

✅ RAG pipeline: live, benchmarked, cached
✅ Clone chat streaming: SSE endpoint working, avg 2.1 sec response
✅ Continual learning: async extraction with relevance filter
✅ Slack webhook: real-time message → clone memory (deduped)
⬜ CEO insights: round 1 working, round 2 in progress
⬜ Onboarding brief: API endpoint stubbed, needs template
⬜ Agent visualization: SVG topology done, particle animation in progress

biggest risk: Modal cold starts on the reranker. I've seen 30-second cold starts in testing. the keep-alive ping helps but isn't bulletproof.

what's the fallback? skip reranking and use raw pgvector top-5. quality drops but at least it responds.""",
        refs={"decisions": ["dec-010"]})
    m(8, "bugs", "angelina",
        """BUG REPORT — citation attribution error

Severity: CRITICAL
Discovered during eval testing.

Steps to reproduce:
1. Ask Marcus's clone: "what do you think about the launch timeline?"
2. Clone responds with citation [2] pointing to a Slack message
3. The cited message is FROM SARAH, not Marcus

Root cause hypothesis: the pgvector search query doesn't include a WHERE clone_id filter. The clone is searching the GLOBAL memory space, not just its own memories.

This is the exact bug I warned about in day 4. ref: dec-010.

Assigning to Videet — this is in the retrieval layer.""",
        refs={"decisions": ["dec-012"]})
    bug_thread = m(8, "bugs", "videet",
        """confirmed. the WHERE clause is missing. I thought I added it on day 4 but it only got added to the chunk search, not the fact search. the fact retrieval path is still unfiltered.

fixing now. also adding a test that verifies clone_id isolation — every returned memory must belong to the querying clone.

ETA: 1 hour.""",
        refs={"decisions": ["dec-012"]})
    m(8, "bugs", "james",
        """this is exactly the kind of bug that kills a demo. imagine the judge asks James's clone a question and it cites something Ella said. instant credibility loss.

Angelina — can we add a post-retrieval validation step? after reranking, verify that every returned chunk actually belongs to the right clone. belt AND suspenders.""",
        refs={"decisions": ["dec-012"]}, thread=bug_thread)

    # ── DAY 9: Hallucination Incident ────────────────────
    m(9, "bugs", "angelina",
        """POSTMORTEM: Wrong Citation Incident (dec-012)

**What happened:** Marcus's clone cited a Slack message that was actually from Sarah Kim. The clone presented Sarah's opinion as Marcus's knowledge. This would be catastrophic in a demo.

**Root cause:** Two retrieval paths in the codebase:
1. `searchChunks()` — had WHERE clone_id filter ✅
2. `searchFacts()` — did NOT have WHERE clone_id filter ❌

Facts extracted from Sarah's conversations were returned when querying Marcus's clone because the fact retrieval was searching the global memory space.

**Specific example:**
- Query: "What do you think about the auth module?" (to Marcus's clone)
- Retrieved fact: "The auth module needs a complete rewrite" (fact-id: fact-0847)
- Source: Sarah Kim's Slack message in #build on Feb 6 (msg-089)
- Marcus has never commented on the auth module

**Fixes applied:**
1. Added WHERE clone_id = $1 to `searchFacts()` — ref: dec-013
2. Raised reranker threshold from 0.4 to 0.7 — ref: dec-013
3. Added post-retrieval clone_id assertion (belt and suspenders)
4. Added automated test: clone isolation check on 50 queries

**Lessons learned:**
- Test retrieval isolation early, not after building the whole chat UI
- Every query path needs the same filters — don't assume code was ported correctly
- The reranker threshold matters more than we thought — 0.4 was letting through marginal matches

ref: doc-postmortem""",
        refs={"decisions": ["dec-012", "dec-013"], "docs": ["doc-postmortem"]})
    m(9, "build", "videet",
        """threshold eval results:

| threshold | precision@5 | recall@5 | wrong-clone citations |
|-----------|------------|----------|----------------------|
| 0.4       | 0.72       | 0.91     | 3 / 50 queries       |
| 0.5       | 0.81       | 0.84     | 2 / 50 queries       |
| 0.6       | 0.89       | 0.76     | 2 / 50 queries       |
| 0.7       | 0.94       | 0.68     | 0 / 50 queries       |

0.7 is the first threshold with ZERO wrong-clone citations. recall drops to 0.68 which means fewer citations per response, but every citation is correct.

going with 0.7. ref: dec-013""",
        refs={"decisions": ["dec-013"]})
    m(9, "general", "james",
        """silver lining: the postmortem is actually great demo material. we can mention "we caught a subtle attribution bug, built evaluation metrics, and fixed it" — shows engineering rigor, not just hacking. judges respect that.

Angelina — can you add the eval metrics to the demo slides? precision@5, clone isolation accuracy, retrieval latency. numbers make us look legit.""",
        refs={"docs": ["doc-eval"]})
    m(9, "general", "ella",
        """stepping back — the hallucination incident actually gives us a great story beat. "we built the system, tested it rigorously, found a critical bug, and fixed it in 24 hours." that's a more compelling narrative than "everything worked perfectly the first time."

the postmortem doc is well-written. let's reference it in the demo if a judge asks about reliability.""",
        refs={"docs": ["doc-postmortem"]})

    # ── DAY 10: Recovery & Eval ──────────────────────────
    m(10, "build", "angelina",
        """Clone isolation test results after fix:

50 test queries across 4 clones:
- 0 wrong-clone citations (was 3 before fix)
- average precision@5: 0.94
- average retrieval latency: 73ms (pgvector) + 185ms (reranker) = 258ms
- fact extraction relevance filter: 78% of messages pass (22% filtered as low-info)

I'm satisfied with these numbers. The system is now correct AND fast enough for live demo.

Remaining concern: we haven't tested under concurrent load. What happens when the CEO insights view queries 4 clones simultaneously?""",
        refs={"decisions": ["dec-013"], "docs": ["doc-eval"]})
    m(10, "build", "videet",
        """tested concurrent load: 4 parallel clone queries + reranking.

- Supabase handles it fine (connection pool at 20)
- Modal reranker: first request is fast (warm), but requests 2-4 queue behind it. total round-trip: 3.2 seconds for all 4 clones.
- if I deploy 2 Modal replicas, it drops to 1.8 seconds. cost: $0.04/query. worth it.

will this survive a live demo? yes, with 2 replicas. deploying now.""")
    m(10, "design", "ella",
        """ok the learning panel design is finalized. here's the interaction:

1. user sends message → chat shows "thinking" with agent steps:
   ☐ Searching knowledge base
   ☐ Retrieving relevant memories
   ☐ Composing response

2. response streams in with [1] [2] citation markers

3. after response, the learning panel updates:
   ⟳ Extracting... "User mentioned they prefer approach B for auth"
   ✓ Stored (fact-1234, confidence: 0.89)

4. next query can reference the newly learned fact

that's the full loop. ingest → retrieve → respond → learn → repeat. judges see it happen in real-time.""")

    # ── DAY 11: Demo Script ──────────────────────────────
    t11 = m(11, "demo", "ella",
        """DEMO SCRIPT — v1 (3 minutes strict)

0:00-0:20 HOOK
"Every organization has a memory problem. Knowledge is scattered, people leave, context is lost. OrgPulse is an AI memory layer that captures everything and serves it through digital twin clones."

0:20-1:00 ACT 1 — CEO INSIGHTS (40 sec)
Type: "What does the team think about the SELFIMP deadline?"
→ agent topology visualization: particles flying between nodes
→ sentiment breakdown: 60% concerned, 25% supportive, 15% neutral
→ key themes auto-extracted

1:00-1:40 ACT 2 — CLONE CHAT (40 sec)
Click into James's clone
Ask: "What are the biggest technical risks right now?"
→ streaming response with inline citations [1] [2]
→ expand a citation to show the original Slack message

1:40-2:10 ACT 3 — LIVE LEARNING (30 sec)
Open Slack. Type: "We decided to go with approach B for the auth system"
→ switch to OrgPulse. Learning panel: "Extracting..." → "Stored"
→ ask clone: "What did we decide about auth?" → it knows!

2:10-2:40 ACT 4 — ONBOARDING BRIEF (30 sec)
"When someone joins, OrgPulse auto-generates their onboarding doc"
→ click Generate → show key people, decisions, risks, docs

2:40-3:00 CLOSE
"OrgPulse turns scattered knowledge into living organizational memory."
Tech stack slide. Q&A.

ref: dec-014""",
        refs={"decisions": ["dec-014", "dec-015"], "docs": ["doc-demo"]})
    m(11, "demo", "james",
        """love the structure. two tweaks:

1. the hook needs to be more visceral. not "organizations have a memory problem" — that's abstract. try: "Sarah quit last week. Everything she knew about the payments system is gone. Her replacement spends 3 weeks just figuring out who to ask about what. OrgPulse fixes this."

2. for the live learning moment — we need to rehearse the exact Slack message. something specific enough that the clone's answer is obviously grounded in what we just typed. not a generic "we decided X" but something with details the clone couldn't possibly know otherwise.

judges will eat this up if the live moment is crisp.""",
        refs={"decisions": ["dec-014"]}, thread=t11)
    m(11, "demo", "angelina",
        """Technical checklist for demo reliability:

1. ✅ Supabase connection pool: 20 connections
2. ✅ Modal reranker: 2 replicas, keep-alive every 5 min
3. ✅ Embedding cache: warm with test queries
4. ✅ Clone isolation: verified on 50 queries, 0 wrong attributions
5. ⬜ End-to-end dry run on conference wifi (need to test at venue)
6. ⬜ Backup video recorded

The system is stable but conference wifi is unpredictable. Videet — can we add request timeouts with graceful degradation? If reranker times out, fall back to raw pgvector top-5.""",
        refs={"decisions": ["dec-016"]}, thread=t11)
    m(11, "demo", "videet",
        """timeout fallback implemented:
- reranker: 3 second timeout → fallback to pgvector top-5
- embedding generation: 2 second timeout → fallback to cached embedding if available
- Supabase: 5 second timeout → show "connection issue, retrying..."

what's the fallback if EVERYTHING fails? the backup video. recording it tonight.

will this survive a live demo? with these fallbacks, yes. the worst case is slightly lower quality retrieval, not a crash.""",
        refs={"decisions": ["dec-016"]}, thread=t11)
    m(11, "general", "ella",
        """onboarding brief feature is live. here's what it generates:

given a role + team, it queries the memory layer and produces:
- Key People: who to meet, their role, a tip for connecting
- Recent Decisions: last 30 days of decisions from the memory layer
- Active Risks: flagged issues with severity ratings
- Key Documents: most-referenced docs from the team's memories

it's pulling from REAL data in the memory layer, not mocked. took 4 hours to build but it shows judges that OrgPulse has practical enterprise value beyond "cool chatbot."

ref: dec-015""",
        refs={"decisions": ["dec-015"]})

    # ── DAY 12: Final Polish ──────────────────────────────
    m(12, "general", "james",
        """FINAL DAY. demo is tonight. status check:

@angelina: frontend?
@videet: infrastructure?
@ella: product flow?

I need honest assessments. if something is broken, I'd rather cut it now than crash in front of judges.""")
    m(12, "general", "angelina",
        """Frontend status:
- ✅ Clone chat with streaming + citations + learning panel
- ✅ CEO insights with agent visualization + sentiment bars
- ✅ Knowledge base: onboarding briefs + memory explorer
- ✅ Dark theme: all components rethemed
- ✅ Agent topology: particles, glow effects, event stream
- ✅ Settings page: integration management

Known issues:
- Memory explorer search is slow on first load (cold Supabase query). Pre-warming on page load.
- Agent visualization sometimes flickers when 2 particles overlap. Minor cosmetic.

Overall: frontend is solid. I've tested every flow.""")
    m(12, "general", "videet",
        """Infrastructure status:
- ✅ Supabase: stable, 20 connection pool, pgvector indexes partitioned
- ✅ Modal: 2 reranker replicas, Whisper endpoint, keep-alive pings active
- ✅ Embeddings: cached, batch support, 42ms avg latency
- ✅ Timeouts: all endpoints have fallback paths
- ✅ Backup video: recorded, 2:58 long, on James's laptop

Known risks:
- Modal cold start: mitigated with keep-alive but not eliminated. first call after 10 min idle is still ~8 seconds.
- Supabase free tier: 500 MB storage limit. we're at 380 MB. should be fine for demo.

will this survive a live demo? 90% confident yes. 10% is conference wifi.""")
    m(12, "general", "ella",
        """Product flow status:
- ✅ Demo script: rehearsed 3 times, timing is tight but works
- ✅ Narrative arc: org-wide → personal → live → practical
- ✅ Onboarding brief: live data, looks great
- ✅ Learning panel: fact extraction + storage visualization
- ✅ Slides: 3 slides (problem, live demo, tech stack)

One concern: in rehearsal, the live Slack learning moment took 6 seconds from message send to learning panel update. That's a long pause in a demo. Can we optimize?""")
    m(12, "general", "videet",
        """6 seconds breakdown:
- Slack webhook receive: ~500ms
- fact extraction (GPT-4o): ~2 seconds
- embedding generation: ~800ms
- Supabase insert: ~200ms
- learning panel poll interval: ~2 seconds (worst case)

optimization: reduce poll interval from 2s to 500ms. that saves up to 1.5 seconds of perceived latency. also, we can fire the extraction and embedding in parallel since they're independent.

after optimization: estimated 3.5-4 seconds. still visible but much better. shipping the fix now.""")
    m(12, "demo", "james",
        """final rehearsal notes:

1. HOOK works. "Sarah quit and everything she knew is gone" gets attention.
2. CEO insights: agent visualization is incredible. judges visibly react when particles start flying.
3. Clone chat: citations expand correctly. response quality is strong.
4. Live learning: optimized to ~4 seconds. still a noticeable pause — fill it with narration ("watch the learning panel on the right...")
5. Onboarding brief: generates in ~3 seconds. looks professional.
6. Closing: "living organizational memory" — strong ending.

overall time: 2:52. tight but within 3 minutes.

we're ready. let's go win this thing.""",
        refs={"decisions": ["dec-014", "dec-016"]})

    return msgs


# ════════════════════════════════════════════════════════════════
#  CONTENT: DOCS (Markdown)
# ════════════════════════════════════════════════════════════════

DOCS = [
    {
        "id": "doc-arch",
        "filename": "architecture.md",
        "title": "OrgPulse — System Architecture",
        "author": "angelina",
        "created_day": 2,
        "updated_day": 10,
        "status": "final",
        "body": textwrap.dedent("""\
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
        """),
        "references": {"decisions": ["dec-002", "dec-003", "dec-005", "dec-008", "dec-009", "dec-010", "dec-012", "dec-013"]},
    },
    {
        "id": "doc-schema",
        "filename": "schema.md",
        "title": "OrgPulse — Database Schema",
        "author": "angelina",
        "created_day": 2,
        "updated_day": 9,
        "status": "final",
        "body": textwrap.dedent("""\
            # OrgPulse — Database Schema

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
        """),
        "references": {"decisions": ["dec-002", "dec-003", "dec-004", "dec-012", "dec-013"]},
    },
    {
        "id": "doc-retrieval",
        "filename": "retrieval.md",
        "title": "OrgPulse — Retrieval Pipeline Design",
        "author": "videet",
        "created_day": 3,
        "updated_day": 10,
        "status": "final",
        "body": textwrap.dedent("""\
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
        """),
        "references": {"decisions": ["dec-004", "dec-005", "dec-010", "dec-013", "dec-016"]},
    },
    {
        "id": "doc-demo",
        "filename": "demo_script.md",
        "title": "OrgPulse — Demo Script (FINAL)",
        "author": "ella",
        "created_day": 11,
        "updated_day": 12,
        "status": "final",
        "body": textwrap.dedent("""\
            # OrgPulse — Demo Script

            **Status:** Final | **Owner:** Ella Lan | **Last updated:** Day 12
            **Presenter:** James Liu | **Laptop operator:** Angelina Quan

            ## Timing: 3 minutes strict (ref: dec-014)

            ### 0:00–0:20 — HOOK (James speaks)
            "Sarah quit last week. Everything she knew about the payments system
            is gone. Her replacement spends three weeks just figuring out who to
            ask about what. OrgPulse fixes this — it's an AI memory layer that
            captures organizational knowledge and serves it through digital twin clones."

            ### 0:20–1:00 — ACT 1: CEO INSIGHTS (40 sec)
            - Angelina types: "What does the team think about the SELFIMP deadline?"
            - Agent topology visualization lights up — particles between nodes
            - Sentiment breakdown appears: support / neutral / oppose
            - Key themes auto-extracted with evidence
            - James: "The CEO sees the pulse of the entire organization in 30 seconds."

            ### 1:00–1:40 — ACT 2: CLONE CHAT (40 sec)
            - Angelina clicks into James's clone
            - Types: "What are the biggest technical risks right now?"
            - Response streams with inline citations [1] [2]
            - Angelina expands citation → shows original Slack message
            - James: "Every answer is grounded in real evidence, not hallucination."

            ### 1:40–2:10 — ACT 3: LIVE LEARNING (30 sec)
            - Angelina opens Slack, types: "We decided to go with approach B for the auth system"
            - Switches back to OrgPulse — Learning panel: "Extracting..." → "Stored"
            - Types: "What did we decide about auth?" → clone answers with the new fact
            - James: "The clone learned that 4 seconds ago. It gets smarter with every conversation."

            ### 2:10–2:40 — ACT 4: ONBOARDING BRIEF (30 sec)
            - Angelina clicks Knowledge Base → Onboarding
            - Selects role + team → clicks Generate
            - Brief appears: key people, recent decisions, risks, key docs
            - James: "When someone joins, OrgPulse auto-generates their first-week briefing."

            ### 2:40–3:00 — CLOSE
            - James: "OrgPulse turns scattered knowledge into living organizational memory.
              Built with Next.js, Supabase, pgvector, and OpenAI."
            - Tech stack slide appears
            - "Questions?"

            ## Backup Plan (ref: dec-016)
            Pre-recorded video on James's laptop desktop. Switch if:
            - Supabase goes down
            - Modal cold-starts exceed 10 seconds
            - Conference wifi drops

            ## Rehearsal Log
            - Rehearsal 1 (Day 12, 8 AM): 3:12 — cut 12 seconds from intro
            - Rehearsal 2 (Day 12, 9 AM): 2:58 — within time
            - Rehearsal 3 (Day 12, 10 AM): 2:52 — final timing
        """),
        "references": {"decisions": ["dec-006", "dec-014", "dec-015", "dec-016"]},
    },
    {
        "id": "doc-eval",
        "filename": "eval_plan.md",
        "title": "OrgPulse — Evaluation Plan",
        "author": "angelina",
        "created_day": 5,
        "updated_day": 10,
        "status": "final",
        "body": textwrap.dedent("""\
            # OrgPulse — Evaluation Plan

            **Status:** Final | **Owner:** Angelina Quan | **Last updated:** Day 10

            ## Principle
            If we can't measure it, it doesn't count. Every feature needs quantitative eval.

            ## Metrics

            ### 1. Retrieval Quality
            - **Precision@5:** fraction of top-5 results that are relevant (target: >0.9)
            - **Clone isolation:** fraction of queries with 0 wrong-clone citations (target: 1.0)
            - **Latency:** end-to-end query time (target: <3s warm, <4s cold)

            ### 2. Fact Extraction
            - **Recall:** fraction of key information captured from test messages (target: >0.7)
            - **Precision:** fraction of extracted facts that are actually correct (target: >0.85)
            - **Relevance filter accuracy:** true positive rate on info-density classification

            ### 3. Citation Accuracy
            - **Attribution correctness:** does [N] point to the right source? (target: 1.0)
            - **Source snippet relevance:** is the cited text actually supporting the claim?

            ### 4. CEO Insights
            - **Stance accuracy:** does the clone's stance match ground truth? (target: >0.8)
            - **Theme coherence:** are extracted themes meaningful and non-redundant?

            ## Test Set
            - 50 test queries across 4 clones (12-13 per clone)
            - 10 CEO insight scenarios with known ground-truth stances
            - 20 fact extraction test messages with labeled key information

            ## Results (as of Day 10, post-incident fix)

            | Metric                  | Value  | Target | Status |
            |-------------------------|--------|--------|--------|
            | Precision@5             | 0.94   | >0.9   | ✅     |
            | Clone isolation         | 1.0    | 1.0    | ✅     |
            | Retrieval latency (warm)| 1.8s   | <3s    | ✅     |
            | Fact extraction recall  | 0.73   | >0.7   | ✅     |
            | Citation accuracy       | 1.0    | 1.0    | ✅     |
            | Wrong-clone citations   | 0/50   | 0      | ✅     |
        """),
        "references": {"decisions": ["dec-004", "dec-010", "dec-012", "dec-013"]},
    },
    {
        "id": "doc-postmortem",
        "filename": "postmortem.md",
        "title": "Postmortem — Wrong Citation Incident",
        "author": "angelina",
        "created_day": 9,
        "updated_day": 9,
        "status": "final",
        "body": textwrap.dedent("""\
            # Postmortem: Wrong Citation Incident

            **Date:** Day 9 | **Severity:** Critical | **Author:** Angelina Quan

            ## Summary
            Marcus's clone cited a Slack message from Sarah Kim as its own knowledge.
            The clone presented another person's opinion as if it were Marcus's.

            ## Timeline
            - Day 4: Videet adds WHERE clone_id to `searchChunks()`. Does NOT add it to `searchFacts()`.
            - Day 8: Angelina runs eval suite. Discovers 3/50 queries return wrong-clone facts.
            - Day 8: Bug filed. Root cause identified within 1 hour.
            - Day 9: Fix deployed. Threshold raised. Eval re-run: 0 violations.

            ## Root Cause
            Two retrieval paths in the codebase:
            1. `searchChunks(cloneId, query)` — had WHERE clone_id filter ✅
            2. `searchFacts(query)` — did NOT have clone_id filter ❌

            The `searchFacts` function was added later and the clone_id filter was
            not ported from `searchChunks`. Classic copy-paste omission.

            ## Specific Example
            - **Query:** "What do you think about the auth module?" (to Marcus's clone)
            - **Retrieved fact:** "The auth module needs a complete rewrite" (fact-0847)
            - **Actual source:** Sarah Kim's Slack message in #build, Day 6 (msg-089)
            - **Problem:** Marcus has never commented on the auth module.

            ## Fixes (ref: dec-013)
            1. Added `WHERE clone_id = $1` to `searchFacts()`
            2. Raised reranker confidence threshold from 0.4 to 0.7
            3. Added post-retrieval assertion: all returned memories must match clone_id
            4. Added automated test: 50-query clone isolation suite

            ## Lessons
            - Test retrieval isolation early, not after building the whole UI
            - Every query path needs the same filters — don't assume code was ported
            - The reranker threshold is a critical safety parameter, not a tuning knob
            - "Works in testing" ≠ "works correctly" — measure correctness explicitly
        """),
        "references": {"decisions": ["dec-010", "dec-012", "dec-013"]},
    },
]


# ════════════════════════════════════════════════════════════════
#  CONTENT: MEETINGS
# ════════════════════════════════════════════════════════════════

def build_meetings() -> list[dict]:
    return [
        {"id": "mtg-001", "day": 1, "title": "Kickoff sync",
         "transcript": textwrap.dedent("""\
            [00:00] James: OK let's lock the idea. AI-native memory layer with digital twin clones. Everyone in?
            [00:15] Angelina: In, but I want to define the memory abstraction precisely before we write any code. What counts as a memory? What's the retrieval contract?
            [00:35] Videet: In. I can have Supabase + pgvector running by tonight. What embedding model are we using?
            [00:45] James: text-embedding-3-small. Fast, cheap, good enough. We're not fine-tuning, we're shipping.
            [00:55] Angelina: "Good enough" isn't a metric. Can we at least benchmark small vs large on 50 test queries before committing?
            [01:10] Videet: I'll run the benchmark tonight. Constraint: large is 3x the latency and 2x the storage. For real-time chat, that matters.
            [01:25] Ella: Stepping back — what's the demo story? Judges have 3 minutes. What are the 4 screens they see?
            [01:40] James: 1) CEO asks the org a question — multi-clone sentiment. 2) Drill into one clone — 1:1 chat with citations. 3) Live learning — Slack message appears, clone learns it. 4) Onboarding brief — practical enterprise value.
            [02:00] Ella: That's a good arc. Org-wide → personal → real-time → actionable. Each screen is one sentence to explain.
            [02:15] Angelina: Agreed on the flow. But we need eval metrics for each screen. If we can't measure retrieval quality, we're just hoping it works.
            [02:30] James: Fine — Angelina owns eval. Videet owns infra. Ella owns product/UX. I'll own the demo narrative and RAG pipeline. Let's go.
         """),
         "references": {"decisions": ["dec-001"]}},

        {"id": "mtg-002", "day": 3, "title": "Retrieval design review",
         "transcript": textwrap.dedent("""\
            [00:00] James: Should we add GraphRAG? Entity extraction + relationship graph + multi-hop retrieval. It would let clones answer "who worked with X on Y?"
            [00:20] Videet: Constraint: that's 2+ days of work. Entity extraction alone is a pipeline. Then we need a graph store, traversal queries. Is multi-hop reasoning in our demo?
            [00:40] Angelina: Let me push back on both positions. Plain RAG with good reranking handles 90% of queries. The CEO insights view needs cross-PERSON reasoning, not cross-ENTITY reasoning. We query multiple clones in parallel, not traverse a graph.
            [01:00] Ella: From the judge's chair — they won't ask "does this use GraphRAG?" They'll ask "did the AI give a good answer with evidence?" Keep it simple.
            [01:15] James: Fine. Plain RAG for now. But I want us to at least stub the entity extraction so we can add it post-hackathon if this becomes a real product.
            [01:30] Angelina: No stubs. Stubs become tech debt. Either build it properly or don't build it. Decision: plain RAG with reranking. ref: dec-005.
            [01:45] Videet: Agreed. I'll have the reranker deployed on Modal by tomorrow. Cross-encoder model, 180ms avg latency, 2 replicas for concurrent queries.
         """),
         "references": {"decisions": ["dec-005"]}},

        {"id": "mtg-003", "day": 5, "title": "MVP scope lockdown",
         "transcript": textwrap.dedent("""\
            [00:00] James: Scope call. Here's my proposal: 5 features, not 8. Cut Jira, Notion, voice clone. Keep clone chat, CEO insights, continual learning, live Slack, onboarding briefs.
            [00:20] Ella: I'd actually cut to 4. The onboarding brief is a different use case — it might confuse judges. Keep the story tight.
            [00:35] James: Counter: onboarding brief is the "so what?" moment. It shows enterprise value beyond "cool chatbot." Keeping it, but showing it last.
            [00:50] Angelina: Fine with 5 IF we have eval metrics for each. No unmeasured features in the demo.
            [01:05] Videet: 5 features, 7 days, 4 people. That's ~1.4 features per person per week. Tight but doable if we stop debating and start building.
            [01:20] James: Deal. Features locked. No additions after today. If someone suggests a new feature, the answer is "post-hackathon." ref: dec-006.
         """),
         "references": {"decisions": ["dec-006"]}},

        {"id": "mtg-004", "day": 7, "title": "Decision rehearsal design",
         "transcript": textwrap.dedent("""\
            [00:00] James: I want to pitch the two-round decision rehearsal. This is the feature that wins us the hackathon.
            [00:15] James: Round 1: each clone gives independent stance. Round 2: they see each other's positions and can update. Show the diff. AI agents actually deliberating.
            [00:35] Videet: Constraint: that's 8 LLM calls per query. Round 1 is parallelizable (4 calls, ~3 sec). Round 2 depends on round 1 results. Total: ~15 seconds.
            [00:55] Ella: But what does the judge see during 15 seconds of waiting? A spinner? That's death.
            [01:10] Angelina: I can make the wait visual. Agent topology lights up, particles fly between nodes showing cross-influence. The waiting becomes the show.
            [01:25] Ella: That's good. The judge watches the AI system think. Can we stream round-1 responses as they arrive? Each clone's answer appears as soon as it's ready.
            [01:40] Videet: Yes — round 1 responses stream in via Promise.allSettled. Round 2 can also be parallelized since each clone only needs its own round-1 answer + the others.
            [01:55] James: So total latency drops to ~6-7 seconds with full parallelization? That's acceptable. Ship it. ref: dec-009.
         """),
         "references": {"decisions": ["dec-009"]}},

        {"id": "mtg-005", "day": 9, "title": "Hallucination incident postmortem",
         "transcript": textwrap.dedent("""\
            [00:00] Angelina: Postmortem. Marcus's clone cited Sarah's Slack message as its own knowledge. This is a critical correctness failure.
            [00:15] Videet: Root cause: I added the clone_id WHERE clause to searchChunks but missed searchFacts. Classic copy-paste bug.
            [00:30] Angelina: This is exactly why I keep saying "test retrieval isolation early." We caught it in eval, not in demo. We were lucky.
            [00:45] James: How do we make sure this never happens again?
            [01:00] Angelina: Three fixes: 1) clone_id filter on ALL retrieval paths, 2) raise reranker threshold from 0.4 to 0.7, 3) post-retrieval assertion that checks every returned memory belongs to the right clone.
            [01:20] James: 0.7 seems aggressive. Won't we lose citations?
            [01:30] Videet: I tested thresholds 0.4 through 0.7. At 0.7, precision@5 is 0.94 and wrong-clone citations are zero. Recall drops to 0.68 but every citation is correct. I'd rather have fewer correct citations than more wrong ones.
            [01:50] James: Fine. 0.7. But let's monitor — if responses feel too thin in the demo, we can drop to 0.6.
            [02:00] Angelina: No. 0.7. We don't compromise on correctness for aesthetics. ref: dec-013.
         """),
         "references": {"decisions": ["dec-012", "dec-013"]}},

        {"id": "mtg-006", "day": 11, "title": "Demo script review",
         "transcript": textwrap.dedent("""\
            [00:00] Ella: Demo script v1. Four acts: CEO insights, clone chat, live learning, onboarding brief. 3 minutes total.
            [00:15] James: The hook needs to be personal. Not "organizations have a memory problem" — that's abstract. "Sarah quit. Everything she knew is gone. Her replacement is lost." That's visceral.
            [00:30] Ella: Good. Updated. Who presents?
            [00:40] James: I'll present. I organized TreeHacks — I know the judging format. Angelina operates the laptop. Videet and Ella on standby for Q&A.
            [00:55] Angelina: Technical checklist: connection pool, Modal replicas, embedding cache, backup video. I want all of these verified before we walk into the venue.
            [01:10] Videet: I'll record the backup video tonight. 2:58 target. If everything crashes, we switch to video. Losing "live demo" points beats showing a crash.
            [01:25] Ella: One concern — the live Slack learning moment takes 6 seconds. That's a long pause. Can we optimize?
            [01:35] Videet: Poll interval is 2 seconds. I'll drop it to 500ms. Also parallelizing extraction and embedding. Estimated: 3.5-4 seconds. Fill the pause with narration.
            [01:50] James: Good. "Watch the learning panel on the right..." — we narrate through the wait. Three rehearsals tomorrow morning. Let's nail this.
         """),
         "references": {"decisions": ["dec-014", "dec-016"]}},
    ]


# ════════════════════════════════════════════════════════════════
#  CONTENT: BELIEFS
# ════════════════════════════════════════════════════════════════

def build_beliefs(messages: list[dict], decisions: list[dict]) -> list[dict]:
    beliefs: list[dict] = []

    def b(person, belief, confidence, evidence, topic):
        beliefs.append({
            "id": _next_id("belief"),
            "person": person,
            "belief": belief,
            "confidence": confidence,
            "evidence": evidence,
            "topic": topic,
        })

    # ── James ──
    b("james", "The demo narrative arc should be: org-wide → personal → real-time → actionable. Each screen is one sentence.", 0.95,
      [{"type": "decision", "id": "dec-014"}, {"type": "message", "id": "msg-001"}], "demo_strategy")
    b("james", "5 polished features beats 8 broken ones. Cut aggressively.", 0.92,
      [{"type": "decision", "id": "dec-006"}], "mvp_scope")
    b("james", "The live Slack learning moment is the single most important demo beat — it proves the system is real, not mocked.", 0.90,
      [{"type": "message", "id": "msg-001"}], "demo_strategy")
    b("james", "GraphRAG is a differentiator but not worth the implementation risk for a hackathon.", 0.75,
      [{"type": "decision", "id": "dec-005"}], "retrieval_design")
    b("james", "The two-round decision rehearsal is the feature that wins the hackathon — AI agents deliberating is novel.", 0.88,
      [{"type": "decision", "id": "dec-009"}], "features")
    b("james", "Onboarding briefs show enterprise value. Without it, we're 'just a chatbot.'", 0.85,
      [{"type": "decision", "id": "dec-015"}], "mvp_scope")
    b("james", "The hook needs to be personal and visceral, not abstract. 'Sarah quit and everything she knew is gone.'", 0.93,
      [{"type": "doc", "id": "doc-demo"}], "demo_strategy")
    b("james", "Inline citations are the proof that the clone isn't hallucinating. Every answer needs evidence.", 0.87,
      [{"type": "decision", "id": "dec-011"}], "retrieval_design")
    b("james", "The pivot journey — ambient listener → AI workforce → memory layer — is a strength in the narrative, not a weakness.", 0.80,
      [{"type": "message", "id": "msg-001"}], "demo_strategy")
    b("james", "Judges care about: 1) does the demo work, 2) is the problem real, 3) is the solution novel, 4) can you explain it in one sentence.", 0.95,
      [{"type": "decision", "id": "dec-001"}], "demo_strategy")
    b("james", "The reranker threshold of 0.7 might be too conservative — fewer citations makes responses look less grounded.", 0.60,
      [{"type": "decision", "id": "dec-013"}], "retrieval_design")
    b("james", "The category level in the memory hierarchy is worth building because it powers CEO insights.", 0.70,
      [{"type": "decision", "id": "dec-003"}], "memory_design")

    # ── Angelina ──
    b("angelina", "Every retrieval query MUST include a clone_id filter. Cross-clone data leakage is a critical correctness failure.", 0.99,
      [{"type": "decision", "id": "dec-012"}, {"type": "decision", "id": "dec-013"}, {"type": "doc", "id": "doc-postmortem"}], "retrieval_design")
    b("angelina", "The reranker threshold must be 0.7. We don't compromise on correctness for aesthetics.", 0.97,
      [{"type": "decision", "id": "dec-013"}], "retrieval_design")
    b("angelina", "The memory hierarchy should be document → chunk → fact → category. Four levels, clean abstraction.", 0.92,
      [{"type": "decision", "id": "dec-003"}, {"type": "doc", "id": "doc-schema"}], "memory_design")
    b("angelina", "If we can't measure it, it doesn't count. Every feature needs quantitative eval.", 0.95,
      [{"type": "doc", "id": "doc-eval"}], "evaluation")
    b("angelina", "Half-built GraphRAG is worse than no GraphRAG. Either build it properly or don't build it.", 0.90,
      [{"type": "decision", "id": "dec-005"}], "retrieval_design")
    b("angelina", "Fact extraction needs a relevance filter — extracting from 'hi how are you' generates garbage.", 0.88,
      [{"type": "decision", "id": "dec-008"}], "continual_learning")
    b("angelina", "The unified memories table with type discriminators is the right schema design. Extensible without migrations.", 0.94,
      [{"type": "decision", "id": "dec-002"}, {"type": "doc", "id": "doc-schema"}], "memory_design")
    b("angelina", "No stubs. Stubs become tech debt. Either build it properly or don't build it.", 0.91,
      [{"type": "meeting", "id": "mtg-002"}], "engineering")
    b("angelina", "The postmortem shows engineering rigor. We should reference it if judges ask about reliability.", 0.85,
      [{"type": "doc", "id": "doc-postmortem"}], "evaluation")
    b("angelina", "Test retrieval isolation early, not after building the whole chat UI.", 0.96,
      [{"type": "decision", "id": "dec-012"}], "engineering")
    b("angelina", "Partitioned pgvector indexes (separate for chunks and facts) are ~34% faster than unified indexes.", 0.88,
      [{"type": "doc", "id": "doc-schema"}], "memory_design")
    b("angelina", "The agent visualization makes the deliberation phase visually compelling. Worth the 4-hour build.", 0.82,
      [{"type": "decision", "id": "dec-009"}], "features")

    # ── Videet ──
    b("videet", "text-embedding-3-small (1536d) is the right choice. Latency delta vs large is 80ms per call. For real-time chat, that compounds.", 0.93,
      [{"type": "decision", "id": "dec-004"}, {"type": "doc", "id": "doc-retrieval"}], "retrieval_design")
    b("videet", "Modal cold starts are the #1 infrastructure risk. Keep-alive pings every 5 minutes mitigate but don't eliminate.", 0.90,
      [{"type": "doc", "id": "doc-retrieval"}], "infrastructure")
    b("videet", "Async fact extraction is correct. Adding 800ms of sync latency to every response is unacceptable.", 0.92,
      [{"type": "decision", "id": "dec-008"}], "continual_learning")
    b("videet", "The reranker threshold eval showed 0.7 is the first value with zero wrong-clone citations. Data doesn't lie.", 0.95,
      [{"type": "decision", "id": "dec-013"}], "retrieval_design")
    b("videet", "GraphRAG is 2+ days of work for one person. Not worth it when plain RAG with reranking handles 90% of queries.", 0.88,
      [{"type": "decision", "id": "dec-005"}], "retrieval_design")
    b("videet", "Every endpoint needs a timeout with a fallback. The worst case should be degraded quality, not a crash.", 0.94,
      [{"type": "decision", "id": "dec-016"}], "infrastructure")
    b("videet", "Two Modal reranker replicas reduce concurrent query latency from 3.2s to 1.8s. Cost: $0.04/query. Worth it.", 0.90,
      [{"type": "doc", "id": "doc-retrieval"}], "infrastructure")
    b("videet", "Partitioned pgvector indexes are 34% faster on chunk retrieval. Separate indexes for chunks and facts.", 0.91,
      [{"type": "decision", "id": "dec-002"}, {"type": "doc", "id": "doc-schema"}], "memory_design")
    b("videet", "The backup video is insurance, not defeat. A crash is worse than switching to pre-recorded.", 0.87,
      [{"type": "decision", "id": "dec-016"}], "demo_strategy")
    b("videet", "Embedding cache (text_hash → embedding) eliminates redundant API calls for repeated queries.", 0.89,
      [{"type": "doc", "id": "doc-retrieval"}], "infrastructure")
    b("videet", "The live Slack learning latency can be reduced from 6s to ~4s by parallelizing extraction and embedding.", 0.85,
      [{"type": "doc", "id": "doc-demo"}], "infrastructure")
    b("videet", "Connection pool must be at least 20 for concurrent CEO insights queries. Free tier limit is the constraint.", 0.88,
      [{"type": "doc", "id": "doc-schema"}], "infrastructure")

    # ── Ella ──
    b("ella", "The demo arc should be: org-wide → personal → real-time → actionable. Four acts, one story.", 0.95,
      [{"type": "decision", "id": "dec-014"}, {"type": "doc", "id": "doc-demo"}], "demo_strategy")
    b("ella", "Judges have 3 minutes and 200 projects. The first 10 seconds decide everything.", 0.93,
      [{"type": "decision", "id": "dec-014"}], "demo_strategy")
    b("ella", "The learning panel is the visual payoff — it proves the clone is getting smarter in real-time.", 0.91,
      [{"type": "decision", "id": "dec-008"}], "features")
    b("ella", "Inline citation markers [1] [2] are familiar from Perplexity and ChatGPT. Judges expect them.", 0.88,
      [{"type": "decision", "id": "dec-011"}], "retrieval_design")
    b("ella", "Shared Google OAuth for Drive + Gmail is cleaner UX — one consent screen instead of two.", 0.90,
      [{"type": "decision", "id": "dec-007"}], "engineering")
    b("ella", "The onboarding brief feature might confuse the narrative. It's a different use case from clone chat.", 0.65,
      [{"type": "decision", "id": "dec-006"}], "mvp_scope")
    b("ella", "Every feature needs to be explainable in one sentence. If you can't explain it, judges won't understand it.", 0.92,
      [{"type": "decision", "id": "dec-001"}], "demo_strategy")
    b("ella", "The waiting time during decision rehearsal should be THE show, not dead air. Agent visualization fills the gap.", 0.87,
      [{"type": "decision", "id": "dec-009"}], "features")
    b("ella", "The hook needs to be personal: 'Sarah quit and everything she knew is gone.' Not abstract: 'organizations have a memory problem.'", 0.90,
      [{"type": "doc", "id": "doc-demo"}], "demo_strategy")
    b("ella", "We should cut to 4 features, not 5. Tighter story, less risk.", 0.68,
      [{"type": "decision", "id": "dec-006"}], "mvp_scope")
    b("ella", "The live Slack learning moment is the 'aha' — the judge realizes the system is real, not a mockup.", 0.93,
      [{"type": "decision", "id": "dec-008"}], "demo_strategy")
    b("ella", "Conference wifi is unpredictable. All the engineering in the world doesn't help if the network drops.", 0.82,
      [{"type": "decision", "id": "dec-016"}], "infrastructure")

    return beliefs


# ════════════════════════════════════════════════════════════════
#  GENERATOR
# ════════════════════════════════════════════════════════════════

class CorpusGenerator:
    def __init__(self, seed: int, days: int):
        self.rng = random.Random(seed)
        self.days = min(days, 12)
        self.base_date = BASE_DATE
        reset_ids()

    def _timestamp(self, day: int, hour: float) -> str:
        dt = self.base_date + timedelta(days=day - 1, hours=hour)
        # jitter ±30 min
        jitter = self.rng.uniform(-0.5, 0.5)
        dt += timedelta(hours=jitter)
        return dt.strftime("%Y-%m-%dT%H:%M:%S")

    def _date_str(self, day: int) -> str:
        dt = self.base_date + timedelta(days=day - 1)
        return dt.strftime("%Y-%m-%d")

    def generate(self, out_dir: str):
        # Build content
        decisions = build_decisions()
        messages = build_slack(decisions)
        meetings = build_meetings()
        beliefs = build_beliefs(messages, decisions)

        # Filter to requested day count
        decisions = [d for d in decisions if d["day"] <= self.days]
        messages = [m for m in messages if m["day"] <= self.days]
        meetings = [m for m in meetings if m["day"] <= self.days]
        docs = [d for d in DOCS if d["created_day"] <= self.days]

        # Assign timestamps — monotonic per channel
        by_ch: dict[str, list] = {}
        for msg in messages:
            by_ch.setdefault(msg["channel"], []).append(msg)
        for ch, ch_msgs in by_ch.items():
            # Sort by day first, then assign spread-out times within each day
            ch_msgs.sort(key=lambda m: (m["day"], messages.index(m)))
            for i, msg in enumerate(ch_msgs):
                h = 9.0 + (i % 20) * 0.45 + self.rng.uniform(0, 0.2)
                dt = self.base_date + timedelta(days=msg["day"] - 1, hours=h)
                msg["timestamp"] = dt.strftime("%Y-%m-%dT%H:%M:%S")
        for dec in decisions:
            dec["date"] = self._date_str(dec["day"])
        for mtg in meetings:
            mtg["date"] = self._date_str(mtg["day"])
        for doc in docs:
            doc["created_date"] = self._date_str(doc["created_day"])
            doc["updated_date"] = self._date_str(min(doc["updated_day"], self.days))

        # ── Write output ──
        os.makedirs(out_dir, exist_ok=True)

        # people.json
        with open(os.path.join(out_dir, "people.json"), "w") as f:
            json.dump(PEOPLE, f, indent=2)

        # slack/
        slack_dir = os.path.join(out_dir, "slack")
        os.makedirs(slack_dir, exist_ok=True)
        by_day_channel: dict[str, list] = {}
        for msg in messages:
            key = f"{self._date_str(msg['day'])}_{msg['channel']}"
            by_day_channel.setdefault(key, []).append({
                k: v for k, v in msg.items() if k != "day"
            })
        for key, msgs in sorted(by_day_channel.items()):
            with open(os.path.join(slack_dir, f"{key}.json"), "w") as f:
                json.dump(msgs, f, indent=2)

        # docs/
        docs_dir = os.path.join(out_dir, "docs")
        os.makedirs(docs_dir, exist_ok=True)
        for doc in docs:
            frontmatter = (
                f"---\n"
                f"id: {doc['id']}\n"
                f"title: \"{doc['title']}\"\n"
                f"author: {doc['author']}\n"
                f"created: {doc['created_date']}\n"
                f"updated: {doc['updated_date']}\n"
                f"status: {doc['status']}\n"
                f"references: {json.dumps(doc['references'])}\n"
                f"---\n\n"
            )
            with open(os.path.join(docs_dir, doc["filename"]), "w") as f:
                f.write(frontmatter + doc["body"])

        # meetings/
        mtg_dir = os.path.join(out_dir, "meetings")
        os.makedirs(mtg_dir, exist_ok=True)
        for mtg in meetings:
            fname = f"{mtg['date']}_{mtg['title'].lower().replace(' ', '_')}.txt"
            header = (
                f"Meeting: {mtg['title']}\n"
                f"Date: {mtg['date']}\n"
                f"Attendees: James Liu, Angelina Quan, Videet Mehta, Ella Lan\n"
                f"References: {json.dumps(mtg['references'])}\n"
                f"{'=' * 60}\n\n"
            )
            with open(os.path.join(mtg_dir, fname), "w") as f:
                f.write(header + mtg["transcript"])

        # decisions/
        dec_dir = os.path.join(out_dir, "decisions")
        os.makedirs(dec_dir, exist_ok=True)
        clean_decs = [{k: v for k, v in d.items() if k != "day"} for d in decisions]
        with open(os.path.join(dec_dir, "decisions.json"), "w") as f:
            json.dump(clean_decs, f, indent=2)

        # beliefs/
        bel_dir = os.path.join(out_dir, "beliefs")
        os.makedirs(bel_dir, exist_ok=True)
        with open(os.path.join(bel_dir, "beliefs.json"), "w") as f:
            json.dump(beliefs, f, indent=2)

        # Summary
        topics_mentioned = set()
        topic_keywords = {
            "mvp_scope": ["cut", "scope", "feature", "keep"],
            "memory_design": ["chunk", "fact", "category", "document", "memory_type", "hierarchy"],
            "retrieval_design": ["retrieval", "rerank", "pgvector", "citation", "threshold", "cosine"],
            "graphrag": ["GraphRAG", "graph", "entity", "relationship", "multi-hop"],
            "continual_learning": ["learning", "extract", "fact", "smarter"],
            "decision_rehearsal": ["rehearsal", "round 1", "round 2", "deliberat", "stance"],
            "hallucination": ["hallucination", "wrong citation", "wrong-clone", "postmortem", "incident"],
            "onboarding": ["onboarding", "brief", "new hire", "first week"],
            "demo_script": ["demo", "script", "judge", "3 minutes", "hook"],
        }
        all_text = " ".join(m["text"] for m in messages)
        all_text += " ".join(d.get("body", "") for d in docs)
        for topic, keywords in topic_keywords.items():
            if any(kw.lower() in all_text.lower() for kw in keywords):
                topics_mentioned.add(topic)

        print(f"\n{'=' * 60}")
        print(f"  CORPUS GENERATED SUCCESSFULLY")
        print(f"{'=' * 60}")
        print(f"  Output:     {out_dir}/")
        print(f"  Seed:       {self.rng.getstate()[1][0]}")
        print(f"  Days:       {self.days}")
        print(f"  Messages:   {len(messages)}")
        print(f"  Docs:       {len(docs)}")
        print(f"  Meetings:   {len(meetings)}")
        print(f"  Decisions:  {len(decisions)}")
        print(f"  Beliefs:    {len(beliefs)}")
        per_person = {}
        for m in messages:
            per_person[m["author"]] = per_person.get(m["author"], 0) + 1
        print(f"  Per-person msgs: {json.dumps(per_person)}")
        bel_per = {}
        for b in beliefs:
            bel_per[b["person"]] = bel_per.get(b["person"], 0) + 1
        print(f"  Per-person beliefs: {json.dumps(bel_per)}")
        print(f"  Topics covered: {len(topics_mentioned)}/{len(topic_keywords)}")
        print(f"  Topics: {', '.join(sorted(topics_mentioned))}")
        print(f"{'=' * 60}\n")


# ════════════════════════════════════════════════════════════════
#  MAIN
# ════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Generate OrgPulse synthetic corpus")
    parser.add_argument("--out", default="output", help="Output directory")
    parser.add_argument("--seed", type=int, default=42, help="Random seed")
    parser.add_argument("--days", type=int, default=12, help="Number of days to simulate (max 12)")
    args = parser.parse_args()

    gen = CorpusGenerator(seed=args.seed, days=args.days)
    gen.generate(args.out)
