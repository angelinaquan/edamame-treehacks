import type { SeededRng } from "./random";

export interface SyntheticPerson {
  id: string;
  name: string;
  role: string;
  email: string;
  school: string;
  expertise: string[];
  github: string;
  owns: string[];
  background: string;
  opinions: string[];
}

export interface SyntheticProject {
  key: string;
  name: string;
  repo: string;
  channel: string;
  channel_id: string;
  gdrive_folder_id: string;
  notion_page_id: string;
  jira_board_id: string;
  target_date: string;
  status: "abandoned" | "pivoted" | "active";
  phase: "early" | "mid" | "final";
}

export interface SyntheticConflict {
  topic: string;
  side_a: { position: string; person_role: string };
  side_b: { position: string; person_role: string };
  passive_aggressive: string[];
  heated_exchange: string[];
}

export interface SyntheticWorld {
  cloneId: string;
  people: SyntheticPerson[];
  projects: SyntheticProject[];
  conflicts: SyntheticConflict[];
}

// ────────────────────────────────────────────────────
// Realistic conflicts based on actual hackathon dynamics
// ────────────────────────────────────────────────────

const CONFLICTS: SyntheticConflict[] = [
  {
    topic: "Ambient Listening AI vs pivoting to something demoable",
    side_a: {
      position:
        "The ambient listening idea is genuinely novel — always-on passive context capture from your mic. If we can get Whisper streaming to work, this is a 0-to-1 product. I've done real-time transcription before, it's doable.",
      person_role: "Videet (ML/infra advocate)",
    },
    side_b: {
      position:
        "I've organized TreeHacks before — judges need to SEE something work in 3 minutes. Background audio on Chrome is a nightmare, iOS permissions are worse. We can't demo a terminal script.",
      person_role: "James (pragmatist, knows hackathon format)",
    },
    passive_aggressive: [
      "I love how we're calling 'always spying on people' a feature. Very Silicon Valley of us.",
      "Sure, let's keep building something we can't demo. That'll go great with judges who've seen 200 projects today.",
      "Glad we spent 3 hours on the ambient listening PRD just to throw it away. Time well spent.",
      "Per our last brainstorm, we already voted on this. But I guess Stanford democracy works differently.",
      "Another pivot. That's our second idea change tonight. Great consistency from Team TreeHacks.",
      "The mic permissions issue I flagged 2 hours ago? Yeah, still broken. Shocking.",
    ],
    heated_exchange: [
      "We have 12 hours left and we can't even get Chrome mic permissions to persist across tabs. This isn't a 'small bug' — it's a fundamental blocker.",
      "Videet I know you literally won an IOAI gold medal but this isn't a research competition — it's a hackathon demo. The judges don't care about your Whisper latency benchmarks.",
      "Stop shooting down every idea. If you have a better one, pitch it instead of just saying no to everything I suggest.",
      "I'm not saying no, I'm saying let's be realistic about what 4 sophomores can build overnight. We have two IOAI gold medalists and a Cursor engineer — we'll figure something out, just not THIS.",
      "We've been debating for two hours. That's two hours of building time gone. At MIT we'd have shipped something by now.",
      "Fine, I'll build a prototype in the next hour. If it works, we keep it. If not, we pivot. Deal?",
    ],
  },
  {
    topic: "Post-trained specialized agents vs simpler RAG approach",
    side_a: {
      position:
        "Post-trained specialized agents is the real innovation. I've done LoRA fine-tuning at Sarvam — each agent gets domain-specific weights. That's a research contribution, not just another GPT wrapper.",
      person_role: "Videet (specialized-agents advocate, has fine-tuning experience)",
    },
    side_b: {
      position:
        "We don't have time to fine-tune anything. I tried fine-tuning at MultiOn — even with LoRA it's 20+ min per run on Modal. The judges need to see it WORK, not hear us explain LoRA theory.",
      person_role: "James (demo-focused, has agent experience from MultiOn/SAIL)",
    },
    passive_aggressive: [
      "Cool, so we're building an 'AI workforce' where none of the agents actually do anything yet. Very impressive demo.",
      "I'm sure the judges will love watching us explain fine-tuning theory for 3 minutes. Maybe we can show them a loss curve.",
      "We could also just submit a research paper instead of a hackathon project. Same energy honestly.",
      "I wrote up the whole multi-agent architecture doc and nobody read it. Classic hackathon teamwork.",
      "Let's just pick something and commit. This back-and-forth is burning more time than the actual build.",
      "Adding that to the list of things we 'definitely have time for' at 3am.",
    ],
    heated_exchange: [
      "Neither the ambient listener NOR the workforce idea is demoable in 10 hours. We need something visual that a judge can understand in 30 seconds.",
      "If we can't explain it in one sentence, we've already lost. 'AI workforce with specialized agents' — what does the DEMO look like? A terminal?",
      "You're oversimplifying it. The multi-agent coordination is the novel part. I literally worked on model acceleration at HAN Lab and built speech models at Sarvam — I know what's novel and what's not.",
      "Novel doesn't matter if we can't demo it. I literally organized TreeHacks last year — I've SEEN teams with brilliant ideas lose because their demo crashed in front of judges.",
      "I don't care which idea we go with at this point. I care that we ship SOMETHING before 9am.",
      "I stayed up building the agent framework and now we're pivoting again? Are you serious right now?",
    ],
  },
  {
    topic: "Scope management — do we cut features or ship everything broken",
    side_a: {
      position:
        "We need to cut scope NOW. AI-native memory layer is the idea — let's lock it and build. No more features, no more debates. Ship the core flow: ingest, embed, chat with clone.",
      person_role: "James (scope-cutter, knows what judges look for)",
    },
    side_b: {
      position:
        "If we cut too much, OrgPulse won't stand out. We need the full vision — onboarding briefs, offboarding handoffs, memory explorer, CEO insights, clone chat. The more we show, the more impressive it is.",
      person_role: "Angelina (maximalist, wants the full product vision)",
    },
    passive_aggressive: [
      "Oh cool, we added ANOTHER feature. I'm sure we'll sleep at some point tonight.",
      "I love that our MVP has 8 features. Very 'minimum' of us. Really nailing the M in MVP.",
      "Should I keep coding or should I wait for the scope to change again in 20 minutes?",
      "Friendly reminder that we have 5 hours left and the demo doesn't work yet. But sure, let's add voice mode.",
      "I'm sure the judges will appreciate our ambition when nothing loads during the presentation.",
      "Adding that to the growing list of things we 'definitely have time for' at 4am.",
    ],
    heated_exchange: [
      "The demo is in 5 hours and we don't have a working prototype. Does anyone else think that's a problem or is it just me?",
      "If one more person suggests adding a feature, I'm going to lose it. We can barely get the clone chat working without 500 errors.",
      "Look, I get that we all have opinions. But we committed to the memory layer idea 3 hours ago. Can we please just finish it.",
      "We've pivoted TWICE tonight. If we pivot again we'll have literally nothing to show. Zero. Is that what we want?",
      "I've been coding since 9:30pm and it's now 4am. I've had 3 Red Bulls and zero sleep. Can we PLEASE just build the thing we agreed on.",
      "Someone just make a decision and we all commit. I'm too tired and too caffeinated to keep debating this.",
    ],
  },
  {
    topic: "Frontend polish vs backend robustness",
    side_a: {
      position:
        "The frontend needs to look polished. Judges are visual — if it looks like a terminal app, we're dead. I don't care how good the RAG pipeline is if the UI looks like it was built by backend engineers.",
      person_role: "Angelina (frontend/UX advocate)",
    },
    side_b: {
      position:
        "The frontend can be ugly if the AI actually works. I'd rather have a working clone that gives real answers from Slack data than a beautiful UI with 500 errors behind every button.",
      person_role: "Ella (backend robustness advocate)",
    },
    passive_aggressive: [
      "Great, the UI looks beautiful. Too bad clicking any button returns a 500 error. Very aesthetic of us.",
      "I'm glad we spent 2 hours on the color palette while the RAG pipeline still hallucinates. Priorities.",
      "The Tailwind classes look amazing. Maybe the judges will inspect element instead of using the product.",
      "Sure, let's add another animation. I'm sure that's what's standing between us and first place.",
      "I think the real innovation here is having a dark mode toggle on a product that doesn't work.",
      "At least when it crashes, it crashes beautifully.",
    ],
    heated_exchange: [
      "I'm not saying the UI doesn't matter. I'm saying a working demo with an ugly UI beats a broken demo with a pretty UI. Every. Single. Time.",
      "Have you SEEN what wins hackathons? It's always the team with the best demo. I work at Cursor — I know what good product design looks like. Nobody wins with a Jupyter notebook.",
      "The embeddings are returning garbage results and you want me to fix the border radius? The judges are going to ask it a question and get a hallucinated answer.",
      "If I have to choose between fixing the search quality and making the sidebar 2px narrower, I'm fixing search. Sorry not sorry.",
      "Ella you're right that it needs to work but it ALSO needs to look like a real product. I've shipped code at Cursor, AWS, and Scale AI — trust me, polish matters.",
      "Fine, I'll fix the backend bugs AND the frontend. But I need everyone to stop adding new features for the next 3 hours. Deal?",
    ],
  },
];

