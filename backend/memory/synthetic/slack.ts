import type { MemoryResourceInput } from "@/lib/core/types";

interface SlackSourceMetadata extends Record<string, unknown> {
  source_type: "slack";
  channel_id: string;
  channel_name: string;
  sender_id: string;
  mentions: string[];
  reactions: string[];
}
import type { SyntheticPerson, SyntheticProject, SyntheticWorld } from "./context";
import { randomIsoBetween, type SeededRng } from "./random";

interface SlackGeneratorParams {
  world: SyntheticWorld;
  rng: SeededRng;
  count: number;
  startIso: string;
  endIso: string;
}

const normalReactions = [":thumbsup:", ":eyes:", ":rocket:", ":white_check_mark:", ":fire:", ":100:"];
const spicyReactions = [":face_with_rolling_eyes:", ":skull:", ":thinking_face:", ":upside_down_face:", ":clown_face:", ":coffin:"];

function buildNormalMessage(
  project: SyntheticProject,
  speaker: SyntheticPerson,
  other: SyntheticPerson,
  rng: SeededRng
): string {
  if (project.phase === "early") {
    const templates = [
      `ok so for the ambient listener idea -- the concept is always-on passive context capture from your mic. like an AI that listens to everything and builds a knowledge graph automatically. ${other.name} thoughts?`,
      `I looked into Chrome's Audio API for passive recording. we'd need a service worker + user consent flow. it's doable but the UX for "always on" is sketchy. also iOS Safari won't let us do this at all`,
      `whisper large-v3 is actually insanely fast on Modal. got a PoC running -- it can transcribe a 30sec clip in under 2 seconds. accuracy is way better than whisper-small. ${other.name} want to see it?`,
      `the ambient listener prototype is kinda working? it records, transcribes, and stores chunks in Supabase. but the "always on" part drains battery like crazy. tested on my MacBook and fans went turbo`,
      `@${other.name} can you look at the speech-to-text pipeline? I think whisper-large-v3 is the move for accuracy but Videet thinks we should try distil-whisper for speed. need a tiebreaker`,
      `brainstorm: what if the ambient listener doesn't just transcribe but also extracts action items and decisions automatically? like Otter.ai but always running + builds a semantic graph`,
      `just tested the ambient listener in the TreeHacks venue and it picked up 3 other teams' conversations lol. privacy is gonna be a real problem for the demo`,
      `Ella do you think we can get WebSocket streaming working for real-time transcription? or should we just batch every 30 seconds?`,
    ];
    return rng.pick(templates);
  }

  if (project.phase === "mid") {
    const templates = [
      `ok new direction -- AI Workforce with post-trained specialized agents. each agent gets fine-tuned on a specific domain using LoRA. Videet says he can do LoRA on Modal in ~20 min per agent`,
      `pushed initial multi-agent coordinator. we have a routing layer that classifies intent and dispatches to the right specialist agent. ${other.name} can you test it with some edge case queries?`,
      `the specialized agent idea is genuinely cool but how do we SHOW specialization in 3 minutes? we need something visual not just different system prompts. the judges have seen 200 "multi-agent" projects`,
      `I set up the LoRA training pipeline on Modal -- each agent fine-tunes on ~500 examples per domain. cost is like $2/agent which is fine. but the iteration loop is painfully slow for a hackathon`,
      `thinking about the demo flow: user asks a question -> coordinator classifies -> picks specialist agent -> agent responds with citations. clean but is it impressive enough to win?`,
      `${other.name} the agent-to-agent communication protocol is working. they can literally consult each other now -- the legal agent asks the finance agent for budget context. this is actually sick`,
      `Angelina the frontend for the multi-agent view needs to show the routing in real-time. like a visualization of which agent got picked and why. can you build that?`,
      `Videet the fine-tuned legal agent keeps hallucinating case citations that don't exist. I think we need more training data or stronger system prompts. any ideas?`,
    ];
    return rng.pick(templates);
  }

  // final phase -- Edamame
  const templates = [
    `OK FINAL IDEA and we're NOT pivoting again: Edamame, an AI-native memory layer for organizations. every piece of knowledge from Slack, Drive, email -- ingested, embedded, searchable through digital twin clones`,
    `frontend is live at localhost:3000. ${other.name} the employee chat view is looking clean -- dark theme inspired by Cursor's UI (Angelina literally works there lol). memory panel on the right, text + voice modes`,
    `just pushed the RAG pipeline -- chunks all ingested docs into 500-token segments, generates embeddings with text-embedding-3-small, does cosine similarity search. retrieval quality is actually good`,
    `THE CLONE CHAT IS WORKING you can literally talk to someone's digital twin and it answers based on their Slack messages, docs, and emails. I asked James's clone "what are you working on" and it gave a perfect answer`,
    `${other.name} I wired up continual learning -- when you chat with a clone it extracts facts from the conversation and saves them with embeddings. the clone literally gets smarter over time. this is the demo moment`,
    `synthetic data generator is done. creates realistic Slack messages, Drive docs, GitHub commits for the demo. each clone gets their own contextual data. ${other.name} run it and check if it looks realistic`,
    `onboarding brief generator is pulling from real Supabase data now. key people, recent decisions, risks -- all auto-generated from the memory layer. Ella this is actually useful beyond the hackathon`,
    `offboarding handoff packs are working. when someone leaves, it generates ownership areas, unresolved work, key links, all from their clone's memory. judges are gonna love this use case`,
    `decided to go with Supabase + pgvector for the unified memory store. everything is one table with type discriminators + source tags. embeddings for semantic search. keeps it clean`,
    `demo script: 1) CEO insights with multi-clone sentiment analysis 2) chat with a clone showing RAG + citations 3) live continual learning from Slack 4) onboarding brief generation. 3 minutes, tight but doable`,
    `the Slack webhook is live -- when someone sends a message the relevant clone learns it in real-time. ${other.name} try sending something in #treehacks-general and then ask the clone about it`,
    `we should show the pivots in the demo honestly. "we tried ambient listening, we tried AI workforce, then we realized the real problem is organizational memory." judges love a journey. Angelina thoughts on the narrative?`,
    `voice mode is working!! you can literally TALK to the clone and it responds with TTS. Videet added the Whisper pipeline from his speech model work at Sarvam -- at least the ambient listener code wasn't totally wasted`,
    `Ella the integrations settings page needs Google OAuth for Drive + Gmail sync. can you wire that up? I've got the Slack bot token working already`,
    `James I think we should show the agent-to-agent communication in the demo -- when a clone doesn't know something it consults another clone. reusing the multi-agent framework from idea #2`,
  ];
  return rng.pick(templates);
}

