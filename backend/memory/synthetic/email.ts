import type { MemoryResourceInput } from "@/lib/core/types";
import type { SyntheticPerson, SyntheticProject, SyntheticWorld } from "./context";
import { randomIsoBetween, type SeededRng } from "./random";

interface EmailSourceMetadata extends Record<string, unknown> {
  source_type: "email";
  message_id: string;
  thread_id: string;
  from: string;
  to: string[];
  cc: string[];
  subject: string;
}

interface EmailGeneratorParams {
  world: SyntheticWorld;
  rng: SeededRng;
  count: number;
  startIso: string;
  endIso: string;
}

function buildNormalEmail(
  project: SyntheticProject,
  from: SyntheticPerson,
  to: SyntheticPerson,
  rng: SeededRng
): { subject: string; body: string } {
  if (project.phase === "early") {
    const templates = [
      {
        subject: "Ambient Listener - Whisper API benchmarks",
        body: `Hey ${to.name},

Ran some quick benchmarks on Whisper models for the ambient listener:

- whisper-large-v3: 1.8s for 30s clip, ~95% accuracy
- distil-whisper-large: 0.9s for 30s clip, ~89% accuracy
- whisper-small: 0.3s for 30s clip, ~78% accuracy

I think large-v3 is the move for demo quality. The latency is fine if we're batching every 30 seconds instead of real-time streaming.

Modal costs are negligible — like $0.003 per transcription call.

Let me know if you want to test with different audio conditions (noisy venue, multiple speakers, etc).

${from.name}`,
      },
      {
        subject: "Re: Chrome mic permissions — blocker",
        body: `${to.name},

Bad news on the Chrome audio capture front. The MediaRecorder API works fine for active recording, but there's no way to keep it running when the tab loses focus without a service worker hack.

Options:
1. Chrome extension with background permissions (adds 2-3 hours of work)
2. Desktop Electron wrapper (not a web app anymore)
3. Just do active recording with a button press (defeats the "ambient" part)

Honestly I think option 3 is where we'll end up. Which makes this just... a voice recorder with AI.

${from.name}`,
      },
    ];
    return rng.pick(templates);
  }

  if (project.phase === "mid") {
    const templates = [
      {
        subject: "Multi-agent routing architecture — draft",
        body: `${to.name},

Here's my proposal for the agent coordination layer:

1. User query comes in
2. Intent classifier picks the domain (legal, finance, engineering, product)
3. Coordinator dispatches to the specialized agent
4. Agent responds with domain-grounded answer + citations
5. If the agent needs cross-domain context, it can query another agent

I've got the coordinator working locally. The routing is just a simple GPT-4o-mini call with function calling — fast and cheap.

The open question is: how do we show the specialization in a 3-minute demo? Just different system prompts won't be visually impressive.

Thoughts?
${from.name}`,
      },
      {
        subject: "LoRA fine-tuning on Modal — results",
        body: `Team,

Just finished first round of LoRA fine-tuning for the specialized agents:

- Legal agent: 500 training examples, 22 min on A100, loss converged at 0.8
- Finance agent: 500 examples, 19 min, loss at 0.9 (needs more data)
- Engineering agent: didn't finish — Modal timed out after 30 min

The results are... fine? The legal agent can cite cases accurately now but the finance agent still hallucinates numbers.

Problem: each iteration is 20 min. At a hackathon, that means we can only do ~3 training runs before demo time. Not enough to iterate properly.

I still think this is the right approach long-term but maybe not for a 12-hour hackathon.

${from.name}`,
      },
    ];
    return rng.pick(templates);
  }

  // Final phase
  const templates = [
    {
      subject: "Edamame — Role assignments (FINAL, do not change)",
      body: `Team,

Locking these in so there's zero ambiguity about who owns what:

JAMES (ML & Backend Lead):
→ RAG pipeline (ingest, chunk, embed, search)
→ Clone chat streaming API
→ CEO insights multi-agent pipeline
→ Continual learning / memory extraction
→ LLM prompts and prompt engineering
→ Demo presentation and strategy

ELLA (Full-Stack / Integrations):
→ Supabase schema and database
→ ALL integration APIs (Slack, Drive, Gmail, GitHub, Notion)
→ OAuth flows and authentication
→ Webhook handlers
→ Settings page backend
→ Connection pooling and API reliability

ANGELINA (Product & Frontend):
→ ALL React/Next.js UI components
→ Dark theme (Cursor-inspired)
→ Chat view, insights view, knowledge base view
→ Agent network visualization
→ Layout, sidebar, navigation
→ Demo slides and narrative

VIDEET (ML Infrastructure):
→ Modal deployments for ML compute
→ Whisper transcription pipeline
→ Embedding generation and caching
→ Voice synthesis (TTS)
→ pgvector optimization
→ Performance tuning

If your feature depends on someone else's area, message them directly.
If something breaks at 4am, check this list before waking everyone up.

${from.name}`,
    },
    {
      subject: "Re: Who handles backend for Edamame?",
      body: `${to.name},

Backend responsibilities are split between three people:

• James handles all the AI/ML backend — the RAG pipeline, clone chat API, insights streaming, and continual learning. If you need to change how the LLM responds or how memories are searched, talk to James.

• Ella handles the infrastructure backend — Supabase database, all integration APIs (Slack, Drive, Gmail), OAuth, webhooks. If something returns a 500 error or the database is slow, talk to Ella.

• Videet handles ML infrastructure — Modal deployments, Whisper, embeddings, voice synthesis, pgvector. If embeddings are wrong or Modal is timing out, talk to Videet.

Angelina handles the entire frontend — every React component, the dark theme, all the views. She doesn't touch backend code.

In short: James = AI logic, Ella = data plumbing, Videet = ML compute, Angelina = UI.

${from.name}`,
    },
    {
      subject: "My honest thoughts on Edamame direction",
      body: `Team,

Since we're locked into Edamame now and the demo is in a few hours, I want to share my honest assessment so we're aligned.

What I think is working:
${from.opinions?.[0] || "The memory layer concept is solid and highly demoable."}

What I'm worried about:
${from.opinions?.[3] || "We might be trying to show too much in 3 minutes."}

What I'd change if we had more time:
${from.opinions?.[7] || "I'd want better test coverage and more robust error handling."}

I'm committed to shipping this regardless. Let's make it great.

${from.name}`,
    },
    {
      subject: `Re: Where should Edamame go after TreeHacks?`,
      body: `${to.name},

Good question. Here's what I think:

${from.opinions?.[1] || "I think we learned a lot from the pivot journey."}

${from.opinions?.[4] || "There's definitely a real product here."}

Beyond the hackathon, I think the digital twin concept could be huge for enterprise knowledge management. Every company with more than 50 people has the problem we're solving.

Thoughts?
${from.name}`,
    },
    {
      subject: "Edamame — Supabase schema finalized",
      body: `Team,

Schema is locked. Here's what we're running with:

Tables:
- clones: employee digital twins (name, personality, expertise, suggested_questions)
- memories: unified knowledge store (content, embedding, source_type, clone_id, memory_type)
- messages: chat history per clone
- integrations: OAuth tokens + API keys for data sources

Key design decision: everything goes in the memories table with type discriminators (document, chunk, fact, category). No separate tables per source. This means Slack messages, Drive docs, emails, GitHub commits — all stored the same way with source_metadata for source-specific fields.

pgvector extension is enabled for cosine similarity search on the embedding column.

${from.name}`,
    },
    {
      subject: "Re: Demo script — final version",
      body: `${to.name},

Updated demo script (3 minutes):

0:00-0:30 — Intro: "Every org has a memory problem. Edamame fixes it with AI digital twins."
0:30-1:15 — CEO insights: Ask "What does the team think about our launch?" Show multi-clone sentiment analysis
1:15-2:00 — Clone chat: Chat with a clone, show RAG citations, continual learning panel
2:00-2:30 — Live demo: Send a Slack message, show the clone learning it in real-time
2:30-3:00 — Onboarding brief + closing: "Edamame turns scattered knowledge into living memory"

I think we should practice this at least twice before judging starts. Last hackathon I saw a team with an amazing project lose because their demo crashed.

${from.name}`,
    },
    {
      subject: "Integration status update",
      body: `Quick status on data source integrations:

✅ Slack: Bot token auth, webhook for real-time messages, channel sync
✅ Google Drive: OAuth flow working, syncs docs + sheets
✅ Gmail: OAuth shared with Drive, pulls last 50 threads
⬜ GitHub: Token auth done, need to wire up repo sync
⬜ Notion: API key auth, page sync partially working
⬜ Jira: Not started (probably won't make it for demo)

For the demo we only need Slack + Drive working reliably. The rest is nice-to-have.

${from.name}`,
    },
  ];
  return rng.pick(templates);
}

