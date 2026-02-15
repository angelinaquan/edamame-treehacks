import type { MemoryResourceInput } from "@/lib/core/types";
import type { SyntheticProject, SyntheticWorld } from "./context";
import { randomIsoBetween, type SeededRng } from "./random";

interface GdriveSourceMetadata extends Record<string, unknown> {
  source_type: "gdrive";
  file_id: string;
  mime_type: string;
  folder_id: string;
  owner: string;
  shared_with: string[];
}

interface GdriveGeneratorParams {
  world: SyntheticWorld;
  rng: SeededRng;
  count: number;
  startIso: string;
  endIso: string;
}

function buildDoc(
  project: SyntheticProject,
  world: SyntheticWorld,
  owner: string,
  rng: SeededRng
): { title: string; content: string; mime: string } {
  if (project.phase === "early") {
    const templates = [
      {
        title: "Ambient Listening AI - PRD (Draft)",
        content: `Ambient Listening AI - Product Requirements
TreeHacks 2026

Team: ${world.people.map((p) => p.name).join(", ")}

Problem: People lose critical context from conversations. Meetings, hallway chats, brainstorms -- most of it is forgotten within hours.

Solution: An always-on AI listener that passively captures audio, transcribes in real-time, and builds a searchable knowledge graph of everything discussed.

Core Features:
- Background audio capture (iOS + Chrome)
- Real-time transcription via Whisper API
- Automatic extraction of decisions, action items, and key facts
- Searchable timeline of all captured conversations
- Privacy controls (pause/delete anytime)

Technical Stack:
- Frontend: React Native (mobile) + Next.js (web dashboard)
- Audio: Web Audio API / iOS AVAudioSession
- Transcription: OpenAI Whisper large-v3
- Storage: Supabase + pgvector for semantic search
- LLM: GPT-4o for fact extraction

Risks:
- iOS background audio permissions are complex
- Battery drain from always-on recording
- Privacy concerns ("is it recording me?")
- Whisper latency for real-time use

Status: ABANDONED after 3 hours. Couldn't get reliable background audio working in time.`,
        mime: "application/vnd.google-apps.document",
      },
      {
        title: "Ambient AI - Architecture Sketch",
        content: `Ambient Listening AI - System Architecture

Audio Pipeline:
  Mic Input -> Web Audio API -> Chunks (30s segments) -> Whisper API -> Transcript

Processing Pipeline:
  Transcript -> GPT-4o extraction -> Facts / Decisions / Action Items -> Supabase

Search:
  User Query -> Embedding -> pgvector cosine similarity -> Top-K results -> LLM summary

Key Decision: Using Whisper large-v3 instead of real-time streaming because:
- Streaming requires WebSocket setup we don't have time for
- 30-second chunks give us good enough latency for a demo
- Accuracy is significantly better than whisper-small

Open Questions:
- How to handle overlapping speakers?
- Do we need speaker diarization? (probably not for hackathon)
- What's the minimum viable privacy UX?

Note from ${owner}: This architecture is solid but we ran into the background audio wall. Moving to a new idea.`,
        mime: "application/vnd.google-apps.document",
      },
    ];
    return rng.pick(templates);
  }

  if (project.phase === "mid") {
    const templates = [
      {
        title: "AI Workforce - Specialized Agents PRD",
        content: `AI Workforce with Post-Trained Specialized Agents
TreeHacks 2026 - Idea #2

Concept: An AI workforce where each agent is fine-tuned on a specific domain. Instead of one general AI, you have a team of specialists that collaborate.

Agent Types:
- Legal Agent: Fine-tuned on contracts, compliance, legal precedent
- Finance Agent: Trained on financial modeling, budgeting, forecasting
- Engineering Agent: Knows your codebase, architecture decisions, tech debt
- Product Agent: Understands roadmap, user research, feature priorities

How It Works:
1. User asks a question
2. Coordinator agent analyzes the query and routes to the right specialist
3. Specialist agent responds with domain-specific expertise
4. If needed, agents consult each other (e.g., Legal + Finance for a deal review)

Technical Approach:
- Base model: GPT-4o-mini for speed
- Fine-tuning: OpenAI fine-tuning API or LoRA on open-source models
- Coordination: Simple routing layer based on intent classification
- Each agent has its own system prompt + fine-tuned weights

Problem: Fine-tuning takes 20+ minutes per agent on Modal. We can't iterate fast enough in a hackathon.

Status: PIVOTED after ~3 hours. The idea is strong but we couldn't make it demoable in time.
The fine-tuning loop was too slow and the "specialization" was hard to show in a 3-min demo.`,
        mime: "application/vnd.google-apps.document",
      },
      {
        title: "Idea Comparison Matrix - What Should We Build?",
        content: `TreeHacks 2026 - Idea Comparison

| Criteria | Ambient Listener | AI Workforce | Memory Layer |
|----------|-----------------|--------------|--------------|
| Novelty | High (0-to-1) | Medium | High |
| Demoability | Low (needs mobile) | Medium | High (web app) |
| Build Time | 15+ hours | 12+ hours | 8-10 hours |
| Wow Factor | "Always listening" | "Team of AIs" | "Digital twins" |
| Technical Risk | High (audio) | Medium (fine-tuning) | Low (RAG + embeddings) |
| Judge Appeal | Polarizing | Interesting | Strong (clear use case) |

Decision: Going with Memory Layer / OrgPulse.

Rationale:
- We've already burned 5+ hours on ideas 1 and 2
- Memory Layer is the most demoable -- it's a web app with clear visual output
- RAG + embeddings is well-understood tech, low risk of hitting walls
- The "digital twin" angle is a strong narrative for judges
- We can reuse some code from the ambient listener (transcription) and workforce (multi-agent chat)

Votes:
- ${world.people[0]?.name}: Memory Layer
- ${world.people[1]?.name}: Memory Layer (was pushing for Workforce but agreed time is short)
- ${world.people[2]?.name}: Memory Layer
- ${world.people[3]?.name}: Memory Layer (reluctantly -- still thinks Ambient is more novel)`,
        mime: "application/vnd.google-apps.document",
      },
    ];
    return rng.pick(templates);
  }

  // Final phase -- OrgPulse / Memory Layer
  const templates = [
    {
      title: "OrgPulse - Demo Script (FINAL)",
      content: `OrgPulse Demo Script - TreeHacks 2026
Time: 3 minutes

INTRO (30s):
"Every organization has a memory problem. When someone leaves, their knowledge walks out the door. When someone joins, they spend weeks just figuring out who knows what. OrgPulse is an AI-native memory layer that captures, organizes, and serves organizational knowledge through digital twins."

DEMO FLOW:

1. CEO Insights View (45s)
- Show the insights dashboard
- Ask: "What does the team think about our launch timeline?"
- Show responses from multiple employee clones with stances + evidence
- Highlight cross-team patterns

2. Clone Chat (45s)
- Pick an employee clone
- Ask: "What are you working on and what are the biggest risks?"
- Show the clone responding with real context from Slack + Docs
- Point out citations at the bottom

3. Continual Learning - LIVE (30s)
- Send a Slack message in real-time
- Show it appearing in the Continual Learning panel
- "The clone literally learns in real-time from Slack, email, Drive"

4. Onboarding Brief (15s)
- Generate an onboarding brief for a new hire
- Show: key people, recent decisions, risks, key docs

5. Close (15s)
"OrgPulse turns your organization's scattered knowledge into a living, searchable memory. Every conversation, every doc, every decision -- captured and accessible through AI digital twins."

TECH STACK SLIDE:
Next.js + Supabase + pgvector + OpenAI + Whisper`,
      mime: "application/vnd.google-apps.document",
    },
    {
      title: "OrgPulse - Technical Architecture",
      content: `OrgPulse - Technical Architecture
TreeHacks 2026

Data Flow:
  Integrations (Slack, Drive, Email) -> Ingestion Pipeline -> Chunking -> Embedding -> Supabase (pgvector)
  User Query -> Embedding -> Vector Search -> LLM System Prompt -> Streaming Response

Database: Supabase (PostgreSQL + pgvector)
Tables:
- clones: one per employee (name, personality, expertise)
- memories: unified knowledge store (documents, chunks, facts, categories)
- messages: chat history
- integrations: OAuth credentials for Slack, Drive, etc.

Memory Types:
- document: raw ingested content (Slack channel dump, Drive file, email)
- chunk: 500-token segments with embeddings for retrieval
- fact: extracted atomic knowledge with confidence scores
- category: summarized topic clusters (from compaction)

Continual Learning Loop:
1. User chats with clone -> extract facts from conversation -> save with embeddings
2. Slack webhook -> ingest message -> extract facts -> save per-person
3. Integration sync -> pull latest from Drive/Slack -> chunk + embed

Key Innovation: The memory layer is SOURCE-AGNOSTIC. Slack messages, Drive docs, emails, voice transcripts -- they all become the same thing: typed, embedded memory rows. The clone doesn't care where knowledge came from, it just searches semantically.

Built by:
- James Liu (ML & Backend, Stanford — SAIL, MultiOn, TreeHacks organizer)
- Ella Lan (Full-Stack, Stanford — Next.js, Supabase, integrations)
- Angelina Quan (Product & Frontend, MIT — Cursor SWE intern, IOAI Gold, 2x USAMO)
- Videet Mehta (ML Infra, MIT — HAN Lab, Sarvam AI, IOAI Gold)`,
      mime: "application/vnd.google-apps.document",
    },
    {
        title: "OrgPulse — What We Learned From Pivoting Twice",
      content: `What We Learned From Pivoting Twice at TreeHacks

Timeline:
- 9:30 PM: Hackathon starts. We're pumped. Idea: Ambient Listening AI.
- 10:00 PM: Start building ambient listener prototype. Whisper API is fast.
- 12:30 AM: Hit a wall. Background audio on iOS/Chrome is a nightmare. Battery drain is terrible. Demo would just be... a recording app?
- 12:45 AM: Tense team discussion. Some want to push through, others want to pivot.
- 1:00 AM: Decision: pivot to AI Workforce with specialized agents.
- 1:30 AM: Start building multi-agent framework. Coordinator + specialists.
- 3:00 AM: Fine-tuning is too slow. Each agent takes 20 min to train. Can't iterate fast enough.
- 3:15 AM: Another tense discussion. We've now burned 5.5 hours on two ideas.
- 3:30 AM: Final pivot to AI-native memory layer. Everyone agrees this time.
- 4:00 AM: Supabase schema done, RAG pipeline running, frontend started.
- 5:00 AM: Clone chat working. First "wow" moment when a clone answers from Slack data.
- 7:00 AM: Continual learning, onboarding, offboarding all functional.
- 9:00 AM: Demo script rehearsed. Slides done. We're actually proud of this one.

Key Takeaway: The pivots weren't wasted time. The ambient listener taught us about real-time transcription (we reused Whisper). The AI workforce taught us about multi-agent coordination (we reused clone-to-clone consultation). Both fed into OrgPulse.

The meta-lesson: your hackathon journey IS the product sometimes. We built a memory layer because we experienced the pain of losing context during pivots -- and realized every org has the same problem, just on a larger scale.`,
      mime: "application/vnd.google-apps.document",
    },
    {
      title: "OrgPulse - Onboarding Brief Template",
      content: `OrgPulse Onboarding Brief - Auto-Generated

Role: [New Hire Role]
Team: [Department]

Key People to Know:
- [Name] ([Role]) -- [relationship + tip for connecting]

Key Context:
- The team is building [current project] with a target of [date]
- Recent major decision: [decision from memory]
- Current risk: [risk from memory]

Key Documents:
- [Doc title] ([source]) -- [relevance]

Recent Decisions:
- [Decision] (made on [date] by [participants])

Risks & Landmines:
- [Risk] (severity: [low/medium/high])

Note: This brief is auto-generated from the organization's memory layer. All data comes from real Slack conversations, Google Drive documents, and other integrated sources. Content is updated as new information flows in.`,
      mime: "application/vnd.google-apps.document",
    },
  ];
  return rng.pick(templates);
}

