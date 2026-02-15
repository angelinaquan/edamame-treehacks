import type { MemoryResourceInput, SlackSourceMetadata } from "../types";
import type { SyntheticPerson, SyntheticProject, SyntheticWorld } from "./context";
import { randomIsoBetween, type SeededRng } from "./random";

interface SlackGeneratorParams {
  world: SyntheticWorld;
  rng: SeededRng;
  count: number;
  startIso: string;
  endIso: string;
}

const reactions = [":thumbsup:", ":eyes:", ":rocket:", ":white_check_mark:"];

function buildSlackMessage(
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
    const reviewer = rng.pick(world.people.filter((p) => p.id !== speaker.id));
    const threadTs = `${Math.floor(new Date(startIso).getTime() / 1000) + i}.000${rng.int(100, 999)}`;
    const mentionedPeople = world.people
      .filter((p) => p.id !== speaker.id && rng.bool(0.35))
      .slice(0, 2)
      .map((p) => p.name);
    const message = buildSlackMessage(project, speaker, reviewer, rng);
    const occurredAt = randomIsoBetween(rng, startIso, endIso);

    const metadata: SlackSourceMetadata = {
      source_type: "slack",
      channel_id: project.channel_id,
      channel_name: project.channel,
      thread_ts: threadTs,
      sender_id: speaker.id,
      mentions: mentionedPeople,
      reactions: reactions.filter(() => rng.bool(0.4)),
      source_url: `https://slack.com/app_redirect?channel=${project.channel_id}`,
    };

    records.push({
      clone_id: world.cloneId,
      source_type: "slack",
      external_id: `slack_${project.key.toLowerCase()}_${i + 1}`,
      title: `#${project.channel} update`,
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