function buildSpicyEmail(
  project: SyntheticProject,
  world: SyntheticWorld,
  fromPerson: { name: string; email: string },
  toPerson: { name: string; email: string },
  rng: SeededRng
): { subject: string; body: string; cc: string[] } {
  const conflict = rng.pick(world.conflicts);
  const ccPeople = world.people
    .filter((p) => p.email !== fromPerson.email && p.email !== toPerson.email)
    .map((p) => p.email);

  const templates = [
    {
      subject: `Re: Re: Re: Idea pivot — please just decide`,
      body: `${toPerson.name},

I'm going to be direct: we've now spent ${rng.int(4, 6)} hours debating ideas and we have ZERO working code to show for it.

${conflict.heated_exchange[rng.int(0, conflict.heated_exchange.length - 1)]}

Here's where we are:
- Ambient Listener: abandoned after mic permissions nightmare
- AI Workforce: LoRA training too slow for hackathon iteration
- ???: currently debating at ${rng.pick(["1am", "2am", "3am"])} instead of coding

I'm proposing we go with the memory layer idea and LOCK IT. No more pivots. Every minute we spend debating is a minute we're not building.

${conflict.passive_aggressive[rng.int(0, conflict.passive_aggressive.length - 1)]}

${fromPerson.name}

CC'ing the whole team so everyone sees this and we can stop going in circles.`,
      cc: ccPeople,
    },
    {
      subject: `URGENT: Demo is broken — need all hands`,
      body: `Team,

It's ${rng.pick(["4am", "5am", "6am"])} and the demo is in ${rng.int(3, 5)} hours. Here's what's broken:

1. Clone chat returns 500 error ~40% of the time (embedding generation timeout)
2. CEO insights view crashes when querying more than 3 clones simultaneously
3. The onboarding brief sometimes returns empty (null safety issue)
4. Voice mode works but the TTS sounds robotic

${toPerson.name} — I need you to focus on #1 and #2. Those are demo-critical.

${conflict.heated_exchange[rng.int(0, conflict.heated_exchange.length - 1)]}

I know we're all tired but we can sleep after judging. Right now we need to ship.

${fromPerson.name}`,
      cc: ccPeople,
    },
    {
      subject: `Re: Feature request — NO. Focus.`,
      body: `${toPerson.name},

I just saw your message about adding a "voice clone" feature. I need to be crystal clear:

WE ARE NOT ADDING ANY MORE FEATURES.

${conflict.passive_aggressive[rng.int(0, conflict.passive_aggressive.length - 1)]}

What we need right now:
- Fix the bugs in what we have
- Test the demo flow end to end
- Practice the presentation

What we do NOT need:
- New features
- More Tailwind animations
- A "wouldn't it be cool if" conversation at ${rng.pick(["3am", "4am"])}

${conflict.heated_exchange[rng.int(0, conflict.heated_exchange.length - 1)]}

${fromPerson.name}`,
      cc: ccPeople,
    },
  ];

  return rng.pick(templates);
}