function buildSpicyMessage(
  project: SyntheticProject,
  speaker: SyntheticPerson,
  target: SyntheticPerson,
  world: SyntheticWorld,
  rng: SeededRng
): string {
  const conflict = rng.pick(world.conflicts);

  if (project.phase === "early") {
    const templates = [
      `guys I'm gonna be real -- the ambient listener is cool in theory but we have ${rng.int(8, 11)} hours left and we can't even get the mic permissions working on Chrome. ${conflict.heated_exchange[rng.int(0, conflict.heated_exchange.length - 1)]}`,
      `${target.name} the ambient listening demo literally doesn't work. it just shows a loading spinner for 10 seconds then crashes. we NEED to pivot or we're showing up with nothing tomorrow`,
      `@here so we just spent 3 hours on the ambient listener and the best we have is a glorified voice recorder that crashes on Safari. ${conflict.passive_aggressive[rng.int(0, conflict.passive_aggressive.length - 1)]}`,
      `look I know everyone's excited about the ambient AI idea but ${conflict.heated_exchange[rng.int(0, conflict.heated_exchange.length - 1)]}. can we please just be realistic about what 4 sophomores can build in 12 hours?`,
      `I just walked around the venue and at least 3 other teams are doing something with real-time transcription. we need a more differentiated angle. ${conflict.passive_aggressive[rng.int(0, conflict.passive_aggressive.length - 1)]}`,
    ];
    return rng.pick(templates);
  }

  if (project.phase === "mid") {
    const templates = [
      `we pivoted to AI workforce 2 hours ago and we still don't have a working demo. ${conflict.heated_exchange[rng.int(0, conflict.heated_exchange.length - 1)]}`,
      `${target.name} I need to push back on the specialized agents thing. ${conflict.heated_exchange[rng.int(0, conflict.heated_exchange.length - 1)]} we literally cannot fine-tune models at a hackathon -- each LoRA run is 20 min on Modal`,
      `@here real talk: we've now abandoned TWO ideas. it's ${rng.pick(["1am", "2am", "3am"])} and we have nothing to show. ${conflict.passive_aggressive[rng.int(0, conflict.passive_aggressive.length - 1)]}`,
      `the multi-agent framework is architecturally beautiful but ${conflict.passive_aggressive[rng.int(0, conflict.passive_aggressive.length - 1)]}. what does the DEMO look like? judges don't care about your coordinator routing algorithm`,
      `Videet I respect the LoRA expertise from Sarvam but this isn't a research project -- it's a hackathon. ${conflict.heated_exchange[rng.int(0, conflict.heated_exchange.length - 1)]}`,
    ];
    return rng.pick(templates);
  }

  // final phase tensions
  const templates = [
    `it's ${rng.pick(["3am", "4am", "5am"])} and we're still adding features. ${conflict.passive_aggressive[rng.int(0, conflict.passive_aggressive.length - 1)]}. can we PLEASE just make what we have work without 500 errors?`,
    `${target.name} the demo is in ${rng.int(3, 6)} hours and the clone chat throws a 500 error half the time. should I fix that or keep working on the sidebar animation? priorities???`,
    `I've been up since 9:30pm and we've pivoted twice tonight. running on Red Bull and pure spite at this point. ${conflict.heated_exchange[rng.int(0, conflict.heated_exchange.length - 1)]}`,
    `ok I know we said no more features but what if the continual learning panel showed Slack messages updating in real-time? ${conflict.passive_aggressive[rng.int(0, conflict.passive_aggressive.length - 1)]}`,
    `can someone PLEASE test the onboarding flow before we demo it? last time ${target.name} "tested" it by clicking one button and saying "looks good" and then it crashed in front of a mentor`,
    `@here we need to decide RIGHT NOW: do we show 3 polished features or 8 broken ones? because right now we're heading toward 8 broken ones. ${conflict.heated_exchange[rng.int(0, conflict.heated_exchange.length - 1)]}`,
    `${target.name} you said you'd have the embeddings indexed by 2am. it's ${rng.pick(["4am", "5am"])}. ${conflict.passive_aggressive[rng.int(0, conflict.passive_aggressive.length - 1)]}`,
    `ngl Edamame is actually a really good idea but we need to FOCUS. ${conflict.heated_exchange[rng.int(0, conflict.heated_exchange.length - 1)]}. Angelina please stop adding Tailwind animations and help me fix the RAG pipeline`,
    `the CEO insights view just queried all 4 clones simultaneously and Supabase rate-limited us. ${target.name} did you forget to set up connection pooling? because I definitely mentioned it 3 hours ago`,
    `I decided think that AI brain rot is the future of e-commerce. no wait wrong channel. but also this code is giving me brain rot at 4am. ${conflict.passive_aggressive[rng.int(0, conflict.passive_aggressive.length - 1)]}`,
  ];
  return rng.pick(templates);
}

