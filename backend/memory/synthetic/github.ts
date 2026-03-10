import type { MemoryResourceInput } from "@/lib/core/types";

interface GithubSourceMetadata extends Record<string, unknown> {
  source_type: "github";
  repo: string;
  commit_sha: string;
  author: string;
  branch: string;
  files_changed: string[];
}
import type { SyntheticProject, SyntheticWorld } from "./context";
import { randomIsoBetween, type SeededRng } from "./random";

interface GithubGeneratorParams {
  world: SyntheticWorld;
  rng: SeededRng;
  count: number;
  startIso: string;
  endIso: string;
}

function randomHex(rng: SeededRng, len: number): string {
  const chars = "abcdef0123456789";
  let out = "";
  for (let i = 0; i < len; i++) {
    out += chars[rng.int(0, chars.length - 1)];
  }
  return out;
}

function buildNormalCommit(
  project: SyntheticProject,
  author: string,
  rng: SeededRng
): { message: string; files: string[] } {
  if (project.phase === "early") {
    const templates = [
      {
        message: `feat: add Whisper transcription pipeline\n\nSet up audio chunking (30s segments) and Whisper large-v3 API integration.\nTranscription latency: ~1.8s per 30s clip on Modal.\n\nTested with venue background noise — accuracy is solid at ~95%.`,
        files: ["lib/audio/transcribe.ts", "lib/audio/chunker.ts", "api/voice/transcribe/route.ts"],
      },
      {
        message: `feat: Chrome MediaRecorder integration\n\nAdded Web Audio API capture with MediaRecorder.\nWorks in foreground, but background recording requires service worker hack.\n\nNote: iOS Safari doesn't support this at all. May need to rethink approach.`,
        files: ["components/voice/AudioCapture.tsx", "lib/audio/recorder.ts", "hooks/useAudioCapture.ts"],
      },
      {
        message: `wip: ambient listener prototype (NOT WORKING)\n\nAttempted always-on recording via service worker.\nChrome kills the worker after ~30s of inactivity.\n\nThis approach is fundamentally broken for "ambient" use case.\nWe probably need to pivot.`,
        files: ["public/sw-audio.js", "lib/audio/background.ts"],
      },
    ];
    return rng.pick(templates);
  }

  if (project.phase === "mid") {
    const templates = [
      {
        message: `feat: multi-agent coordinator with intent routing\n\nAdded coordinator agent that classifies user intent and routes to\nspecialized sub-agents (legal, finance, engineering, product).\n\nUsing GPT-4o-mini with function calling for routing — fast and cheap.\nEach specialist has its own system prompt + context window.`,
        files: ["lib/agents/coordinator.ts", "lib/agents/specialist.ts", "lib/agents/router.ts"],
      },
      {
        message: `feat: agent-to-agent communication protocol\n\nSpecialist agents can now consult each other for cross-domain queries.\nE.g., legal agent asks finance agent for budget context before responding.\n\nUsing a simple message-passing interface with typed events.`,
        files: ["lib/agents/protocol.ts", "lib/agents/messenger.ts", "lib/core/types.ts"],
      },
      {
        message: `chore: LoRA fine-tuning pipeline on Modal\n\nSet up LoRA training for specialized agents.\nEach agent fine-tunes on ~500 domain-specific examples.\n\nProblem: each run takes ~20 min on A100. Too slow for hackathon iteration.\nMay need to fall back to just using strong system prompts.`,
        files: ["backend/modal/train_lora.py", "backend/modal/serve_model.py", "data/training/legal.jsonl"],
      },
    ];
    return rng.pick(templates);
  }

  // Final phase — Edamame
  // Person-specific commits based on ownership areas
  const personCommits: Record<string, { message: string; files: string[] }[]> = {
    // JAMES — RAG, clone chat, insights, continual learning
    "James Liu": [
      {
        message: `feat(james): RAG pipeline with pgvector\n\nFull retrieval pipeline:\n1. Ingest doc → chunk into 500-token segments\n2. Generate embeddings with text-embedding-3-small\n3. Store in Supabase with pgvector\n4. Query: embed question → cosine similarity → top-K → LLM synthesis\n\nOwner: James Liu (ML & Backend Lead)\nRetrieval quality is surprisingly good on first try.`,
        files: ["lib/memory/ingest.ts", "lib/memory/search.ts", "lib/memory/embed.ts", "lib/core/types.ts"],
      },
      {
        message: `feat(james): clone chat with streaming SSE + citations\n\nClone chat endpoint now streams GPT-4o responses via Server-Sent Events.\nEach response includes source citations (Slack msg, Drive doc, email).\nConversation history maintained (last 10 messages).\n\nOwner: James Liu\nThe "digital twin" experience is actually convincing.`,
        files: ["app/api/clones/[id]/chat/route.ts", "lib/edamame/chat.ts", "lib/edamame/api.ts"],
      },
      {
        message: `feat(james): continual learning — clones get smarter over time\n\nAfter each chat, system extracts atomic facts from user messages.\nFacts are embedded and stored as new memories.\nThe clone's knowledge grows with every conversation.\n\nOwner: James Liu\nThis is the demo moment — live knowledge acquisition.`,
        files: ["lib/memory/learn.ts", "app/api/clones/[id]/chat/route.ts"],
      },
      {
        message: `feat(james): CEO insights multi-agent pipeline\n\nStreaming endpoint: /api/insights/stream\nPipeline: plan → query each clone in parallel → aggregate sentiment → extract themes\nEach clone responds with stance + confidence + summary + citations.\n\nOwner: James Liu\nThe multi-clone sentiment analysis is the key differentiator.`,
        files: ["app/api/insights/stream/route.ts", "lib/edamame/insights.ts"],
      },
      {
        message: `feat(james): synthetic data generation system\n\n6 generators: Slack, Drive, Email, GitHub, Jira, Notion\nSeeded RNG for deterministic output. Volume presets (small/medium/large).\nAll data personalized to team members with realistic hackathon dynamics.\n\nOwner: James Liu`,
        files: ["backend/memory/synthetic/index.ts", "backend/memory/synthetic/context.ts", "backend/memory/synthetic/slack.ts"],
      },
    ],
    // ELLA — integrations, database, OAuth, webhooks
    "Ella Lan": [
      {
        message: `feat(ella): Slack integration with real-time webhook\n\nSlack bot token auth + incoming webhook handler.\n/api/slack/webhook receives messages → extracts facts → stores per-clone.\n/api/slack/sync batch-syncs channel history.\n\nOwner: Ella Lan (Full-Stack / Integrations)\nReal-time learning from Slack is working.`,
        files: ["app/api/slack/webhook/route.ts", "app/api/slack/sync/route.ts", "lib/integrations/slack.ts"],
      },
      {
        message: `feat(ella): Google OAuth + Drive/Gmail sync\n\nFull OAuth 2.0 flow with token refresh.\nDrive: syncs docs and sheets from shared folders.\nGmail: syncs last 50 email threads.\nTokens stored encrypted in integrations table.\n\nOwner: Ella Lan\nFixed silent token expiry bug — tokens were dying after 1 hour.`,
        files: ["app/api/auth/google/route.ts", "app/api/google-drive/sync/route.ts", "app/api/gmail/sync/route.ts", "lib/integrations/google.ts"],
      },
      {
        message: `feat(ella): Supabase schema + pgvector extension\n\nTables: clones, memories, messages, integrations\nUnified memories table with type discriminators (document, chunk, fact, category).\npgvector extension enabled for cosine similarity.\nConnection pooling with singleton client.\n\nOwner: Ella Lan`,
        files: ["backend/supabase/schema.sql", "lib/core/supabase.ts", "lib/core/types.ts"],
      },
      {
        message: `feat(ella): integration settings API + sync management\n\n/api/integrations — CRUD for integration configs.\nEach integration shows connect/disconnect/sync status.\nAuto-sync on save for supported providers.\n\nOwner: Ella Lan`,
        files: ["app/api/integrations/route.ts", "lib/integrations/manager.ts"],
      },
    ],
    // ANGELINA — all frontend, dark theme, visualizations
    "Angelina Quan": [
      {
        message: `feat(angelina): dark theme UI overhaul (Cursor-inspired)\n\nComplete retheme of all 14+ component files:\n- Dark backgrounds (#0a0a0c), warm beige accents (#c4b5a0)\n- Subtle borders (#1e1e22), muted text hierarchy\n- Cursor dashboard aesthetic (I work there, so I know it well)\n\nOwner: Angelina Quan (Product & Frontend)`,
        files: ["app/globals.css", "components/edamame/EmployeeSidebar.tsx", "components/edamame/CeoSidebar.tsx", "components/edamame/EmployeeChatView.tsx"],
      },
      {
        message: `feat(angelina): agent network topology visualization\n\nSVG topology graph with 6 agent nodes + bezier curve edges.\nAnimated particles travel between nodes during agent communication.\nGlow effects, pulse animations, dot grid background.\nEvent stream panel with color-coded message log.\n\nOwner: Angelina Quan\nThis is the visual centerpiece of the demo.`,
        files: ["components/edamame/AgentNetworkView.tsx", "components/edamame/InsightsView.tsx"],
      },
      {
        message: `feat(angelina): employee chat view with memory panel\n\nFull chat interface: message bubbles, streaming indicators,\nagent thinking steps (searching KB → retrieving → consulting → composing).\nMemory panel on the right shows continual learning in real-time.\nText + voice mode toggle.\n\nOwner: Angelina Quan`,
        files: ["components/edamame/EmployeeChatView.tsx", "components/edamame/ClonesView.tsx"],
      },
      {
        message: `feat(angelina): knowledge base views (onboarding + offboarding + memory explorer)\n\nThree-tab layout: Onboarding briefs, Memory explorer, Offboarding handoffs.\nOnboarding: role/team selector → auto-generated brief.\nMemory: semantic search with type filters (episodic/semantic).\nOffboarding: employee selector → handoff pack with ownership areas.\n\nOwner: Angelina Quan`,
        files: ["components/edamame/KnowledgeView.tsx"],
      },
    ],
    // VIDEET — Modal, Whisper, embeddings, voice, pgvector
    "Videet Mehta": [
      {
        message: `feat(videet): Whisper transcription pipeline on Modal\n\nWhisper large-v3 deployed on Modal A100.\n/api/voice/transcribe: accepts audio blob → returns transcription.\nLatency: ~1.8s for 30-second clips. Accuracy: ~95%.\n\nOwner: Videet Mehta (ML Infrastructure)\nReusing my speech model experience from Sarvam AI.`,
        files: ["app/api/voice/transcribe/route.ts", "backend/modal/whisper.py"],
      },
      {
        message: `feat(videet): embedding generation with batching + caching\n\ntext-embedding-3-small (1536 dimensions).\nBatch support: up to 2048 texts per API call.\nCache layer: text_hash → embedding lookup to skip repeat queries.\n\nOwner: Videet Mehta\nFixed dimension bug — was accidentally using text-embedding-3-large (3072-d). 💀`,
        files: ["lib/memory/embed.ts", "lib/core/embedding-cache.ts"],
      },
      {
        message: `feat(videet): voice synthesis (TTS) with fallback\n\n/api/voice/synthesize: text → audio blob via TTS API.\nAdded graceful fallback — if TTS fails, chat shows text-only response.\nModal cold start mitigated with 5-min keep-alive pings.\n\nOwner: Videet Mehta`,
        files: ["app/api/voice/synthesize/route.ts", "backend/modal/tts.py"],
      },
      {
        message: `perf(videet): pgvector index optimization\n\nCreated IVFFlat index on memories.embedding column.\nQuery time: < 50ms for 10K memories (was 200ms+ without index).\nCosine similarity distance function for semantic search.\n\nOwner: Videet Mehta\nAlso tuned the probes parameter for accuracy vs speed tradeoff.`,
        files: ["backend/supabase/migrations/add_ivfflat_index.sql", "lib/memory/search.ts"],
      },
    ],
  };

  // Pick commits specific to the author if we have them
  const authorCommits = personCommits[author];
  if (authorCommits && authorCommits.length > 0) {
    return rng.pick(authorCommits);
  }

  // Fallback generic commits
  const templates = [
    {
      message: `feat: onboarding brief generator\n\nAuto-generates onboarding docs for new hires:\n- Key people to know\n- Recent decisions\n- Risks and landmines\n- Key documents\n\nAll pulled from the memory layer. Actually useful beyond the hackathon.`,
      files: ["app/api/knowledge/onboarding/route.ts", "lib/edamame/onboarding.ts", "components/edamame/KnowledgeView.tsx"],
    },
    {
      message: `chore: update README with team info and setup instructions\n\nAdded team bios, role assignments, setup guide, and demo instructions.`,
      files: ["README.md"],
    },
  ];
  return rng.pick(templates);
}

