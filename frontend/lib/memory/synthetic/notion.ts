import type { MemoryResourceInput, NotionSourceMetadata } from "@/lib/core/types";
import type { SyntheticPerson, SyntheticProject, SyntheticWorld } from "./context";
import { randomIsoBetween, type SeededRng } from "./random";

interface NotionGeneratorParams {
  world: SyntheticWorld;
  rng: SeededRng;
  count: number;
  startIso: string;
  endIso: string;
}

function buildNotionBody(
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
    const occurredAt = randomIsoBetween(rng, startIso, endIso);
    const content = buildNotionBody(project, editor, rng);

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
      title: `${project.name} - Weekly Update`,
      author: editor.name,
      content,
      occurred_at: occurredAt,
      modality: "text",
      source_metadata: metadata,
      raw_payload: {
        page_id: metadata.page_id,
        title: `${project.name} - Weekly Update`,
        editor: editor.name,
        body: content,
      },
    });
  }

  return records.sort((a, b) =>
    a.occurred_at > b.occurred_at ? 1 : a.occurred_at < b.occurred_at ? -1 : 0
  );
}
