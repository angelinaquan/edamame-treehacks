import type { MemoryResourceInput } from "@/lib/core/types";
import type { SyntheticPerson, SyntheticProject, SyntheticWorld } from "./context";
import { randomIsoBetween, type SeededRng } from "./random";

interface NotionSourceMetadata extends Record<string, unknown> {
  source_type: "notion";
  page_id: string;
  workspace_id: string;
  last_edited_by: string;
  path: string[];
}

interface NotionGeneratorParams {
  world: SyntheticWorld;
  rng: SeededRng;
  count: number;
  startIso: string;
  endIso: string;
}

function buildNormalPage(
  project: SyntheticProject,
  editor: SyntheticPerson,
  world: SyntheticWorld,
  rng: SeededRng
): { title: string; content: string } {
  if (project.phase === "early") {
    return {
      title: "Ambient Listener — Brainstorm Notes",
      content: `TreeHacks 2026 — Brainstorm Session
Date: Feb 14, 2026 ~10:00 PM

Attendees: ${world.people.map((p) => p.name).join(", ")}

Idea: Always-on AI that passively captures audio and builds a searchable knowledge graph.

Discussion:
- ${world.people[0]?.name}: "What if your AI just... listened to everything and remembered it for you?"
- ${world.people[3]?.name}: "I can build the Whisper pipeline on Modal. Real-time transcription is doable."
- ${world.people[2]?.name}: "Love the concept but how do we demo 'always on' in a browser?"
- ${world.people[1]?.name}: "Chrome has MediaRecorder API. But background recording is hard."

Technical notes:
- Whisper large-v3 for transcription (tested: 1.8s for 30s clip)
- Supabase + pgvector for semantic storage
- Web Audio API for capture (foreground only)
- GPT-4o for fact extraction from transcripts

Risks flagged by ${editor.name}:
- iOS/Safari doesn't support background audio
- Chrome kills service workers after 30s inactivity
- Privacy UX — how do you show "I'm recording" without being creepy?
- Battery drain on laptops

Decision: Let's prototype for 2-3 hours. If we can't get background audio working, we pivot.`,
    };
  }

  if (project.phase === "mid") {
    return {
      title: "AI Workforce — Architecture Decision Record",
      content: `TreeHacks 2026 — ADR: Specialized Agent Architecture
Date: Feb 15, 2026 ~1:00 AM

Status: SUPERSEDED (pivoted to Edamame)

Context:
After abandoning the ambient listener, we decided to build an "AI Workforce" — a team of specialized AI agents, each fine-tuned on a domain.

Architecture:
1. Coordinator Agent: Classifies intent, routes to specialist
2. Specialist Agents: Legal, Finance, Engineering, Product
3. Each specialist has LoRA fine-tuned weights for domain expertise
4. Agents can consult each other via message-passing protocol

Decision Rationale:
- ${world.people[3]?.name} advocated strongly for fine-tuning (experience from Sarvam AI)
- ${world.people[0]?.name} pushed back — iteration too slow for hackathon format
- ${world.people[2]?.name} concerned about demo impact — "what does the user SEE?"

What We Learned:
- LoRA fine-tuning on Modal takes ~20 min per agent
- Can't iterate fast enough in a 12-hour hackathon
- System prompts + RAG can approximate "specialization" without fine-tuning
- The agent-to-agent communication protocol was actually good — reusing in Edamame

Decision: Pivot to Edamame (AI-native memory layer) at ~3:30 AM.
Keep: agent coordination code, Whisper pipeline
Discard: LoRA training setup, domain-specific datasets`,
    };
  }

  // Final phase
  const templates = [
    {
      title: "Edamame — Team Opinions & Direction (Honest Takes)",
      content: `Team Opinions on Edamame Direction
TreeHacks 2026 | Collected ~5 AM

Each team member's honest assessment of where we are and where we're going. Writing this down so we can reference it later and so the clones have context about our individual perspectives.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

JAMES LIU (ML & Backend Lead):

On Edamame as an idea:
${world.people.find(p => p.id === "u_james")?.opinions?.[0] || "Edamame is the strongest idea we've had all night."}

On the pivots:
${world.people.find(p => p.id === "u_james")?.opinions?.[1] || "The ambient listener was cool but not demoable."}

On scope:
${world.people.find(p => p.id === "u_james")?.opinions?.[3] || "We need to cut scope — 3 polished features beats 6 broken ones."}

On the demo:
${world.people.find(p => p.id === "u_james")?.opinions?.[5] || "Lead with CEO insights, then clone chat, then live learning."}

On the big picture:
${world.people.find(p => p.id === "u_james")?.opinions?.[6] || "The pivot journey IS part of our product story."}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ELLA LAN (Full-Stack Engineer):

On Edamame as an idea:
${world.people.find(p => p.id === "u_ella")?.opinions?.[0] || "Edamame is a great idea but reliability matters most."}

On the pivots:
${world.people.find(p => p.id === "u_ella")?.opinions?.[1] || "The ambient listener was technically infeasible from the start."}

On her work:
${world.people.find(p => p.id === "u_ella")?.opinions?.[3] || "The integrations are the plumbing that makes everything work."}

On reliability:
${world.people.find(p => p.id === "u_ella")?.opinions?.[4] || "The biggest risk is reliability, not features."}

On the big picture:
${world.people.find(p => p.id === "u_ella")?.opinions?.[11] || "Our integrations are REAL — that's our differentiator."}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ANGELINA QUAN (Product & Frontend):

On Edamame as an idea:
${world.people.find(p => p.id === "u_angelina")?.opinions?.[0] || "Edamame has the potential to be a real product."}

On the UI:
${world.people.find(p => p.id === "u_angelina")?.opinions?.[1] || "The dark theme was non-negotiable — it makes us look professional."}

On scope:
${world.people.find(p => p.id === "u_angelina")?.opinions?.[2] || "We should show the full vision — breadth is what wins hackathons."}

On her proudest work:
${world.people.find(p => p.id === "u_angelina")?.opinions?.[4] || "The agent network visualization is the thing I'm most proud of."}

On the big picture:
${world.people.find(p => p.id === "u_angelina")?.opinions?.[8] || "AI digital twins are the next big thing in enterprise."}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

VIDEET MEHTA (ML Infrastructure):

On Edamame vs other ideas:
${world.people.find(p => p.id === "u_videet")?.opinions?.[0] || "The ambient listener was the most novel idea."}

On the AI workforce:
${world.people.find(p => p.id === "u_videet")?.opinions?.[1] || "LoRA fine-tuning is the real deal but hackathon timing killed it."}

On his technical contributions:
${world.people.find(p => p.id === "u_videet")?.opinions?.[3] || "The embedding pipeline choices matter more than people realize."}

On what he's most proud of:
${world.people.find(p => p.id === "u_videet")?.opinions?.[4] || "The voice mode reuses Whisper from the ambient listener."}

On the hot take:
${world.people.find(p => p.id === "u_videet")?.opinions?.[8] || "The hackathon format is broken for ML projects."}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Where we agree:
• Edamame is the right idea for THIS hackathon (demoable, novel enough, real integrations)
• The pivot journey is an asset, not a liability — show it in the demo narrative
• Live Slack learning is the "wow moment" for judges
• We need approach B for auth (shared OAuth)

Where we disagree:
• Scope: Angelina wants full vision (8 features), James/Ella want to cut to 3-4 polished ones, Videet is neutral but leaning toward reliability
• Risk tolerance: Angelina is comfortable with some features being rough, Ella wants everything bulletproof
• What to emphasize: James wants CEO insights first (visual impact), Angelina wants clone chat first (personal experience), Videet wants live learning first (technical impressiveness)

Decision: We'll show 5 features in order: CEO insights → clone chat → live learning → onboarding brief → agent visualization. James presents, Angelina controls the laptop.`,
    },
    {
      title: "Edamame — Ideas We Killed and Why (Learning Log)",
      content: `Ideas We Killed and Why — TreeHacks 2026

This is a record of every idea we considered, who advocated for it, and why we ultimately moved on. Writing this for posterity and so the clones have context.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

IDEA 1: Ambient Listening AI (9:30 PM - 12:30 AM)

Champion: Videet
${world.people.find(p => p.id === "u_videet")?.opinions?.[0] || ""}

Skeptic: James
${world.people.find(p => p.id === "u_james")?.opinions?.[1] || ""}

Why we killed it:
- Chrome kills background audio service workers after 30 seconds (by design)
- iOS Safari has no background audio API at all
- The "always listening" UX felt creepy and would have been polarizing with judges
- After 3 hours, best we had was a glorified voice recorder

What survived: Whisper transcription pipeline (reused for Edamame voice mode)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

IDEA 2: AI Workforce — Specialized Agents (1:00 AM - 3:30 AM)

Champion: Videet
${world.people.find(p => p.id === "u_videet")?.opinions?.[1] || ""}

Skeptic: James
${world.people.find(p => p.id === "u_james")?.opinions?.[2] || ""}

Product perspective (Angelina):
${world.people.find(p => p.id === "u_angelina")?.opinions?.[6] || ""}

Why we killed it:
- LoRA fine-tuning takes 20+ minutes per agent on Modal A100
- Only 3 iteration cycles possible before demo — not enough for good quality
- "Specialization" was hard to demonstrate visually in 3 minutes
- Judges would ask "how is this different from different system prompts?" and we didn't have a great answer

What survived: Agent-to-agent communication protocol (reused for clone consultation in Edamame)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

IDEA 3: Edamame — AI-Native Memory Layer (3:30 AM - present) ✅ SHIPPED

Why this won:
- James: "${world.people.find(p => p.id === "u_james")?.opinions?.[0]?.slice(0, 200) || "The memory layer concept is technically novel but also extremely demoable."}"
- Ella: "${world.people.find(p => p.id === "u_ella")?.opinions?.[0]?.slice(0, 200) || "Edamame is a great idea but we need to focus on reliability."}"
- Angelina: "${world.people.find(p => p.id === "u_angelina")?.opinions?.[0]?.slice(0, 200) || "Edamame has the potential to be a real product."}"
- Videet: "${world.people.find(p => p.id === "u_videet")?.opinions?.[2]?.slice(0, 200) || "The memory layer concept is sound."}"

Key decisions made for Edamame:
1. Supabase + pgvector over a separate vector DB (Ella's call — simpler, cheaper, good enough)
2. text-embedding-3-small over large (Videet's call — faster, 1536-d is sufficient)
3. Cursor-inspired dark theme (Angelina's call — she works there, knows the aesthetic)
4. CEO insights as demo opener (James's call — visually impressive, shows multi-agent power)
5. Show 5 features not 8 (compromise between James's 3 and Angelina's 8)
6. Shared OAuth for Drive + Gmail (Ella's call, everyone agreed)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Meta-reflection:
The fact that we killed two ideas and still shipped a strong product in 6 hours says something about the team. Two IOAI gold medalists (Angelina + Videet), a SAIL researcher and TreeHacks organizer (James), and a full-stack engineer who made all the integrations actually work (Ella). Different perspectives, healthy disagreements, but ultimately converged on something we're all proud of.`,
    },
    {
      title: "Edamame — Team Roles & Ownership (LOCKED)",
      content: `Team Roles & Component Ownership — Edamame
TreeHacks 2026 | Locked at 3:45 AM

We are NOT changing these. If something is broken, find the owner and talk to them directly.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

JAMES LIU — ML & Backend Lead (Stanford)
Background: SAIL research on LLM post-training, MultiOn AI engineer, TreeHacks organizer
Owns:
• RAG pipeline: ingest → chunk (500 tokens) → embed (text-embedding-3-small) → pgvector search → LLM synthesis
• Clone chat API: /api/clones/[id]/chat — SSE streaming endpoint with conversation history
• LLM system prompts: personality injection, RAG context formatting, citation generation
• CEO insights pipeline: /api/insights/stream — parallel clone queries → sentiment aggregation → theme extraction
• Continual learning: fact extraction from conversations, auto-embedding, memory storage
• Synthetic data generation: backend/memory/synthetic/ — all generators
• Demo strategy: script, timing, narrative arc, backup plans
Contact for: anything AI/ML, the streaming endpoints, prompt engineering, demo decisions

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ELLA LAN — Full-Stack Engineer (Stanford)
Background: Next.js/TypeScript specialist, Supabase expert
Owns:
• Supabase schema: clones, memories, messages, integrations tables + pgvector extension
• All integration APIs: Slack (/api/slack/*), Google Drive (/api/google-drive/*), Gmail (/api/gmail/*), GitHub (/api/github/*), Notion (/api/notion/*)
• OAuth flows: Google OAuth for Drive + Gmail, token refresh, credential storage
• Slack webhook: /api/slack/webhook — real-time message ingestion + per-clone routing
• Data sync pipelines: batch sync for all sources, dedup logic, error handling
• Settings page backend: /api/integrations — save/load/sync integration configs
• Connection pooling: Supabase client singleton, connection limits, retry logic
Contact for: database issues, integration bugs, auth problems, API route errors, "why is Supabase returning 500"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ANGELINA QUAN — Product & Frontend (MIT)
Background: SWE Intern at Cursor (Code Quality team), Scale AI, AWS, IOAI Gold Medalist, 2x USAMO
Owns:
• All frontend components: employee chat, CEO insights, knowledge base, settings, clone builder
• Dark theme: Cursor-inspired aesthetic — #0a0a0c backgrounds, #c4b5a0 warm accent, #1e1e22 borders
• Agent network visualization: SVG topology with animated particles, event stream panel
• Employee sidebar, CEO sidebar, header, layout components
• Chat UI: message bubbles, streaming indicators, agent thinking steps, memory panel
• Onboarding/offboarding/knowledge base views: tabs, forms, cards, search
• Demo slides: 3 slides (problem, demo, tech stack), presentation narrative
Contact for: UI bugs, layout issues, "why does this component look wrong", design decisions, demo narrative

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

VIDEET MEHTA — ML Infrastructure (MIT)
Background: HAN Lab (model acceleration), Sarvam AI (speech models), IOAI Gold Medalist, CUDA/PyTorch expert
Owns:
• Modal deployments: all ML compute runs on Modal (Whisper, embedding generation, TTS)
• Whisper pipeline: /api/voice/transcribe — audio → Whisper large-v3 → text, optimized for latency
• Embedding infrastructure: text-embedding-3-small integration, batching, caching (text_hash → embedding)
• Voice synthesis: /api/voice/synthesize — text → TTS → audio blob
• pgvector optimization: index tuning, query optimization, dimension validation (1536-d)
• Performance: embedding cache, cold start mitigation, connection pooling assistance
• ML model selection: chose text-embedding-3-small over large (1536 vs 3072 dims), Whisper large-v3 over distil
Contact for: anything slow, embedding issues, voice/audio bugs, Modal timeouts, "why is pgvector returning wrong results"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Cross-cutting rules:
• If you change a Supabase table, tell Ella.
• If you change an API response format, tell Angelina AND James.
• If you change embedding dimensions, tell EVERYONE.
• No new features after 6 AM. Only bug fixes.`,
    },
    {
      title: "Edamame — 5 AM Standup Notes",
      content: `5 AM Standup — Edamame Build Sprint
Attendees: James, Ella, Angelina, Videet

JAMES (ML & Backend):
• RAG pipeline: ✅ working. chunks + embeds + searches correctly.
• Clone chat: ✅ streaming works. still getting ~10% 500 errors under load.
  → Root cause: embedding generation timeout when Supabase is slow.
  → Fix: Videet adding embedding cache so repeat queries skip the API call.
• CEO insights: ✅ queries all clones in parallel, aggregates sentiment.
• Continual learning: ✅ extracts facts from conversations, saves with embeddings.
• Blocker: need Ella to fix the connection pooling bug.

ELLA (Full-Stack / Integrations):
• Supabase schema: ✅ stable. added text_hash → embedding cache table per Videet's request.
• Slack integration: ✅ webhook working. real-time message → clone memory pipeline.
• Google Drive: ✅ OAuth + sync. found and fixed the token refresh bug (tokens were expiring silently after 1 hour).
• Gmail: ✅ working. shares OAuth with Drive.
• GitHub: ⬜ token auth done, sync not wired up. deprioritized for demo.
• Settings page: ✅ all integrations show connect/disconnect/sync buttons.
• Connection pooling: 🔧 fixing now. bumping pool from 5 → 20 connections.

ANGELINA (Product & Frontend):
• Dark theme: ✅ complete. all 14 component files rethemed. Cursor-inspired.
• Employee chat view: ✅ with memory panel, voice mode, agent thinking steps.
• CEO insights view: ✅ with agent network visualization (animated particles!).
• Knowledge base: ✅ onboarding + offboarding + memory explorer tabs.
• Agent visualization: ✅ SVG topology with real-time event stream.
• Settings page: ✅ dark themed, all integrations listed.
• Demo slides: 🔧 finishing. 3 slides: problem, live demo, tech stack.
• Blocker: none. Just polish and testing.

VIDEET (ML Infrastructure):
• Modal: ✅ Whisper + embedding generation deployed. cold start mitigated with keep-alive.
• Whisper: ✅ large-v3, ~1.8s latency for 30s clips. voice mode working.
• Embeddings: ✅ text-embedding-3-small (1536-d). adding batch support + cache.
  → Found and fixed a dimension bug: was accidentally using text-embedding-3-large (3072-d). 💀
• TTS: ✅ working but robotic. added fallback to show text if TTS fails.
• pgvector: ✅ cosine similarity index created. query time < 50ms for 10K memories.
• Blocker: Modal cold starts on TTS endpoint. added keep-alive ping every 5 min.

DECISIONS MADE:
1. Demo order: CEO insights → clone chat → live Slack learning → onboarding brief
2. James presents (he organized TreeHacks, knows the judging format)
3. Angelina controls the laptop during demo (she knows all the UI flows)
4. No new features after 6 AM. Only bug fixes and testing.
5. Everyone takes a 30-min nap at 7 AM. Alarms set. DO NOT OVERSLEEP.`,
    },
    {
      title: "Edamame — Product Spec (FINAL)",
      content: `Edamame — AI-Native Organizational Memory Layer
TreeHacks 2026

Team:
- James Liu (ML & Backend Lead, Stanford — SAIL research, MultiOn, TreeHacks organizer)
- Ella Lan (Full-Stack Engineer, Stanford — Next.js, Supabase, integrations)
- Angelina Quan (Product & Frontend, MIT — SWE Intern @ Cursor, IOAI Gold Medalist, 2x USAMO)
- Videet Mehta (ML Infrastructure, MIT — HAN Lab, Sarvam AI, IOAI Gold Medalist)

Problem:
Organizations lose critical knowledge constantly. When employees leave, their expertise walks out the door. When new people join, they spend weeks just figuring out who knows what. Information is scattered across Slack, Drive, email, GitHub — no single system connects it all.

Solution:
Edamame is an AI-native memory layer that ingests knowledge from all organizational tools, creates embeddings for semantic search, and serves it through digital twin clones. Every employee gets a clone that can answer questions based on their real communications and documents.

Core Features:
1. Digital Twin Chat — Talk to any employee's AI clone
2. CEO Insights — Multi-clone sentiment analysis for management decisions
3. Continual Learning — Clones get smarter from every interaction
4. Onboarding Briefs — Auto-generated context for new hires
5. Offboarding Handoffs — Knowledge preservation when people leave
6. Memory Explorer — Semantic search across all organizational knowledge

Data Sources:
- Slack (real-time webhook + batch sync)
- Google Drive (OAuth, doc + sheet sync)
- Gmail (OAuth, thread sync)
- GitHub (token auth, commit + PR sync)
- Notion (API key, page sync)

Tech Stack:
- Frontend: Next.js 16 + Tailwind CSS v4 + Lucide icons
- Backend: Next.js API routes + Supabase (PostgreSQL + pgvector)
- AI: OpenAI GPT-4o + text-embedding-3-small + Whisper large-v3
- Infra: Modal (ML compute) + Vercel (hosting)`,
    },
    {
      title: "Edamame — Pivot Journey & Lessons",
      content: `What We Learned From Pivoting Twice at TreeHacks 2026

Timeline:
9:30 PM — Hackathon starts. Idea: Ambient Listening AI.
10:00 PM — Start building. Whisper API is fast, ${world.people[3]?.name} sets up Modal pipeline.
12:30 AM — Hit a wall. Chrome kills background audio workers. iOS Safari is hopeless.
12:45 AM — Tense team discussion. ${world.people[3]?.name} wants to push through, ${world.people[0]?.name} says pivot.
1:00 AM — Pivot #1: AI Workforce with post-trained specialized agents.
1:30 AM — Start multi-agent framework. ${world.people[3]?.name} sets up LoRA training on Modal.
3:00 AM — Fine-tuning too slow. Each agent takes 20 min. Can't iterate.
3:15 AM — Another tense discussion. We've now burned 5.5 hours on two ideas.
3:30 AM — Pivot #2: Edamame — AI-native memory layer. Everyone agrees (finally).
4:00 AM — Supabase schema done, RAG pipeline running, ${world.people[2]?.name} starts frontend.
5:00 AM — Clone chat working. First "wow" when James's clone answers from Slack data.
6:00 AM — ${world.people[1]?.name} finishes Slack + Drive integrations.
7:00 AM — Continual learning, onboarding, offboarding all functional.
8:00 AM — Angelina finishes Cursor-inspired dark theme UI (she literally works at Cursor). Looks like a real product.
9:00 AM — Demo rehearsed. We're actually proud of this.

Key Insight:
The pivots weren't wasted time. Ambient listener → we reused Whisper for voice mode. AI workforce → we reused agent-to-agent communication for clone consultation. Both fed into Edamame.

Meta-lesson: We built a memory layer because we experienced the pain of losing context during pivots — and realized every org has the same problem at scale.`,
    },
    {
      title: "Edamame — Demo Runbook",
      content: `Demo Runbook — TreeHacks 2026 Judging
Time: 3 minutes STRICT

Pre-Demo Checklist:
☐ Supabase is up (check dashboard)
☐ Clone chat working (test with "what are you working on?")
☐ CEO insights working (test with demo query)
☐ Slack webhook live (send test message)
☐ Voice mode working (test mic + TTS)

Demo Flow:

0:00-0:30 INTRO (${world.people[0]?.name} presents)
"Every organization has a memory problem. Knowledge is scattered across Slack, Drive, email. When someone leaves, their expertise disappears. Edamame fixes this with AI digital twins."

0:30-1:15 CEO INSIGHTS (live demo)
- Type: "What does the team think about our approach to the SELFIMP deadline?"
- Show agent topology visualization (particles flying between nodes)
- Point out sentiment breakdown: support/neutral/oppose with evidence

1:15-2:00 CLONE CHAT (live demo)
- Select James's clone
- Ask: "What are the biggest technical risks right now?"
- Point out: citations from Slack, Drive, continual learning panel

2:00-2:30 LIVE LEARNING (wow moment)
- Send a Slack message: "We decided to go with approach B for the auth system"
- Show it appearing in the Continual Learning panel in real-time
- "The clone learns from every conversation, every Slack message, every doc."

2:30-3:00 CLOSE
- Quick flash of onboarding brief
- "Edamame turns scattered knowledge into living, searchable organizational memory."
- Show tech stack slide

BACKUP PLAN:
If demo crashes, switch to pre-recorded video (saved on James's laptop desktop).`,
    },
  ];
  return rng.pick(templates);
}