// ────────────────────────────────────────────────────
// World builder
// ────────────────────────────────────────────────────

export function buildSyntheticWorld(
  cloneId: string,
  rng: SeededRng
): SyntheticWorld {
  const basePeople: SyntheticPerson[] = [
    {
      id: "u_james",
      name: "James Liu",
      role: "ML & Backend Lead",
      email: "jamesliu535b@gmail.com",
      school: "Stanford",
      expertise: ["ML", "multi-agent systems", "RAG", "LLM post-training", "Python"],
      github: "jamesliu",
      owns: [
        "RAG pipeline (ingest, chunk, embed, search)",
        "Clone chat API endpoint and streaming (SSE)",
        "LLM system prompts and prompt engineering",
        "CEO insights multi-agent pipeline",
        "Continual learning / memory extraction from conversations",
        "Voice transcription integration with Whisper",
        "Synthetic data generation system",
        "Demo script and presentation strategy",
      ],
      background: "Stanford CS & Math sophomore. Research at Stanford AI Lab (SAIL) on LLM post-training. Previously AI Engineer at MultiOn building autonomous agents, backend engineer at Carta, quantitative trading at Jane Street ETC. TreeHacks organizer — knows the hackathon format and judging criteria intimately. CS198 section leader. Published REAL: Benchmarking Autonomous Agents.",
      opinions: [
        "I think OrgPulse is the strongest idea we've had all night. The memory layer concept is technically novel but also extremely demoable — you can literally show a digital twin answering questions with real context. That's the magic moment judges remember.",
        "The ambient listener idea was cool but fundamentally un-demoable. You can't show 'always-on passive listening' in a 3-minute demo without it just looking like a voice recorder. I organized TreeHacks last year — I've seen teams lose with ideas way better than that because the demo fell flat.",
        "I was initially skeptical of the AI workforce idea but Videet's multi-agent framework was actually impressive. The problem was iteration speed — you can't fine-tune models at a hackathon. But the agent-to-agent communication protocol we built is genuinely useful and we're reusing it in OrgPulse for clone consultation.",
        "My biggest concern with OrgPulse right now is scope. Angelina wants to show everything — onboarding, offboarding, memory explorer, CEO insights, clone chat, voice mode. That's 6+ features. I'd rather show 3 polished features than 6 broken ones. Judges care about 'does it work live' more than 'how many features does it have.'",
        "The RAG pipeline is the technical core of OrgPulse and I'm proud of how it turned out. The retrieval quality is surprisingly good — when you ask a clone a question, the cited sources are actually relevant. That's not easy to get right, especially with mixed data sources (Slack + Drive + email).",
        "I think we should lead the demo with the CEO insights view because the multi-clone sentiment analysis is visually impressive and shows the full power of the system. Then clone chat for the personal experience. Then live Slack learning for the wow moment.",
        "Honestly, I think the pivot journey IS part of our product story. We experienced organizational memory loss during our own pivots — we literally lost context about decisions we'd made 3 hours earlier. That's the pain point OrgPulse solves, and we can tell that story authentically because we lived it.",
        "The continual learning feature is what makes OrgPulse different from just another RAG chatbot. The clone doesn't just search static documents — it actually gets smarter over time from every conversation. That's the research contribution: a memory system that compounds.",
        "I decided that AI brain rot is the future of e-commerce. Just kidding — but seriously, the idea that organizations could have AI twins that capture and serve institutional knowledge is genuinely transformative. Most companies lose 40% of their institutional knowledge when someone leaves.",
        "We decided to go with approach B for the auth system — OAuth shared between Drive and Gmail simplifies the UX and we only need one consent screen. Ella nailed the token refresh flow.",
        "I think the SELFIMP deadline being moved AGAIN is frustrating but we need to focus on what we can control. The demo is in a few hours and that's what matters right now.",
        "For the demo, I want to show the agent topology visualization that Angelina built. When the CEO asks a question and you see particles flying between agent nodes in real-time — that's the kind of visual that makes judges stop and pay attention.",
      ],
    },
    {
      id: "u_ella",
      name: "Ella Lan",
      role: "Full-Stack Engineer",
      email: "ella2happy@gmail.com",
      school: "Stanford",
      expertise: ["full-stack", "Next.js", "Supabase", "integrations", "TypeScript"],
      github: "ellan",
      owns: [
        "Supabase schema design and database management",
        "All integration APIs (Slack, Google Drive, Gmail, GitHub, Notion)",
        "OAuth flows and Google authentication",
        "API routes and server-side middleware",
        "Settings/integrations page",
        "Data sync pipelines for all sources",
        "Webhook handlers (Slack real-time)",
        "Error handling and API reliability",
      ],
      background: "Stanford sophomore. Full-stack developer specializing in Next.js, TypeScript, and Supabase. The pragmatic builder on the team — writes clean, reliable code and handles the plumbing that connects everything together. Responsible for making sure the integrations actually work end-to-end.",
      opinions: [
        "I think OrgPulse is a great idea but we need to focus on reliability over features. The clone chat throws 500 errors ~10% of the time and we can't have that in a live demo. I'd rather fix the bugs we have than add new features.",
        "The ambient listener was never going to work technically. I said from the start that Chrome kills background workers after 30 seconds — that's not a bug, it's by design for battery conservation. We should have pivoted earlier.",
        "I wasn't sold on the AI workforce idea because fine-tuning is slow and expensive. But Videet was passionate about it and I respected that. The multi-agent coordination code turned out to be valuable for OrgPulse anyway.",
        "My contribution to OrgPulse is less glamorous than the AI stuff — I built the database schema, the integration APIs, the OAuth flows, the webhook handlers. It's plumbing, but without it nothing works. The Slack webhook is my favorite thing I built — seeing a message appear in Slack and then watching the clone learn it in real-time is magical.",
        "I think the biggest risk for the demo is reliability, not features. If the CEO insights view crashes because of a Supabase connection limit, or if the Google OAuth token expires silently mid-demo, we're toast. That's why I spent 2 hours on connection pooling and token refresh instead of adding features.",
        "I had to fix a silent token expiry bug at 4am where Google Drive sync was failing because the OAuth token expired after 1 hour and my refresh logic wasn't working. That was scary — the demo would have broken without anyone noticing until judging.",
        "I actually think showing fewer features more reliably is the right move. James and I agree on this. Every feature we add is another thing that can break during the demo. Let's nail clone chat + insights + live learning and call it done.",
        "The Supabase schema design was one of my best decisions. Putting everything in a unified memories table with type discriminators means we can add new data sources without schema changes. It's clean and extensible. pgvector for semantic search was the right call over a separate vector DB.",
        "I'm worried about the Jira integration — we said we'd have it for demo but it's not started and there are 3 hours left. I think we should cut it and focus on making Slack + Drive + Gmail bulletproof.",
        "Videet and I have been coordinating on the embedding pipeline. He handles the ML infrastructure (Modal, model selection, caching) and I handle the data flow (ingestion, storage, deduplication). We've actually become a pretty effective pair on this.",
        "We decided to go with approach B for the auth system because sharing OAuth between Drive and Gmail means one consent screen instead of two. Better UX and less code to maintain.",
        "I think what makes our project special compared to other hackathon projects is that the integrations are REAL. We actually connect to real Slack workspaces and real Google Drive. Most teams mock their data sources — we sync live data.",
      ],
    },
    {
      id: "u_angelina",
      name: "Angelina Quan",
      role: "Product & Frontend",
      email: "angelinaquan2024@gmail.com",
      school: "MIT",
      expertise: ["product design", "React", "code quality", "frontend", "Tailwind"],
      github: "angelinaquan",
      owns: [
        "All frontend UI components (React/Next.js/Tailwind)",
        "Dark theme visual design (Cursor-inspired aesthetic)",
        "Employee chat view and CEO insights view",
        "Agent network topology visualization",
        "Sidebar navigation and layout components",
        "Onboarding/offboarding/knowledge base UI",
        "UX flows, responsive design, and polish",
        "Demo presentation slides and narrative",
      ],
      background: "MIT Math & CS (AI and Decision Making) sophomore. Currently SWE Intern at Cursor on the Code Quality team — brought the Cursor-inspired dark theme aesthetic to OrgPulse. Previously Gen AI intern at Scale AI, SDE intern at AWS (Insights & Optimizations), researcher at MIT Media Lab (Viral Communications Group). IOAI Gold Medalist, 2x USAMO qualifier, IEEE published on lattice-based cryptography. Stanford University Mathematics Camp alum.",
      opinions: [
        "I think OrgPulse has the potential to be a real product, not just a hackathon project. The digital twin concept is something enterprises would actually pay for. I've seen the need for this at AWS and Scale AI — onboarding new people is a nightmare because institutional knowledge is scattered across 15 different tools.",
        "The dark theme was non-negotiable for me. I work at Cursor — I know what good developer tools look like. The original light theme looked like every other hackathon project. Now it looks like a product you'd actually pay for. Judges make snap judgments in the first 10 seconds and visual polish is how you win those seconds.",
        "I pushed for keeping ALL the features in the demo because I believe the breadth of OrgPulse is what makes it impressive. Clone chat alone is just another chatbot. But clone chat + CEO insights + continual learning + onboarding briefs + offboarding handoffs? That's a PLATFORM. That's what wins hackathons.",
        "I know James and Ella want to cut scope but I think showing the full vision is worth the risk. At Scale AI I learned that the best products show ambition. Judges want to see where this could go, not just what it does today.",
        "The agent network visualization is the thing I'm most proud of. When the CEO asks a question and you see particles flying between agent nodes — the orchestrator dispatching to research, research querying clones, clones responding — it makes the AI feel alive. I spent 4 hours on the SVG animations and bezier curve particle effects and it was worth every minute.",
        "I think the ambient listener idea was technically interesting but had terrible UX. 'We're always listening to you' is not a product pitch that inspires trust. OrgPulse is better because the data ingestion is explicit — you connect your Slack, your Drive, your email. The user is in control.",
        "The AI workforce idea was Videet's baby and I respect the technical ambition. But from a product perspective, 'specialized agents fine-tuned with LoRA' doesn't translate to a compelling demo. Users don't care about model weights — they care about answers. OrgPulse gives them answers.",
        "My biggest worry is that the backend isn't stable enough for a live demo. The clone chat 500 errors scare me. At Cursor we have extensive test coverage and CI/CD — we can't have that here but we need at least a manual test run before judging.",
        "I decided think that AI brain rot is the future of e-commerce — wait no, that was a joke James made at 3am. But seriously, I do think AI digital twins are the next big thing in enterprise software. Every company will have them within 5 years.",
        "For the demo narrative, I think we should be honest about the pivots. 'We tried three ideas in one night' shows intellectual honesty and adaptability. The fact that code from abandoned ideas (Whisper from ambient listener, agent protocol from workforce) ended up in OrgPulse is a great story arc.",
        "The onboarding brief feature is underrated. Auto-generating a 'here's what you need to know' doc for a new hire — with key people, recent decisions, risks — from organizational memory? That's a real product. I've seen new engineers at AWS spend 2 weeks just figuring out who to talk to.",
        "We decided to go with shipping approach B for the auth system okay — sharing OAuth between Drive and Gmail. It's cleaner UX and Ella already had the token refresh working.",
      ],
    },
    {
      id: "u_videet",
      name: "Videet Mehta",
      role: "ML Infrastructure",
      email: "mvideet@gmail.com",
      school: "MIT",
      expertise: ["PyTorch", "fine-tuning", "CUDA", "distributed training", "model acceleration"],
      github: "videetmehta",
      owns: [
        "Modal deployment for all ML compute",
        "Whisper pipeline setup and optimization",
        "Embedding generation infrastructure (text-embedding-3-small)",
        "Voice synthesis (TTS) integration",
        "LoRA fine-tuning experiments (AI Workforce, abandoned)",
        "pgvector setup, indexing, and query optimization",
        "Performance profiling and caching strategy",
        "ML model selection and benchmarking",
      ],
      background: "MIT CS sophomore. AI Researcher at HAN Lab working on accelerating diffusion language models. Research at MIT CSAIL Spoken Language Systems on audio event classification. Previously ML Engineer at Sarvam AI building Hindi/English speech-to-speech foundation models with distributed training. AI Research Scientist Intern at Mercuria Energy Trading (power market forecasting, GPU/CUDA pipeline optimization). IOAI Gold Medalist (represented USA). Founding Engineer at Hidden Studios (in-game advertising ML). Skills: PyTorch, JAX, DDP, Deepspeed, CUDA.",
      opinions: [
        "I still think the ambient listener was the most novel idea. Always-on passive context capture is a genuine research contribution — nobody has solved it well. I built the Whisper pipeline in 30 minutes and the transcription quality was excellent. The technical limitation was Chrome's service worker lifecycle, not the AI. If we had a native app, this would work beautifully.",
        "The AI workforce with specialized agents was my favorite idea. LoRA fine-tuning is the real deal — I've done it at Sarvam and at HAN Lab. The problem wasn't the approach, it was the hackathon time constraint. Each training run takes 20 minutes on Modal, which means we could only iterate 3 times before demo. That's not enough to get good results.",
        "OrgPulse is a good idea and I'm glad we converged on it. The memory layer concept is sound — embeddings + pgvector + RAG is a well-understood stack that we can execute on in a few hours. It's not as novel as the other ideas but it's highly demoable and that's what matters at a hackathon.",
        "I think the technical core of OrgPulse — the embedding pipeline — is where I add the most value. I chose text-embedding-3-small over the large variant (1536-d vs 3072-d) because the latency difference matters for real-time chat. I also set up embedding caching so repeat queries skip the API call entirely. These decisions make the difference between a smooth demo and a laggy one.",
        "The voice mode is something I'm particularly proud of. I built the Whisper transcription pipeline for the ambient listener and we're now reusing it for voice input in OrgPulse. I also added TTS for voice output. So you can literally talk to the clone and hear it respond. The speech model work I did at Sarvam AI directly prepared me for this.",
        "I think James is right that we need to cut scope. I initially pushed for more features but after the 500-error incident at 4am I realized reliability > features for a live demo. I'd rather have a clone chat that works flawlessly than 8 features where 3 of them crash.",
        "The embedding dimension bug I found at 3am was terrifying. I was accidentally using text-embedding-3-large (3072 dimensions) instead of small (1536). The pgvector index was working but 2x slower than it should have been, and the search quality was actually worse because the larger embeddings were overfitting to irrelevant details.",
        "I think the agent-to-agent communication protocol from the AI workforce idea is the most underrated piece of code we wrote tonight. The clone consultation feature in OrgPulse — where one clone asks another for context it doesn't have — uses that exact protocol. So our 'failed' ideas actually contributed directly to the final product.",
        "My hot take: the hackathon format is broken for ML projects. You can't do real research in 12 hours. You can build a wrapper around GPT-4o or you can set up an infrastructure pipeline. We chose pipeline, which is the right call. But I would have loved to show the judges a genuinely novel model architecture.",
        "The pgvector optimization I did matters more than people realize. Without the IVFFlat index, each semantic search query took 200ms+ on 10K memories. After the index, it's under 50ms. That's the difference between a responsive chat experience and a noticeable delay. I also tuned the probes parameter — higher probes = better accuracy but slower. We went with probes=10 as a sweet spot.",
        "Modal cold starts were killing us. The TTS endpoint took 30 seconds to spin up on the first call. I added a keep-alive ping every 5 minutes that hits each Modal endpoint with a lightweight health check. Now the first call is fast. Without this, the demo would have a 30-second pause the first time someone uses voice mode.",
        "We decided to go with approach B for the auth system — Ella's right that shared OAuth is cleaner. I was pushing for separate tokens per service but she convinced me it's unnecessary complexity for a hackathon.",
        "I think the strongest part of our demo is going to be the live Slack learning moment. Send a message → clone learns it in real-time → ask the clone about it. That's 'show, don't tell' at its best. The judges don't need to understand embeddings or pgvector — they just need to see the clone learn in real-time.",
      ],
    },
  ];

  const projects: SyntheticProject[] = [
    {
      key: "AMBIENT",
      name: "Ambient Listening AI",
      repo: "angelinaquan/ai-clone-treehacks",
      channel: "treehacks-general",
      channel_id: "C_TREEHACKS",
      gdrive_folder_id: "folder_ambient_ai",
      notion_page_id: "notion_ambient",
      jira_board_id: "board_treehacks",
      target_date: "2026-02-15 9:30 AM PT",
      status: "abandoned",
      phase: "early",
    },
    {
      key: "WORKFORCE",
      name: "AI Workforce - Specialized Agents",
      repo: "angelinaquan/ai-clone-treehacks",
      channel: "treehacks-general",
      channel_id: "C_TREEHACKS",
      gdrive_folder_id: "folder_ai_workforce",
      notion_page_id: "notion_workforce",
      jira_board_id: "board_treehacks",
      target_date: "2026-02-15 9:30 AM PT",
      status: "pivoted",
      phase: "mid",
    },
    {
      key: "ORGPULSE",
      name: "OrgPulse - AI-Native Memory Layer",
      repo: "angelinaquan/ai-clone-treehacks",
      channel: "treehacks-build",
      channel_id: "C_BUILD",
      gdrive_folder_id: "folder_orgpulse",
      notion_page_id: "notion_orgpulse",
      jira_board_id: "board_treehacks",
      target_date: "2026-02-15 9:30 AM PT",
      status: "active",
      phase: "final",
    },
  ];

  // Rotate people based on clone so each clone's data feels unique
  const rotatedPeople = [...basePeople];
  const rotation = rng.int(0, rotatedPeople.length - 1);
  for (let i = 0; i < rotation; i++) {
    const head = rotatedPeople.shift();
    if (head) rotatedPeople.push(head);
  }

  const shuffledConflicts = [...CONFLICTS].sort(() => rng.next() - 0.5);

  return {
    cloneId,
    people: rotatedPeople,
    projects,
    conflicts: shuffledConflicts,
  };
}