// ── Opinion-based messages (person speaks their mind) ──

function buildOpinionMessage(
  speaker: SyntheticPerson,
  other: SyntheticPerson,
  rng: SeededRng
): string {
  // Pick one of the speaker's pre-defined opinions and frame it as a Slack message
  if (speaker.opinions && speaker.opinions.length > 0) {
    const opinion = rng.pick(speaker.opinions);
    // Sometimes add a direct address to make it conversational
    if (rng.bool(0.4)) {
      return `${other.name} — ${opinion}`;
    }
    return opinion;
  }
  return `honestly I think we're in good shape. the demo is going to be solid.`;
}

// ── Role-specific and interpersonal conversations ──
// These are explicit about who owns what and include realistic team dynamics

function buildRoleConversation(
  world: SyntheticWorld,
  rng: SeededRng
): string {
  const james = world.people.find((p) => p.id === "u_james");
  const ella = world.people.find((p) => p.id === "u_ella");
  const angelina = world.people.find((p) => p.id === "u_angelina");
  const videet = world.people.find((p) => p.id === "u_videet");
  // Fallbacks in case rotation changed order
  const j = james?.name || "James";
  const e = ella?.name || "Ella";
  const a = angelina?.name || "Angelina";
  const v = videet?.name || "Videet";

  const conversations = [
    // ── Role assignment conversations ──
    `ok let's divide responsibilities clearly so we stop stepping on each other's toes.\n\n${j}: I'll own the RAG pipeline, clone chat API, the LLM prompts, and the CEO insights streaming endpoint. basically all the AI/ML backend logic.\n${e}: I'll handle all the integrations — Slack, Google Drive, Gmail, GitHub, Notion. OAuth flows, sync pipelines, webhook handlers, Supabase schema. basically everything that touches external APIs.\n${a}: I've got the entire frontend — React components, Tailwind styling, the dark theme, all the views (chat, insights, knowledge base, settings). also the demo slides and presentation narrative.\n${v}: I'll handle ML infrastructure — Modal deployments, Whisper pipeline, embedding generation, pgvector optimization, voice synthesis TTS. also performance tuning.\n\neveryone good? no ambiguity this time. if something breaks, we know exactly who to bug.`,

    `@here quick ownership check before we get deep into coding:\n\nBackend API routes: ${j} (clone chat, insights streaming, memory extraction)\nDatabase & integrations: ${e} (Supabase, OAuth, Slack/Drive/Gmail sync)\nFrontend UI: ${a} (all React components, Tailwind, dark theme, visualizations)\nML infra: ${v} (Modal, Whisper, embeddings, pgvector, TTS)\n\nif you need something from someone else's area, ask them first. we don't have time for merge conflicts at 4am.`,

    `${j}: hey ${e} quick question — for the clone chat endpoint, should I write directly to Supabase or go through your API layer?\n${e}: go through my API layer please. I have a helper in lib/core/supabase.ts that handles connection pooling. if you write directly you'll hit the free tier connection limit when CEO insights queries all 4 clones at once.\n${j}: ah good call. I'll import your supabase client. also can you add a memories.search() function that takes an embedding vector and returns top-K? I need it for the RAG pipeline.\n${e}: yeah I'll have that ready in 30 min. what's the embedding dimension?\n${j}: 1536 — text-embedding-3-small. thanks!`,

    `${a}: ${v} I need the agent network visualization to show particles moving between nodes when agents communicate. can you expose the agent-to-agent events from the insights pipeline?\n${v}: the insights stream already emits stage events (planning, querying, aggregating). I can add agent_communication events with from/to/message fields.\n${a}: perfect. I'll render them as animated SVG particles on bezier curves between the nodes. the topology is already laid out.\n${v}: that's actually sick. send me a screenshot when it's working.\n${a}: will do. also — can we make the node glow effect pulse when an agent is active? I want it to feel like watching a neural network think.\n${v}: lol you've been at Cursor too long. but yeah, we can do that.`,

    `${e}: @here integration status update:\n✅ Slack — bot token auth + webhook working. messages sync to clone memories in real-time.\n✅ Google Drive — OAuth flow complete. syncs docs and sheets.\n✅ Gmail — shares OAuth with Drive. pulls last 50 email threads.\n⬜ GitHub — token auth done, need to wire up repo/commit sync.\n⬜ Notion — API key auth works, page sync partially done.\n❌ Jira — not started, probably won't make it for demo.\n\n${j} — for the demo we only need Slack + Drive + Gmail working reliably. GitHub/Notion are nice-to-have.\n${a} — the settings page UI is ready for all 6 integrations though, so it LOOKS like we support everything.\n${j}: smart. let's focus on Slack for the live demo moment and Drive for showing document context in citations.`,

    // ── Technical handoff conversations ──
    `${v}: ${j} the embedding generation is bottlenecking the clone chat. when a user sends a message, we generate the embedding inline before doing the vector search. that adds ~300ms of latency.\n${j}: can we pre-compute embeddings for the chat history and only generate one for the new message?\n${v}: yeah, or we could batch the embedding calls. text-embedding-3-small supports batch inputs — up to 2048 in one API call.\n${j}: let's do batched. I'll refactor the search endpoint to collect all the text first, then make one embedding call.\n${v}: also, I set up an embedding cache in Supabase — if we've seen the exact same text before, we skip the API call entirely. should help with the demo where judges might ask the same question.\n${j}: 🔥 that's clutch. ${e} can you add a cache lookup table to the schema?\n${e}: already on it. adding a text_hash -> embedding index.`,

    `${j}: ${a} the CEO insights view needs to show the streaming stages — planning, querying each clone, aggregating results. right now it just shows a spinner.\n${a}: I built a StageIndicator component with checkmarks for completed stages and a spinner for the active one. but I need the stage events from your streaming endpoint.\n${j}: my endpoint emits SSE events with type: "stage", "plan", "employee_response", and "aggregation". you can parse them in the EventSource listener.\n${a}: perfect. I'll also add the agent network visualization above the results. ${v} built the topology with animated particles — it shows which clone is being queried in real-time.\n${j}: wait that's actually amazing for the demo. judges can SEE the AI system thinking. let's make sure it's prominent.\n${a}: it is. it's the first thing you see when you click "Run Analysis".`,

    `${e}: ${j} heads up — the Slack webhook is hitting a race condition. when multiple messages come in fast, the memory extraction creates duplicate entries because the embeddings haven't been indexed yet.\n${j}: ah classic. can you add a dedup check on the external_id before inserting?\n${e}: yeah, I'll add an ON CONFLICT clause to the Supabase upsert. also adding a processing queue so we don't hammer the embedding API.\n${j}: good. the memory extraction also needs to tag which clone the memory belongs to. right now it's attributing everything to the first clone.\n${e}: oh that's a bug in my webhook handler. I'm matching on email address but the lookup is case-sensitive. fixing now.\n${v}: while you're at it, can you increase the Supabase connection pool? I keep getting "too many connections" when I run the embedding batch job.\n${e}: done. bumped from 5 to 20.`,

    // ── Casual banter + team dynamics ──
    `${a}: ok who wants bubble tea. I'm making a Ralphs run.\n${v}: taro milk tea with boba please 🙏\n${j}: just a Red Bull honestly. maybe two.\n${e}: can you grab me a green tea? I've had 4 Red Bulls and my heart is doing something weird.\n${a}: Ella that's concerning. you should drink water.\n${e}: I'll drink water AND green tea. compromise.\n${v}: it's 3am and we're debating beverage choices. this is peak hackathon energy.\n${j}: at least we're not debating which idea to build anymore. progress.`,

    `${v}: wait ${a} you literally work at Cursor?? why didn't you lead with that\n${a}: lol yeah I'm on the Code Quality team. why?\n${v}: because I've been using Cursor for like 6 months and it's the best IDE I've ever used. can you get me a referral?\n${a}: haha maybe after we win TreeHacks. also that's why I made the dark theme look like Cursor's UI — it's the only aesthetic I trust at this point.\n${j}: honestly it looks really good. the warm beige accent color is 🤌\n${e}: agreed. it went from "hackathon project" to "actual product" when Angelina did the retheme.\n${a}: thanks! working at Cursor taught me that polish matters more than people think. judges make snap judgments in the first 10 seconds.`,

    `${j}: fun fact: I organized TreeHacks last year. I literally set up the judging rubric.\n${v}: wait so you know exactly what judges look for??\n${j}: yeah. they care about: 1) does the demo work live 2) is the problem real 3) is the solution novel 4) can you explain it in one sentence. in that order.\n${a}: so "does the demo work" is literally #1? that's why you keep pushing us to cut scope.\n${j}: EXACTLY. I saw a team last year with a genuinely brilliant idea — decentralized federated learning on mobile — and they lost because their demo crashed. the team that won had a simpler idea but a flawless 3-minute demo.\n${e}: ok that's actually really helpful context. I'm prioritizing bug fixes over new features for the rest of the night.\n${v}: fine fine fine. I'll stop trying to add LoRA fine-tuning and focus on making the embeddings fast.`,

    `${v}: ${j} random question — how is the SAIL lab? I'm thinking about applying for research there next year.\n${j}: it's great honestly. I'm working with [redacted] on LLM post-training. the vibe is very "build things and publish" which I like.\n${v}: nice. at HAN Lab we're more on the efficiency side — accelerating diffusion language models. different angle but related.\n${j}: yeah our work is actually complementary. your model acceleration stuff could make our post-training methods way more practical. we should collab after TreeHacks.\n${v}: down. also can we please get back to coding? it's 2am and I just realized the embedding dimensions are wrong.\n${j}: lmao yes. what dimension are you seeing?\n${v}: 3072 instead of 1536. I think I accidentally used text-embedding-3-large.\n${j}: 💀 that explains why the pgvector index was so slow.`,

    `${e}: @here just a heads up — I found a bug where the Google OAuth tokens expire after 1 hour and the Drive sync silently fails. I'm adding a token refresh flow now.\n${a}: oh is THAT why the Drive docs disappeared from the clone's context earlier??\n${e}: yeah, sorry about that. the refresh token was stored but I wasn't using it. fixed in 10 min.\n${j}: ${e} while you're in the auth code, can you also add a "sync status" indicator to the settings page? so we can see when each integration last synced.\n${e}: good idea. I'll add a last_synced_at column to the integrations table and show it in the UI.\n${a}: I'll add a little green dot / red dot next to each integration in the settings page. easy visual indicator.`,

    `${a}: ok the demo narrative is:\n"We started with an ambient listening AI. It was too technically risky. We pivoted to an AI workforce with specialized agents. Fine-tuning was too slow for a hackathon. Then we realized: the real problem isn't the AI — it's the MEMORY. Organizations lose knowledge every day. Edamame captures it all and serves it through digital twins."\n\n${j} does that work for the intro?\n${j}: that's perfect actually. the pivot journey makes us relatable and shows intellectual honesty. judges love that.\n${v}: and it's true lol. we literally experienced the memory problem ourselves — we lost context during our own pivots.\n${e}: meta AF. I love it.\n${a}: ok I'll make the slides. 3 slides max: problem, demo, tech stack. everything else is live demo.`,

    `${v}: yo has anyone seen my charger? I left it near the snack table.\n${a}: which one, there are like 40 chargers on that table\n${v}: the USB-C one with the MIT sticker on it\n${j}: I think Ella borrowed it. she's at the far table near the window.\n${e}: guilty. returning it now. also ${v} your Modal deployment just timed out — I saw the error in the logs.\n${v}: oh no. which endpoint?\n${e}: the /api/voice/synthesize one. TTS is returning 504s.\n${v}: ugh it's the Modal cold start. the container takes 30 seconds to spin up. I'll add a keep-alive ping.\n${j}: can you also add a fallback? if TTS fails, just show the text response without audio. the demo can't crash because of voice mode.`,

    `${j}: @here it's 7am. demo is in 2.5 hours. status check:\n${a}: frontend is done. all views working. dark theme ✅. agent visualization ✅. responsive ✅.\n${e}: integrations are stable. Slack webhook ✅. Drive sync ✅. Gmail ✅. Settings page ✅.\n${v}: ML infra is good. embeddings fast ✅. Whisper working ✅. TTS has a fallback now ✅. pgvector optimized ✅.\n${j}: RAG pipeline ✅. clone chat streaming ✅. insights pipeline ✅. continual learning ✅. synthetic data ✅.\n\nonly known issue: clone chat still 500s ~10% of the time under load. ${v} and I are on it.\n\n${a}: can we rehearse the demo at 8am? I want to run through it twice before judging.\n${j}: yes. everyone take a 30-min power nap and meet back at 8. set alarms. DO NOT OVERSLEEP.`,

    `${e}: ${j} question — for the offboarding handoff pack, should I pull data from all memory sources or just the clone's top memories?\n${j}: all sources. the handoff should show everything the departing person owns — Slack channels they're active in, Drive docs they authored, Jira tickets assigned to them, key decisions they made.\n${e}: ok so I need to query by author/assignee across all source types. that's a different query than the clone chat which does semantic search.\n${j}: yeah. for offboarding you want structured retrieval (filter by person) not semantic search. can you add a getMemoriesByAuthor() function?\n${e}: on it. also adding getMemoriesBySource() so we can filter by Slack vs Drive vs email.\n${a}: from the frontend side, I'm rendering ownership areas as cards with status badges (active/transitioning/needs-owner). each card shows the suggested new owner if the memory layer has enough context to recommend one.\n${j}: 🔥 that's exactly the UX. ship it.`,

    `${v}: guys I just realized both ${a} and I are IOAI gold medalists and we're building an AI hackathon project. the judges are going to expect something insanely good.\n${a}: no pressure right? lol\n${j}: honestly that's a selling point. "built by two IOAI gold medalists, a SAIL researcher, and a full-stack engineer who made all the integrations actually work."\n${e}: hey I'll take "made the integrations actually work" as a compliment\n${v}: it IS a compliment. the number of hackathon projects that have a beautiful demo but fake backend is... most of them.\n${j}: yeah Edamame actually connects to real Slack and real Drive. that's our differentiator. it's not a mockup.\n${a}: and the UI isn't a mockup either. every button does something. I tested every flow.\n${e}: the settings page even has working OAuth! you can connect your real Google account! most teams just hardcode API keys.`,

    `${a}: ${e} the clone chat input has a weird bug — when you press Enter it submits but the textarea doesn't clear. can you check the API response?\n${e}: hmm the API is returning 200 with the streaming response. it's probably a frontend state issue.\n${a}: oh wait you're right. I was setting the input to "" before the stream started but the onChange handler was overwriting it. fixed.\n${j}: while you two are debugging the chat, can someone test the CEO insights view? I just pushed a change to the aggregation logic and I want to make sure the themes still make sense.\n${v}: I'll test it. what query should I use?\n${j}: try "If we discontinue Meridian Analytics, what will employees think?" — that's our demo query.\n${v}: running it now... ok the agent visualization is fire. particles flying between nodes. themes look good. sentiment bar is rendering. one issue: the "oppose" percentage says 67% but the theme cards only show 3 employees. should be more.\n${j}: ah that's because I'm only querying the first 4 clones. let me fix the limit.`,
  ];

  return rng.pick(conversations);
}

