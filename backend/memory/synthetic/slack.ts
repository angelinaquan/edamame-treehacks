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

const normalReactions = [":thumbsup:", ":eyes:", ":rocket:", ":white_check_mark:"];
const spicyReactions = [":face_with_rolling_eyes:", ":clown_face:", ":skull:", ":thinking_face:", ":upside_down_face:"];

function buildNormalMessage(
  project: SyntheticProject,
  speaker: SyntheticPerson,
  reviewer: SyntheticPerson,
  rng: SeededRng
): string {
  const templates = [
    `${project.key} update: we decided to lock scope this sprint. Deadline remains ${project.target_date} and I will share the risk log by Friday.`,
    `Confirmed in today's sync: ${project.name} needs security review complete before ${project.target_date}. This is critical for launch readiness.`,
    `Plan for ${project.key}: we are going to merge the API refactor tomorrow. If test coverage stays above 90% we can keep the target date.`,
    `Important: budget is still within threshold, but the integration test failure rate hit ${rng.int(8, 18)}%. We need a fix before ${project.target_date}.`,
    `I agreed with ${reviewer.name} that we will ship the onboarding copy updates this week and hold analytics polish for next sprint.`,
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
  const templates = [
    // Heated disagreements
    `@here Just so everyone is aware — the ${project.key} deadline was moved AGAIN. Third time this quarter. ${conflict.heated_exchange[rng.int(0, conflict.heated_exchange.length - 1)]}`,
    `${target.name} I need to push back on this. ${conflict.heated_exchange[rng.int(0, conflict.heated_exchange.length - 1)]} We can't keep doing this.`,
    `I'm going to be direct: the ${project.name} situation is unacceptable. ${conflict.heated_exchange[rng.int(0, conflict.heated_exchange.length - 1)]}`,

    // Passive-aggressive
    `${conflict.passive_aggressive[rng.int(0, conflict.passive_aggressive.length - 1)]} cc ${target.name}`,
    `Just following up on the ${project.key} action items from last week's meeting. ${conflict.passive_aggressive[rng.int(0, conflict.passive_aggressive.length - 1)]}`,
    `@${target.name} ${conflict.passive_aggressive[rng.int(0, conflict.passive_aggressive.length - 1)]}`,

    // Reply-chain escalation
    `Thread on ${project.key}: I've raised this ${rng.int(3, 7)} times now. ${conflict.passive_aggressive[rng.int(0, conflict.passive_aggressive.length - 1)]} Looping in ${rng.pick(world.people.filter(p => p.id !== speaker.id)).name} for visibility.`,
    `Not sure why we're still debating this. The data is clear. ${project.name} is ${rng.int(2, 5)} weeks behind and we're pretending it's fine. ${conflict.heated_exchange[rng.int(0, conflict.heated_exchange.length - 1)]}`,
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
    const project = rng.pick(world.projects);
    const speaker = rng.pick(world.people);
    const target = rng.pick(world.people.filter((p) => p.id !== speaker.id));
    const threadTs = `${Math.floor(new Date(startIso).getTime() / 1000) + i}.000${rng.int(100, 999)}`;
    const isSpicy = rng.bool(0.4);

    const mentionedPeople = world.people
      .filter((p) => p.id !== speaker.id && rng.bool(isSpicy ? 0.5 : 0.35))
      .slice(0, 3)
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
      reactions: reactionPool.filter(() => rng.bool(isSpicy ? 0.5 : 0.3)),
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