function buildSpicyPage(
  project: SyntheticProject,
  editor: SyntheticPerson,
  world: SyntheticWorld,
  rng: SeededRng
): { title: string; content: string } {
  const conflict = rng.pick(world.conflicts);
  const other = rng.pick(world.people.filter((p) => p.id !== editor.id));
  const third = rng.pick(world.people.filter((p) => p.id !== editor.id && p.id !== other.id));

  const templates = [
    {
      title: `TreeHacks — ${rng.pick(["2am", "3am", "4am"])} Decision Log`,
      content: `Decision Log — ${new Date().toLocaleDateString()}
Time: ${rng.pick(["2:30 AM", "3:15 AM", "4:00 AM"])}

Context: ${conflict.topic}

What happened:
The team had a heated discussion about direction. ${editor.name} and ${other.name} disagreed strongly.

${editor.name}: "${conflict.side_a.position}"
${other.name}: "${conflict.side_b.position}"
${third.name}: "Can we just pick one and build? It's ${rng.pick(["2am", "3am"])} and I haven't written any code in 2 hours."

Resolution:
After ${rng.int(30, 60)} minutes of debate, we decided to go with ${rng.pick(["the pragmatic approach", "the memory layer idea", "whatever gets us a working demo"])}. Not everyone is happy but everyone committed.

${conflict.passive_aggressive[rng.int(0, conflict.passive_aggressive.length - 1)]}

Action items:
- Everyone stops debating and starts coding. NOW.
- No new ideas until we have a working demo
- Next check-in at ${rng.pick(["5am", "6am", "7am"])}

Mood: ${rng.pick(["tense but productive", "exhausted and slightly hostile", "caffeinated and chaotic"])}
Red Bull count: ${rng.int(8, 16)} cans (team total)`,
    },
    {
      title: "Retrospective — Why We Pivoted (honest version)",
      content: `Post-Mortem: Why We Abandoned ${rng.pick(["Ambient Listener", "AI Workforce"])}

What went wrong:
1. We fell in love with the idea before validating technical feasibility
2. ${conflict.heated_exchange[rng.int(0, conflict.heated_exchange.length - 1)]}
3. Sunk cost fallacy — we kept building because we'd already invested time
4. Nobody wanted to be the person who said "this isn't working"

What went right:
1. We eventually DID pivot (even if it took too long)
2. Reused code from abandoned ideas in the final product
3. The tension actually produced better ideas through debate

Honest feedback (anonymous... mostly):
- "${conflict.passive_aggressive[rng.int(0, conflict.passive_aggressive.length - 1)]}"
- "We need to be more decisive as a team. The debate was valuable for 20 minutes. After that it was just ego."
- "Next hackathon: prototype for 1 hour max before deciding. Not 3 hours."
- "Despite the chaos, I'm genuinely proud of what we built in the last 6 hours."

Overall: Would hackathon with this team again. But maybe with a pre-agreed decision-making framework.`,
    },
  ];
  return rng.pick(templates);
}

