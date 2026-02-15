import type { MemoryResourceInput } from "@/lib/core/types";

interface NotionSourceMetadata extends Record<string, unknown> {
  source_type: "notion";
  page_id: string;
  workspace_id: string;
  last_edited_by: string;
  path: string[];
}
import type { SyntheticPerson, SyntheticProject, SyntheticWorld } from "./context";
import { randomIsoBetween, type SeededRng } from "./random";

interface NotionGeneratorParams {
  world: SyntheticWorld;
  rng: SeededRng;
  count: number;
  startIso: string;
  endIso: string;
}

function buildNormalBody(
  project: SyntheticProject,
  editor: SyntheticPerson,
  rng: SeededRng
): string {
  const decisionOwner = rng.pick(["Product", "Engineering", "Security"]);
  return `Weekly notes for ${project.name}

Summary:
${editor.name} confirmed we will keep ${project.key} on track for ${project.target_date}. The important blocker is vendor review turnaround.

Decisions:
- Team decided to freeze feature additions after this sprint.
- We will prioritize reliability fixes before launch.
- Budget impact remains below ${rng.int(4, 9)}% of plan.

Action Items:
- Update stakeholder brief by next Monday.
- Ship high-priority task list by Friday.
- ${decisionOwner} owner to close open risks this week.`;
}

function buildSpicyBody(
  project: SyntheticProject,
  editor: SyntheticPerson,
  world: SyntheticWorld,
  rng: SeededRng
): string {
  const conflict = rng.pick(world.conflicts);
  const antagonist = rng.pick(world.people.filter(p => p.id !== editor.id));
  const otherPerson = rng.pick(world.people.filter(p => p.id !== editor.id && p.id !== antagonist.id));

  const templates = [
    // Contentious meeting notes
    `${project.name} - Sync Notes (CONTENTIOUS)

Attendees: ${editor.name}, ${antagonist.name}, ${otherPerson.name}

Discussion:
The meeting became heated when ${antagonist.name} raised the ${conflict.topic} issue again. ${conflict.heated_exchange[rng.int(0, conflict.heated_exchange.length - 1)]}

${editor.name} responded: "${conflict.heated_exchange[rng.int(0, conflict.heated_exchange.length - 1)]}"

${antagonist.name} pushed back: "${conflict.passive_aggressive[rng.int(0, conflict.passive_aggressive.length - 1)]}"

No resolution reached. Escalating to leadership.

Action Items:
- ${editor.name}: Document position and share with ${antagonist.name} by EOD
- ${antagonist.name}: Provide data to support their stance
- ${otherPerson.name}: Mediate follow-up session
- OPEN: Who actually owns this decision? (Still unclear after ${rng.int(3, 6)} meetings)`,

    // Passive-aggressive decision log
    `${project.name} - Decision Log (Updated for the ${rng.int(3, 5)}th time)

Context: ${conflict.topic}

Previous Decision (${rng.int(2, 4)} weeks ago):
We agreed to ${conflict.side_a.position.toLowerCase()}. This was documented and shared.

Current Status:
Despite the above, ${antagonist.name} has proceeded differently. ${conflict.passive_aggressive[rng.int(0, conflict.passive_aggressive.length - 1)]}

Revised Decision:
After yet another discussion, we are now going with a "compromise" that satisfies nobody:
- ${conflict.side_a.position}
- BUT ALSO ${conflict.side_b.position.toLowerCase()}
- Timeline impact: ${rng.int(1, 3)} weeks added. Again.

Notes:
- ${editor.name}: "I want it on record that I disagreed with this approach."
- ${antagonist.name}: "${conflict.passive_aggressive[rng.int(0, conflict.passive_aggressive.length - 1)]}"
- Target date is now ${project.target_date}. We will see if it holds this time.`,

    // Frustrated retrospective
    `${project.name} - Sprint Retrospective

What went well:
- Nothing notable. Moving on.

What didn't go well:
- ${conflict.topic} continues to be a problem. ${conflict.heated_exchange[rng.int(0, conflict.heated_exchange.length - 1)]}
- Requirements changed mid-sprint (again) per ${antagonist.name}'s request
- Team morale is low. Multiple engineers have expressed frustration privately.
- The same issue from last retro is on the list again. ${conflict.passive_aggressive[rng.int(0, conflict.passive_aggressive.length - 1)]}

Action Items (same as last ${rng.int(2, 4)} retros):
- "Improve communication" (owner: everyone/nobody)
- "Better requirements upfront" (owner: TBD, as always)
- ${editor.name} to schedule a "reset" meeting. ETA: when pigs fly.`,
  ];

  return rng.pick(templates);
}

export function generateNotionResources({
  world,
  rng,
  count,
  startIso,
  endIso,
}: NotionGeneratorParams): MemoryResourceInput[] {
  const records: MemoryResourceInput[] = [];

  for (let i = 0; i < count; i++) {
    const project = rng.pick(world.projects);
    const editor = rng.pick(world.people);
    const isSpicy = rng.bool(0.4);
    const occurredAt = randomIsoBetween(rng, startIso, endIso);

    const content = isSpicy
      ? buildSpicyBody(project, editor, world, rng)
      : buildNormalBody(project, editor, rng);

    const metadata: NotionSourceMetadata = {
      source_type: "notion",
      page_id: `${project.notion_page_id}-${i + 1}`,
      workspace_id: "workspace_viven_demo",
      last_edited_by: editor.name,
      path: ["Engineering", "Program Updates", project.key],
      source_url: `https://www.notion.so/${project.notion_page_id}-${i + 1}`,
    };

    records.push({
      clone_id: world.cloneId,
      source_type: "notion",
      external_id: `notion_${project.key.toLowerCase()}_${i + 1}`,
      title: `${project.name} - ${isSpicy ? "Contentious Notes" : "Weekly Update"}`,
      author: editor.name,
      content,
      occurred_at: occurredAt,
      modality: "text",
      source_metadata: metadata,
      raw_payload: {
        page_id: metadata.page_id,
        title: `${project.name} - ${isSpicy ? "Contentious Notes" : "Weekly Update"}`,
        editor: editor.name,
        body: content,
      },
    });
  }

  return records.sort((a, b) =>
    a.occurred_at > b.occurred_at ? 1 : a.occurred_at < b.occurred_at ? -1 : 0
  );
}