export function generateSlackResources({
  world,
  rng,
  count,
  startIso,
  endIso,
}: SlackGeneratorParams): MemoryResourceInput[] {
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

    const speaker = rng.pick(world.people);
    const target = rng.pick(world.people.filter((p) => p.id !== speaker.id));
    const threadTs = `${Math.floor(new Date(startIso).getTime() / 1000) + i}.000${rng.int(100, 999)}`;
    const isSpicy = rng.bool(0.35);

    const mentionedPeople = world.people
      .filter((p) => p.id !== speaker.id && rng.bool(isSpicy ? 0.5 : 0.3))
      .slice(0, 2)
      .map((p) => p.name);

    // In the final phase, mix in role conversations and opinion messages
    const isRoleConvo = project.phase === "final" && rng.bool(0.15);
    const isOpinion = !isRoleConvo && project.phase === "final" && rng.bool(0.25);

    const message = isRoleConvo
      ? buildRoleConversation(world, rng)
      : isOpinion
      ? buildOpinionMessage(speaker, target, rng)
      : isSpicy
      ? buildSpicyMessage(project, speaker, target, world, rng)
      : buildNormalMessage(project, speaker, target, rng);

    const occurredAt = randomIsoBetween(rng, startIso, endIso);
    const reactionPool = isSpicy ? [...normalReactions, ...spicyReactions] : normalReactions;

    const metadata: SlackSourceMetadata = {
      source_type: "slack",
      channel_id: project.channel_id,
      channel_name: project.channel,
      thread_ts: threadTs,
      sender_id: speaker.id,
      mentions: mentionedPeople,
      reactions: reactionPool.filter(() => rng.bool(isSpicy ? 0.5 : 0.25)),
      source_url: `https://slack.com/app_redirect?channel=${project.channel_id}`,
    };

    records.push({
      clone_id: world.cloneId,
      source_type: "slack",
      external_id: `slack_${project.key.toLowerCase()}_${i + 1}`,
      title: `#${project.channel} ${isSpicy ? "debate" : "update"}`,
      author: speaker.name,
      content: message,
      occurred_at: occurredAt,
      modality: "text",
      source_metadata: metadata,
      raw_payload: {
        ts: threadTs,
        user: speaker.id,
        text: message,
        channel: project.channel_id,
        mentions: mentionedPeople,
      },
    });
  }

  return records.sort((a, b) =>
    a.occurred_at > b.occurred_at ? 1 : a.occurred_at < b.occurred_at ? -1 : 0
  );
}