export function generateNotionResources({
  world,
  rng,
  count,
  startIso,
  endIso,
}: NotionGeneratorParams): MemoryResourceInput[] {
  const records: MemoryResourceInput[] = [];

  for (let i = 0; i < count; i++) {
    const progress = i / count;
    let project: SyntheticProject;
    if (progress < 0.2) {
      project = world.projects.find((p) => p.phase === "early") || rng.pick(world.projects);
    } else if (progress < 0.4) {
      project = world.projects.find((p) => p.phase === "mid") || rng.pick(world.projects);
    } else {
      project = world.projects.find((p) => p.phase === "final") || rng.pick(world.projects);
    }

    const editor = rng.pick(world.people);
    const isSpicy = rng.bool(0.35);
    const occurredAt = randomIsoBetween(rng, startIso, endIso);

    const page = isSpicy
      ? buildSpicyPage(project, editor, world, rng)
      : buildNormalPage(project, editor, world, rng);

    const pageId = `${project.notion_page_id}-${i + 1}`;

    const metadata: NotionSourceMetadata = {
      source_type: "notion",
      page_id: pageId,
      workspace_id: "workspace_treehacks_2026",
      last_edited_by: editor.name,
      path: ["TreeHacks 2026", project.name, page.title],
      source_url: `https://www.notion.so/${pageId}`,
    };

    records.push({
      clone_id: world.cloneId,
      source_type: "notion",
      external_id: `notion_${project.key.toLowerCase()}_${i + 1}`,
      title: page.title,
      author: editor.name,
      content: page.content,
      occurred_at: occurredAt,
      modality: "text",
      source_metadata: metadata,
      raw_payload: {
        page_id: pageId,
        title: page.title,
        editor: editor.name,
        body: page.content,
      },
    });
  }

  return records.sort((a, b) =>
    a.occurred_at > b.occurred_at ? 1 : a.occurred_at < b.occurred_at ? -1 : 0
  );
}
