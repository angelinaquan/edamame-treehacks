import type { MemoryResourceInput } from "@/lib/core/types";
import type { SyntheticProject, SyntheticWorld } from "./context";
import { randomIsoBetween, type SeededRng } from "./random";

interface JiraSourceMetadata extends Record<string, unknown> {
  source_type: "jira";
  board_id: string;
  issue_key: string;
  issue_type: string;
  assignee: string;
  reporter: string;
  priority: string;
  sprint: string;
}

interface JiraGeneratorParams {
  world: SyntheticWorld;
  rng: SeededRng;
  count: number;
  startIso: string;
  endIso: string;
}

function buildNormalTicket(
  project: SyntheticProject,
  assignee: string,
  rng: SeededRng,
  issueKey: string
): string {
  if (project.phase === "early") {
    const templates = [
      `[${issueKey}] Set up Whisper transcription pipeline on Modal

Acceptance Criteria:
- Whisper large-v3 running on Modal A100
- API endpoint: POST /api/voice/transcribe
- Accepts audio blob (webm/ogg), returns { text: string }
- Latency < 2s for 30-second clips
- Error handling for empty/corrupt audio

Assignee: ${assignee}
Story Points: 5
Sprint: TreeHacks Night 1`,

      `[${issueKey}] Implement Chrome audio capture with MediaRecorder

Acceptance Criteria:
- Record audio from browser mic using Web Audio API
- Chunk into 30-second segments
- Auto-stop on tab close / permission revoke
- Visual indicator when recording is active

Note: Background recording (when tab loses focus) is a stretch goal.

Assignee: ${assignee}
Story Points: 3
Sprint: TreeHacks Night 1`,
    ];
    return rng.pick(templates);
  }

  if (project.phase === "mid") {
    const templates = [
      `[${issueKey}] Build multi-agent coordinator with intent routing

Acceptance Criteria:
- Coordinator agent classifies user intent
- Routes to correct specialist (legal, finance, engineering, product)
- Fallback to general agent if intent unclear
- Response includes routing metadata for visualization

Assignee: ${assignee}
Story Points: 8
Sprint: TreeHacks Night 1`,

      `[${issueKey}] Set up LoRA fine-tuning pipeline on Modal

Acceptance Criteria:
- LoRA training script for domain-specific agents
- Training data format: JSONL with prompt/completion pairs
- Each agent: ~500 training examples
- Fine-tune on Modal A100, track loss convergence

Note: Each run takes ~20 min. Plan training runs carefully.

Assignee: ${assignee}
Story Points: 8
Sprint: TreeHacks Night 1`,
    ];
    return rng.pick(templates);
  }

  // Final phase
  const templates = [
    `[${issueKey}] Implement RAG pipeline with pgvector

Acceptance Criteria:
- Ingest documents: chunk into 500-token segments
- Generate embeddings with text-embedding-3-small
- Store in Supabase with pgvector extension
- Search: embed query → cosine similarity → top-K retrieval
- Return chunks with source metadata for citations

Assignee: ${assignee}
Story Points: 8
Sprint: TreeHacks Morning`,

    `[${issueKey}] Build clone chat with streaming SSE

Acceptance Criteria:
- SSE endpoint: POST /api/clones/[id]/chat
- Stream GPT-4o response token by token
- Include RAG context in system prompt
- Return citations at end of stream
- Handle conversation history (last 10 messages)

Assignee: ${assignee}
Story Points: 5
Sprint: TreeHacks Morning`,

    `[${issueKey}] Implement continual learning from chat

Acceptance Criteria:
- After each chat, extract facts from user message
- Generate embeddings for new facts
- Store as memory entries with source="conversation"
- Show "Extracting..." → "Stored" in the UI memory panel

Assignee: ${assignee}
Story Points: 5
Sprint: TreeHacks Morning`,

    `[${issueKey}] Build Slack integration with webhook

Acceptance Criteria:
- Bot token authentication for Slack workspace
- POST /api/slack/webhook receives real-time messages
- Parse message, extract facts, store per-clone
- Batch sync: POST /api/slack/sync pulls channel history

Assignee: ${assignee}
Story Points: 5
Sprint: TreeHacks Morning`,

    `[${issueKey}] CEO insights view — multi-clone sentiment analysis

Acceptance Criteria:
- CEO types a management question
- System queries all employee clones in parallel
- Each clone responds with: stance, confidence, summary, citations
- Aggregate: sentiment distribution, key themes
- Stream results progressively (stage indicators)

Assignee: ${assignee}
Story Points: 13
Sprint: TreeHacks Morning`,
  ];
  return rng.pick(templates);
}