export function generateEmailResources({
  world,
  rng,
  count,
  startIso,
  endIso,
}: EmailGeneratorParams): MemoryResourceInput[] {
  const records: MemoryResourceInput[] = [];

  for (let i = 0; i < count; i++) {
    const progress = i / count;
    let project: SyntheticProject;
    if (progress < 0.25) {
      project = world.projects.find((p) => p.phase === "early") || rng.pick(world.projects);
    } else if (progress < 0.5) {
      project = world.projects.find((p) => p.phase === "mid") || rng.pick(world.projects);
    } else {
      project = world.projects.find((p) => p.phase === "final") || rng.pick(world.projects);
    }

    const fromPerson = rng.pick(world.people);
    const toPerson = rng.pick(world.people.filter((p) => p.id !== fromPerson.id));
    const isSpicy = rng.bool(0.4);
    const occurredAt = randomIsoBetween(rng, startIso, endIso);
    const messageId = `msg_${project.key.toLowerCase()}_${i + 1}_${rng.int(10000, 99999)}`;
    const threadId = `thread_${project.key.toLowerCase()}_${rng.int(100, 999)}`;

    let subject: string;
    let body: string;
    let cc: string[] = [];

    if (isSpicy) {
      const spicy = buildSpicyEmail(project, world, fromPerson, toPerson, rng);
      subject = spicy.subject;
      body = spicy.body;
      cc = spicy.cc;
    } else {
      const normal = buildNormalEmail(project, fromPerson, toPerson, rng);
      subject = normal.subject;
      body = normal.body;
    }

    const metadata: EmailSourceMetadata = {
      source_type: "email",
      message_id: messageId,
      thread_id: threadId,
      from: fromPerson.email,
      to: [toPerson.email],
      cc,
      subject,
    };

    records.push({
      clone_id: world.cloneId,
      source_type: "email",
      external_id: messageId,
      title: subject,
      author: fromPerson.name,
      content: body,
      occurred_at: occurredAt,
      modality: "text",
      source_metadata: metadata,
      raw_payload: {
        message_id: messageId,
        thread_id: threadId,
        from: fromPerson.email,
        to: [toPerson.email],
        cc,
        subject,
        body,
      },
    });
  }

  return records.sort((a, b) =>
    a.occurred_at > b.occurred_at ? 1 : a.occurred_at < b.occurred_at ? -1 : 0
  );
}
