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

const normalReactions = [":thumbsup:", ":eyes:", ":rocket:", ":white_check_mark:", ":fire:"];
const spicyReactions = [":face_with_rolling_eyes:", ":skull:", ":thinking_face:", ":upside_down_face:", ":clown_face:"];

function buildNormalMessage(
  project: SyntheticProject,
  speaker: SyntheticPerson,
  other: SyntheticPerson,
  rng: SeededRng
): string {
  // Different templates based on which project phase
  if (project.phase === "early") {
    const templates = [
      `ok so for ${project.name} -- the idea is always-on passive context capture from your mic. like an AI that just listens and builds a knowledge graph of everything discussed around you`,
      `I looked into the iOS permissions for ambient audio. we'd need background audio entitlement + user consent flow. doable but adds like 2 hours of setup`,
      `whisper API is actually insanely fast for real-time transcription. got a proof of concept running -- it can transcribe a 30sec clip in under 2 seconds`,
      `the ambient listener prototype is kinda working? it records, transcribes, and stores. but the "always on" part is hard on mobile. battery drain is real`,
      `yo ${other.name} can you look at the speech-to-text pipeline? I think we should use whisper-large-v3 for accuracy but it might be too slow for real-time`,
      `brainstorm: what if the ambient listener doesn't just transcribe but also extracts action items and decisions automatically? like a meeting copilot but always on`,
    ];
    return rng.pick(templates);
  }

  if (project.phase === "mid") {
    const templates = [
      `ok new direction -- AI Workforce with post-trained specialized agents. each agent gets fine-tuned on a specific domain. like having a team of AI experts`,
      `pushed initial multi-agent framework. we have a coordinator agent that routes queries to specialized sub-agents. ${other.name} can you test it?`,
      `the specialized agent idea is cool but how do we SHOW specialization in a 3-minute demo? we need something visual`,
      `I set up the agent training pipeline -- we can fine-tune on custom datasets per agent. but each fine-tune takes like 20min on Modal. we don't have time to iterate`,
      `thinking about the demo flow: user asks a question -> coordinator picks the right specialized agent -> agent responds with domain expertise. clean but is it impressive enough?`,
      `${other.name} the agent-to-agent communication is working. they can actually consult each other now. pretty sick`,
    ];
    return rng.pick(templates);
  }

  // final phase -- MEMLAYER / OrgPulse
  const templates = [
    `OK FINAL IDEA and we're NOT pivoting again: AI-native memory layer. every org's knowledge from Slack, Drive, email -- ingested, embedded, searchable. digital twins for every employee`,
    `frontend is up at localhost:3000. ${other.name} the CEO dashboard is looking clean. onboarding briefs + memory explorer are both working`,
    `just pushed the RAG pipeline -- chunks all ingested docs, generates embeddings, does vector search on queries. retrieval quality is actually really good`,
    `the clone chat is working!! you can literally talk to someone's digital twin and it answers based on their Slack messages, docs, and emails. this is the demo moment`,
    `${other.name} I wired up continual learning -- when you chat with a clone it extracts facts and saves them. the clone literally gets smarter over time`,
    `synthetic data generator is done. creates realistic Slack messages and Google Drive docs for the demo. each clone gets their own context`,
    `onboarding brief generator is pulling from real Supabase data now. key people, recent decisions, risks -- all from the memory layer. this is actually useful`,
    `offboarding handoff packs are working. when someone leaves, it generates a doc of everything they owned, unresolved work, key links. judges are gonna love this`,
    `decided to go with Supabase + pgvector for the memory store. unified memories table with type discriminators. embeddings for semantic search. keeps it simple`,
    `demo script: 1) show CEO insights view 2) chat with a clone 3) show continual learning from Slack 4) onboarding brief 5) offboarding handoff. 3 minutes, tight`,
    `the Slack webhook is live -- when someone texts in Slack the clone learns it in real time. ${other.name} try sending a message and then ask the clone about it`,
    `we should show the pivots in the demo honestly. "we tried ambient listening, we tried AI workforce, then we realized the real problem is organizational memory." judges love a journey`,
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
      `${target.name} the ambient listening demo literally doesn't work. it just shows a loading spinner. we need to pivot or we're showing up with nothing`,
      `@here so we just spent 3 hours on the ambient listener and the best we have is a glorified voice recorder. ${conflict.passive_aggressive[rng.int(0, conflict.passive_aggressive.length - 1)]}`,
      `look I know everyone's excited about ambient AI but ${conflict.heated_exchange[rng.int(0, conflict.heated_exchange.length - 1)]}. can we please be realistic?`,
    ];
    return rng.pick(templates);
  }

  if (project.phase === "mid") {
    const templates = [
      `we pivoted to AI workforce 2 hours ago and we still don't have a working demo. ${conflict.heated_exchange[rng.int(0, conflict.heated_exchange.length - 1)]}`,
      `${target.name} I need to push back on the specialized agents thing. ${conflict.heated_exchange[rng.int(0, conflict.heated_exchange.length - 1)]} we literally cannot fine-tune models at a hackathon`,
      `@here real talk: we've now abandoned TWO ideas. it's ${rng.pick(["1am", "2am", "3am"])} and we have nothing to show. ${conflict.passive_aggressive[rng.int(0, conflict.passive_aggressive.length - 1)]}`,
      `the multi-agent framework is cool but ${conflict.passive_aggressive[rng.int(0, conflict.passive_aggressive.length - 1)]}. what does the DEMO look like? judges don't care about architecture diagrams`,
    ];
    return rng.pick(templates);
  }

  // final phase tensions
  const templates = [
    `it's ${rng.pick(["3am", "4am", "5am"])} and we're still adding features. ${conflict.passive_aggressive[rng.int(0, conflict.passive_aggressive.length - 1)]}. can we PLEASE just make what we have work?`,
    `${target.name} the demo is in ${rng.int(3, 6)} hours and the clone chat throws a 500 error half the time. priorities???`,
    `I've been up since 9:30pm and we've pivoted twice. I'm running on Red Bull and vibes at this point. ${conflict.heated_exchange[rng.int(0, conflict.heated_exchange.length - 1)]}`,
    `ok I know we said no more features but what if the learning panel showed Slack messages in real-time? ${conflict.passive_aggressive[rng.int(0, conflict.passive_aggressive.length - 1)]}`,
    `can someone PLEASE test the onboarding flow before we demo it? last time ${target.name} "tested" it by clicking one button and saying "looks good"`,
    `@here we need to decide RIGHT NOW: do we show 3 polished features or 8 broken ones? because right now we're heading toward 8 broken ones. ${conflict.heated_exchange[rng.int(0, conflict.heated_exchange.length - 1)]}`,
    `${target.name} you said you'd have the embeddings working by 2am. it's ${rng.pick(["4am", "5am"])}. ${conflict.passive_aggressive[rng.int(0, conflict.passive_aggressive.length - 1)]}`,
    `ngl the memory layer idea is actually really good but we need to focus. ${conflict.heated_exchange[rng.int(0, conflict.heated_exchange.length - 1)]}`,
  ];
  return rng.pick(templates);
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
    // Weight project selection by phase to create a realistic timeline:
    // early messages = ambient, mid = workforce, late = memlayer
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

    const message = isSpicy
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
