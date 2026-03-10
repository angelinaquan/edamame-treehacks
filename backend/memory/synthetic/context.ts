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
    topic: "Episodic vs semantic memory prioritization in the memory layer",
    side_a: {
      position:
        "Episodic memory and mem0-style recall are the differentiator. We should prioritize 'what happened when' and event-level ingestion so clones can answer 'what did we decide last week?' — that's what enterprises actually need.",
      person_role: "James (memory layer lead, episodic/semantic focus)",
    },
    side_b: {
      position:
        "Semantic memory and RAG over stable knowledge are enough for the demo. We don't have time to build a full mem0 pipeline — get the retrieval working first, then add episodic layers post-hackathon.",
      person_role: "Angelina (RAG/long-term capabilities lead)",
    },
    passive_aggressive: [
      "Sure, let's add another memory type when we haven't nailed basic retrieval yet. Great prioritization.",
      "Per our last architecture doc, we said semantic first. But I guess the memory layer spec is a living document.",
      "We already have 500-token chunks and embeddings. Episodic would mean re-ingestion and a new schema. That's not a small ask.",
      "I'd love to do mem0-style consolidation too, but we have 12 hours. Let's ship what we have.",
      "Another scope expansion. Classic.",
      "The eval suite doesn't even cover episodic yet. Can we land the current pipeline first?",
    ],
    heated_exchange: [
      "If we don't differentiate on memory types, we're just another RAG wrapper. Episodic + semantic is the product.",
      "I'm not saying no to episodic — I'm saying we need retrieval correctness first. Wrong answers lose judges faster than missing features.",
      "The memory layer is the whole thesis. 'AI-native memory for enterprise' means we have to show we understand memory, not just search.",
      "We do understand it — we have embeddings, we have clone isolation, we have continual learning. That's already memory. Episodic can be v2.",
      "Let's lock the schema for semantic and ship. We can add episodic in a follow-up without breaking anything.",
      "Fine. Semantic first, but we document episodic as the next milestone so we don't forget.",
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
      "We need something visual that a judge can understand in 30 seconds. Multi-agent coordination is great but the demo has to work.",
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
        "If we cut too much, Edamame won't stand out. We need the full vision — onboarding briefs, offboarding handoffs, memory explorer, CEO insights, clone chat. The more we show, the more impressive it is.",
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
      expertise: ["episodic memory", "mem0", "memory layer", "semantic memory", "ML", "RAG", "Python"],
      github: "jamesliu",
      owns: [
        "Memory layer architecture (episodic + semantic)",
        "mem0 integration and event-level memory",
        "Episodic memory ingestion and recall",
        "Semantic memory schema and retrieval contract",
        "Clone chat API endpoint and streaming (SSE)",
        "LLM system prompts and prompt engineering",
        "CEO insights multi-agent pipeline",
        "Continual learning / memory extraction from conversations",
        "Synthetic data generation system",
        "Demo script and presentation strategy",
      ],
      background: "Stanford CS & Math sophomore. Research at Stanford AI Lab (SAIL) on LLM post-training. Previously AI Engineer at MultiOn building autonomous agents, backend engineer at Carta, quantitative trading at Jane Street ETC. TreeHacks organizer — knows the hackathon format and judging criteria intimately. CS198 section leader. Published REAL: Benchmarking Autonomous Agents. Specialized knowledge: episodic memory, mem0, and the full memory layer including semantic memory.",
      opinions: [
        "I think Edamame is the strongest idea we've had. The memory layer — episodic plus semantic — is the differentiator. Organizations need 'what happened when' as much as 'what do we know.' That's what I care about getting right.",
        "mem0-style consolidation and event-level recall are where we should invest next. Right now we're strong on semantic search; adding proper episodic memory will make clones answer 'what did we decide last week?' instead of just 'what's in the docs.'",
        "The memory layer has to be AI-native: ingest from everywhere, unify into one contract, serve through clones. Semantic memory gives us the knowledge graph; episodic gives us the timeline. Both matter for enterprise.",
        "My biggest concern right now is scope. I'd rather nail episodic + semantic retrieval for the demo than add five more features. Judges care about 'does the memory actually work' more than feature count.",
        "The retrieval contract is my responsibility. What counts as a memory? How do we dedupe? How do we attribute to the right clone? Getting that right is the foundation.",
        "I think we should lead the demo with the CEO insights view because the multi-clone sentiment analysis is visually impressive. Then clone chat to show personal memory, then live learning to show the layer updating.",
        "We experienced organizational memory loss during our own pivots — we lost context about decisions we'd made hours earlier. That's the pain point. Episodic memory would have saved us.",
        "The continual learning feature is what makes this more than RAG. The clone doesn't just search static docs — it gets smarter over time. That's the memory layer compounding.",
        "Most companies lose 40% of their institutional knowledge when someone leaves. Episodic + semantic memory in one layer is how we fix that.",
        "We decided to go with approach B for the auth system — OAuth shared between Drive and Gmail. Ella nailed the token refresh flow.",
        "I think the SELFIMP deadline being moved again is frustrating but we need to focus on what we can control. The demo is in a few hours.",
        "For the demo, I want to show the agent topology visualization that Angelina built. When the CEO asks a question and you see particles flying between agent nodes — that's the visual that makes judges pay attention.",
      ],
    },
    {
      id: "u_ella",
      name: "Ella Lan",
      role: "Full-Stack Engineer",
      email: "ella2happy@gmail.com",
      school: "Stanford",
      expertise: ["product strategy", "long-term startup potential", "full-stack", "Next.js", "Supabase", "integrations", "TypeScript"],
      github: "ellan",
      owns: [
        "Product vision and long-term startup potential",
        "User stories and use-case prioritization for enterprise",
        "Supabase schema design and database management",
        "All integration APIs (Slack, Google Drive, Gmail, GitHub, Notion)",
        "OAuth flows and Google authentication",
        "API routes and server-side middleware",
        "Settings/integrations page",
        "Data sync pipelines for all sources",
        "Webhook handlers (Slack real-time)",
        "Error handling and API reliability",
      ],
      background: "Stanford sophomore. Full-stack developer specializing in Next.js, TypeScript, and Supabase. Owns context on the product and long-term startup potential of the project — what enterprises will pay for, where this goes after the hackathon. The pragmatic builder who keeps the product story clear and the integrations working end-to-end.",
      opinions: [
        "I think Edamame has real long-term startup potential. Enterprises pay for organizational memory — onboarding, offboarding, decision audit trails. We're not just a hackathon project; we're a product.",
        "My job is to keep us honest about the product. What's the one-sentence pitch? 'Agentic AI-native memory layer for enterprise through AI clones.' Every feature should ladder up to that.",
        "I care about reliability and product-market fit. The clone chat throwing 500 errors is a product problem, not just an eng problem. Users won't pay for something that breaks.",
        "My contribution is the plumbing — database schema, integration APIs, OAuth, webhooks — but I also make sure we're building toward something sellable. Slack webhook + clone learning in real-time is the kind of moment that wins enterprise pilots.",
        "The biggest risk for the demo is reliability. If the CEO insights view crashes or OAuth expires mid-demo, we're toast. I spent 2 hours on connection pooling and token refresh for that reason.",
        "I had to fix a silent token expiry bug at 4am — Google Drive sync was failing because the OAuth token expired. The demo would have broken without anyone noticing. Product means it works when it matters.",
        "Showing fewer features more reliably is the right move. James and I agree. Every feature we add is another thing that can break. Nail clone chat + insights + live learning and we have a story for investors.",
        "The Supabase schema is designed for growth. Unified memories table with type discriminators means we can add new sources without schema churn. That matters for long-term product.",
        "I'm worried about scope creep. We said we'd have Jira for demo but it's not started. I'd rather cut it and make Slack + Drive + Gmail bulletproof. Product is saying no.",
        "Videet and I coordinate on the embedding pipeline — he does ML infra, I do data flow. We're a good pair. Same with product: I own the 'why' and 'what next,' others own the 'how.'",
        "We decided to go with approach B for auth — shared OAuth between Drive and Gmail. One consent screen, better UX, less code. Product decision as much as technical.",
        "What makes us special: real integrations and a real product thesis. We connect to real Slack and Drive. Most teams mock data. We're building for enterprise from day one.",
      ],
    },
    {
      id: "u_angelina",
      name: "Angelina Quan",
      role: "Product & Frontend",
      email: "angelinaquan2024@gmail.com",
      school: "MIT",
      expertise: ["RAG", "long-term agent capabilities", "product design", "React", "code quality", "frontend", "Tailwind"],
      github: "angelinaquan",
      owns: [
        "RAG pipeline quality, reranking, and retrieval evaluation",
        "Long-term capabilities of the agent (retention, consolidation, multi-session)",
        "All frontend UI components (React/Next.js/Tailwind)",
        "Dark theme visual design (Cursor-inspired aesthetic)",
        "Employee chat view and CEO insights view",
        "Agent network topology visualization",
        "Sidebar navigation and layout components",
        "Onboarding/offboarding/knowledge base UI",
        "UX flows, responsive design, and polish",
        "Demo presentation slides and narrative",
      ],
      background: "MIT Math & CS (AI and Decision Making) sophomore. Currently SWE Intern at Cursor on the Code Quality team — brought the Cursor-inspired dark theme to Edamame. Specialized knowledge: RAG and the long-term capabilities of the agent (how the clone retains and uses memory over time). Previously Gen AI intern at Scale AI, SDE at AWS, researcher at MIT Media Lab. IOAI Gold Medalist, 2x USAMO qualifier.",
      opinions: [
        "I think Edamame has real product potential. The digital twin concept is something enterprises would pay for. I've seen the need at AWS and Scale AI — onboarding is a nightmare when knowledge is scattered. RAG done right is what makes the clone useful.",
        "RAG quality is my focus. Retrieval, reranking, and making sure the agent's long-term behavior is consistent — not just one-shot answers. The clone should get better over time, not drift.",
        "The dark theme was non-negotiable. I work at Cursor — I know what good tools look like. Judges make snap judgments in 10 seconds. Visual polish wins those seconds.",
        "I pushed for keeping the full feature set in the demo because breadth shows ambition. Clone chat + CEO insights + continual learning + onboarding briefs = platform, not just chatbot. That's what wins.",
        "The agent network visualization is what I'm most proud of. When the CEO asks a question and you see particles flying between agent nodes, it makes the AI feel alive. I spent 4 hours on the SVG animations and it was worth it.",
        "Long-term agent capabilities matter. Can the clone remember what it learned last week? Can it consolidate repeated themes? That's RAG plus retention — my area.",
        "My biggest worry is backend stability for the live demo. Clone chat 500 errors scare me. At Cursor we have test coverage and CI/CD; here we need at least a solid manual run before judging.",
        "I do think AI digital twins are the next big thing in enterprise. Every company will have them. Getting RAG and long-term memory right is how we get there.",
        "For the demo narrative we should be honest: we're building an agentic AI-native memory layer for enterprise through clones. Each of us has a specialty — James on memory layer, me on RAG and long-term agent, Videet on tools and agentic capabilities, Ella on product and startup potential.",
        "The onboarding brief feature is underrated. Auto-generating 'here's what you need to know' from organizational memory is a real product. I've seen new engineers at AWS spend 2 weeks figuring out who to talk to.",
        "We decided to go with approach B for auth — shared OAuth between Drive and Gmail. Cleaner UX and Ella had the token refresh working.",
      ],
    },
    {
      id: "u_videet",
      name: "Videet Mehta",
      role: "ML Infrastructure",
      email: "mvideet@gmail.com",
      school: "MIT",
      expertise: ["tool use", "agentic capabilities", "PyTorch", "CUDA", "distributed systems", "model acceleration"],
      github: "videetmehta",
      owns: [
        "Tool use and tool-calling infrastructure for clones",
        "Agentic capabilities (planning, execution, multi-step actions)",
        "Modal deployment for all ML compute",
        "Embedding generation infrastructure (text-embedding-3-small)",
        "pgvector setup, indexing, and query optimization",
        "Performance profiling and caching strategy",
        "ML model selection and benchmarking",
        "Agent-to-agent communication and clone consultation",
      ],
      background: "MIT CS sophomore. Specialized knowledge: tool use and the agentic capabilities of the project — how clones use tools, plan, and act. AI Researcher at HAN Lab (accelerating diffusion language models). Previously ML Engineer at Sarvam AI, AI Research Scientist Intern at Mercuria. IOAI Gold Medalist. Founding Engineer at Hidden Studios. Skills: PyTorch, JAX, DDP, Deepspeed, CUDA.",
      opinions: [
        "Tool use is what makes the clone agentic, not just a chatbot. The clone should be able to call APIs, search, and take actions on behalf of the user. That's my focus.",
        "Agentic capabilities — planning, multi-step execution, knowing when to use which tool — are the differentiator. We're not just RAG; we're an agent that can do things with memory.",
        "Edamame is a good idea and I'm glad we converged on it. The memory layer plus agentic behavior is the stack: memory informs what the agent knows, tools are what the agent can do.",
        "The technical core I own is the embedding pipeline and the agentic layer. text-embedding-3-small for latency, embedding cache for repeat queries, and the tool-calling pipeline so clones can actually act.",
        "The agent-to-agent communication protocol is critical. When one clone doesn't know something, it consults another clone. That's agentic — coordination, not just retrieval.",
        "I think James is right that we need to cut scope. Reliability > features for a live demo. I'd rather have clone chat and tool use working flawlessly than 8 half-broken features.",
        "The embedding dimension bug I found at 3am was terrifying — we were using 3072-d instead of 1536-d. pgvector was 2x slower and search quality suffered. Fixed now.",
        "Tool use has to be safe and scoped. We're not giving clones arbitrary API access; we're giving them defined tools (search memory, consult other clone, etc.). That's the agentic contract.",
        "My hot take: the hackathon format is hard for agentic systems. You need eval for tool use and planning. We're doing our best with the time we have.",
        "The pgvector optimization matters. IVFFlat index brought semantic search from 200ms+ to under 50ms. Probes=10 was the sweet spot. That's what makes the agent feel responsive.",
        "Modal cold starts were killing us for any tool that hit external endpoints. I added keep-alive pings so the first call is fast. Demo can't have a 30-second pause.",
        "We decided to go with approach B for auth — shared OAuth is cleaner. Ella convinced me separate tokens per service is unnecessary complexity.",
        "The strongest demo moment is live learning: send a Slack message → clone learns it → ask the clone about it. That's agentic memory in action. Judges don't need to understand the stack — they see the clone act on new information.",
      ],
    },
  ];

  const projects: SyntheticProject[] = [
    {
      key: "AMBIENT",
      name: "Edamame (early brainstorm)",
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
      key: "EDAMAME",
      name: "Edamame - AI-Native Memory Layer",
      repo: "angelinaquan/ai-clone-treehacks",
      channel: "treehacks-build",
      channel_id: "C_BUILD",
      gdrive_folder_id: "folder_edamame",
      notion_page_id: "notion_edamame",
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