function buildSpicyCommit(
  project: SyntheticProject,
  world: SyntheticWorld,
  rng: SeededRng
): { message: string; files: string[] } {
  const conflict = rng.pick(world.conflicts);
  const person1 = rng.pick(world.people);
  const person2 = rng.pick(world.people.filter((p) => p.id !== person1.id));

  const templates = [
    {
      message: `revert: undo ${person1.name}'s ambient listener changes\n\nReverting the service worker audio capture approach.\nIt doesn't work, it was never going to work, and we wasted 3 hours on it.\n\n${conflict.passive_aggressive[rng.int(0, conflict.passive_aggressive.length - 1)]}\n\nMoving to idea #2.`,
      files: ["public/sw-audio.js", "lib/audio/background.ts", "components/voice/AudioCapture.tsx"],
    },
    {
      message: `fix: the fix that fixes the fix for clone chat 500 errors\n\nThird attempt at fixing the embedding generation timeout.\n\nPrevious "fixes":\n1. PR from ${person1.name} — fixed timeout but broke streaming\n2. PR from ${person2.name} — fixed streaming but embeddings were empty\n3. This PR — hopefully actually works this time\n\nRoot cause: we were awaiting the embedding call inside the SSE stream\ninstead of pre-computing it. Classic race condition.\n\nIt's ${rng.pick(["4am", "5am"])} and I'm running on pure spite.`,
      files: ["app/api/clones/[id]/chat/route.ts", "lib/memory/embed.ts", "lib/memory/search.ts"],
    },
    {
      message: `chore: delete abandoned AI workforce code\n\nRemoving the entire multi-agent workforce framework.\nWe spent 3 hours on this and it's not demoable.\n\n${conflict.passive_aggressive[rng.int(0, conflict.passive_aggressive.length - 1)]}\n\nKeeping the agent-to-agent protocol though — reusing it for clone consultation in Edamame.`,
      files: ["lib/agents/coordinator.ts", "lib/agents/specialist.ts", "lib/agents/router.ts", "backend/modal/train_lora.py"],
    },
    {
      message: `hotfix: Supabase rate limiting during CEO insights query\n\n${person2.name} forgot to set up connection pooling (I flagged this 3 hours ago).\n\nWhen CEO insights queries all 4 clones simultaneously, we were opening\n4 separate Supabase connections and hitting the free tier limit.\n\nFixed by using a connection pool and batching embedding lookups.\n\n${conflict.heated_exchange[rng.int(0, conflict.heated_exchange.length - 1)]}`,
      files: ["lib/core/supabase.ts", "app/api/insights/stream/route.ts", "lib/memory/search.ts"],
    },
  ];

  return rng.pick(templates);
}