function buildSpicyTicket(
  project: SyntheticProject,
  world: SyntheticWorld,
  assigneeName: string,
  reporterName: string,
  rng: SeededRng,
  issueKey: string
): string {
  const conflict = rng.pick(world.conflicts);
  const other = rng.pick(world.people.filter((p) => p.name !== assigneeName && p.name !== reporterName));

  const templates = [
    `[${issueKey}] BUG: Clone chat 500 errors in production demo

Priority: CRITICAL
Reporter: ${reporterName}
Assignee: ${assigneeName}

The clone chat endpoint returns 500 errors ~40% of the time during the demo flow. This is a BLOCKER for judging.

Root cause analysis:
- Embedding generation times out when Supabase is under load
- The SSE stream breaks when the embedding call takes > 5 seconds
- No retry logic, no timeout handling, no fallback

Previous attempts to fix:
1. ${assigneeName} added a timeout → broke streaming entirely
2. ${other.name} removed the timeout → back to 500 errors
3. This ticket: please just make it work. It's ${rng.pick(["4am", "5am"])}.

${reporterName}: "${conflict.heated_exchange[rng.int(0, conflict.heated_exchange.length - 1)]}"
${assigneeName}: "${conflict.passive_aggressive[rng.int(0, conflict.passive_aggressive.length - 1)]}"

Status: REOPENED (attempt #${rng.int(3, 5)})`,

    `[${issueKey}] TASK: Decide on final feature set for demo — URGENT

Priority: CRITICAL
Reporter: ${reporterName}

We have ${rng.int(3, 5)} hours until judging and the team can't agree on scope.

Current feature list (8 items):
1. ✅ Clone chat with RAG
2. ✅ CEO insights
3. ⬜ Continual learning (buggy)
4. ⬜ Onboarding briefs (sometimes returns empty)
5. ⬜ Offboarding handoffs (untested)
6. ⬜ Voice mode (works but TTS is robotic)
7. ⬜ Agent network visualization (just finished)
8. ⬜ Slack real-time webhook (flaky)

${conflict.side_a.position}

${conflict.side_b.position}

${other.name}: "I just want to sleep. Can we pick 4 features and move on?"

${conflict.passive_aggressive[rng.int(0, conflict.passive_aggressive.length - 1)]}

Decision needed by: NOW`,

    `[${issueKey}] SPIKE: Should we revert to AI Workforce idea?

Priority: Medium → now Low (we decided to stay with OrgPulse)
Reporter: ${reporterName}
Assignee: ${assigneeName}

At ${rng.pick(["3am", "4am"])}, ${reporterName} suggested reverting to the AI Workforce idea because OrgPulse wasn't coming together fast enough.

Discussion:
${reporterName}: "${conflict.side_a.position}"
${assigneeName}: "${conflict.side_b.position}"
${other.name}: "${conflict.heated_exchange[rng.int(0, conflict.heated_exchange.length - 1)]}"

Resolution: We're staying with OrgPulse. This ticket is WONTFIX.
${conflict.passive_aggressive[rng.int(0, conflict.passive_aggressive.length - 1)]}

Lesson: No more pivots. We ship what we have.`,
  ];

  return rng.pick(templates);
}

export function generateJiraResources({
  world,
  rng,
  count,
  startIso,
  endIso,
}: JiraGeneratorParams): MemoryResourceInput[] {
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

    const assignee = rng.pick(world.people);
    const reporter = rng.pick(world.people.filter((p) => p.id !== assignee.id));
    const issueNumber = rng.int(100, 999);
    const issueKey = `${project.key}-${issueNumber}`;
    const isSpicy = rng.bool(0.35);
    const occurredAt = randomIsoBetween(rng, startIso, endIso);
    const issueType = rng.pick(["Story", "Bug", "Task", "Spike"]);
    const priority = isSpicy ? rng.pick(["Critical", "Blocker"]) : rng.pick(["Medium", "High"]);

    const content = isSpicy
      ? buildSpicyTicket(project, world, assignee.name, reporter.name, rng, issueKey)
      : buildNormalTicket(project, assignee.name, rng, issueKey);

    const metadata: JiraSourceMetadata = {
      source_type: "jira",
      board_id: project.jira_board_id,
      issue_key: issueKey,
      issue_type: issueType,
      assignee: assignee.name,
      reporter: reporter.name,
      priority,
      sprint: project.phase === "early" ? "TreeHacks Night 1" : project.phase === "mid" ? "TreeHacks Night 1" : "TreeHacks Morning",
    };

    records.push({
      clone_id: world.cloneId,
      source_type: "jira",
      external_id: `jira_${issueKey.toLowerCase()}`,
      title: `[${issueKey}] ${project.name} ${issueType}`,
      author: reporter.name,
      content,
      occurred_at: occurredAt,
      modality: "text",
      source_metadata: metadata,
      raw_payload: {
        issue_key: issueKey,
        board_id: project.jira_board_id,
        assignee: assignee.name,
        reporter: reporter.name,
        body: content,
      },
    });
  }

  return records.sort((a, b) =>
    a.occurred_at > b.occurred_at ? 1 : a.occurred_at < b.occurred_at ? -1 : 0
  );
}