export function generateGdriveResources({
  world,
  rng,
  count,
  startIso,
  endIso,
}: GdriveGeneratorParams): MemoryResourceInput[] {
  const records: MemoryResourceInput[] = [];

  for (let i = 0; i < count; i++) {
    // Weight doc generation by timeline
    const progress = i / count;
    let project: SyntheticProject;
    if (progress < 0.2) {
      project = world.projects.find((p) => p.phase === "early") || rng.pick(world.projects);
    } else if (progress < 0.4) {
      project = world.projects.find((p) => p.phase === "mid") || rng.pick(world.projects);
    } else {
      project = world.projects.find((p) => p.phase === "final") || rng.pick(world.projects);
    }

    const owner = rng.pick(world.people);
    const occurredAt = randomIsoBetween(rng, startIso, endIso);
    const fileId = `gdrive_${project.key.toLowerCase()}_${i + 1}_${rng.int(1000, 9999)}`;

    const sharedWith = world.people
      .filter((p) => p.id !== owner.id)
      .map((p) => p.email);

    const doc = buildDoc(project, world, owner.name, rng);

    const metadata: GdriveSourceMetadata = {
      source_type: "gdrive",
      file_id: fileId,
      mime_type: doc.mime,
      folder_id: project.gdrive_folder_id,
      owner: owner.email,
      shared_with: sharedWith,
    };

    records.push({
      clone_id: world.cloneId,
      source_type: "gdrive",
      external_id: fileId,
      title: doc.title,
      author: owner.name,
      content: doc.content,
      occurred_at: occurredAt,
      modality: "text",
      source_metadata: metadata,
      raw_payload: {
        file_id: fileId,
        owner: owner.email,
        title: doc.title,
        body: doc.content,
      },
    });
  }

  return records.sort((a, b) =>
    a.occurred_at > b.occurred_at ? 1 : a.occurred_at < b.occurred_at ? -1 : 0
  );
}