export function generateGithubResources({
  world,
  rng,
  count,
  startIso,
  endIso,
}: GithubGeneratorParams): MemoryResourceInput[] {
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

    const author = rng.pick(world.people);
    const commitSha = randomHex(rng, 40);
    const isSpicy = rng.bool(0.3);
    const occurredAt = randomIsoBetween(rng, startIso, endIso);

    const commit = isSpicy
      ? buildSpicyCommit(project, world, rng)
      : buildNormalCommit(project, author.name, rng);

    const metadata: GithubSourceMetadata = {
      source_type: "github",
      repo: project.repo,
      commit_sha: commitSha,
      pr_number: rng.int(1, 80),
      author: author.github || author.name,
      branch: rng.pick(["main", "feat/rag-pipeline", "feat/clone-chat", "feat/insights", "fix/500-errors", "feat/dark-theme"]),
      files_changed: commit.files,
      source_url: `https://github.com/${project.repo}/commit/${commitSha}`,
    };

    records.push({
      clone_id: world.cloneId,
      source_type: "github",
      external_id: `github_${project.key.toLowerCase()}_${i + 1}`,
      title: `${project.repo} ${commitSha.slice(0, 8)}`,
      author: author.name,
      content: commit.message,
      occurred_at: occurredAt,
      modality: "text",
      source_metadata: metadata,
      raw_payload: {
        sha: commitSha,
        repository: project.repo,
        author: author.name,
        files: commit.files,
        message: commit.message,
      },
    });
  }

  return records.sort((a, b) =>
    a.occurred_at > b.occurred_at ? 1 : a.occurred_at < b.occurred_at ? -1 : 0
  );
}
