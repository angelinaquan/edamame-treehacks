import type { MemoryResourceInput } from "@/lib/core/types";
import type { SyntheticProject, SyntheticWorld } from "./context";
import { randomIsoBetween, type SeededRng } from "./random";

interface GdriveSourceMetadata extends Record<string, unknown> {
  source_type: "gdrive";
  file_id: string;
  mime_type: string;
  folder_id: string;
  owner: string;
  shared_with: string[];
}

interface GdriveGeneratorParams {
  world: SyntheticWorld;
  rng: SeededRng;
  count: number;
  startIso: string;
  endIso: string;
}

function buildNormalDoc(
  project: SyntheticProject,
  owner: string,
  rng: SeededRng
): { title: string; content: string; mime: string } {
  const templates = [
    {
      title: `${project.name} - Status Report`,
      content: `${project.name} Weekly Status Report

Prepared by: ${owner}
Week of: Sprint ${rng.int(12, 18)}

Summary:
Project is on track for ${project.target_date}. Key milestones progressing as planned.

Metrics:
- Velocity: ${rng.int(28, 45)} story points
- Bug count: ${rng.int(3, 12)} open, ${rng.int(8, 25)} resolved
- Test coverage: ${rng.int(78, 92)}%

Risks:
- Dependency on third-party API (medium risk)
- Two team members on PTO next week (low risk)

Next Week:
- Complete integration testing
- Begin UAT preparation
- Stakeholder demo on Friday`,
      mime: "application/vnd.google-apps.document",
    },
    {
      title: `${project.name} - Budget Tracker`,
      content: `${project.name} Budget Summary

Total Budget: $${rng.int(200, 800)}K
Spent to Date: $${rng.int(100, 400)}K (${rng.int(40, 70)}%)
Remaining: $${rng.int(100, 400)}K

Breakdown:
- Engineering: $${rng.int(80, 250)}K
- Infrastructure: $${rng.int(20, 80)}K
- Contractors: $${rng.int(15, 60)}K
- Tools/Licenses: $${rng.int(5, 20)}K

Status: Within budget. On track for ${project.target_date}.`,
      mime: "application/vnd.google-apps.spreadsheet",
    },
  ];
  return rng.pick(templates);
}

function buildSpicyDoc(
  project: SyntheticProject,
  world: SyntheticWorld,
  owner: string,
  rng: SeededRng
): { title: string; content: string; mime: string } {
  const conflict = rng.pick(world.conflicts);
  const antagonist = rng.pick(world.people.filter(p => p.name !== owner));
  const bystander = rng.pick(world.people.filter(p => p.name !== owner && p.name !== antagonist.name));

  const templates = [
    // Passive-aggressive meeting agenda
    {
      title: `${project.name} - "Alignment" Meeting Agenda (UPDATED v${rng.int(4, 8)})`,
      content: `${project.name} - Cross-Functional Alignment Meeting
(Renamed from "Emergency Sync" per ${antagonist.name}'s request)
(Previously renamed from "Escalation Call" per leadership's request)

Agenda:

1. Review of ${conflict.topic} (again) — 15 min
   Note: We covered this in meetings on ${rng.int(3, 6)} previous occasions. Recap for those who were "unable to attend."

2. ${antagonist.name}'s proposal — 10 min
   ${conflict.side_b.position}
   (Comment from ${owner}: "${conflict.passive_aggressive[rng.int(0, conflict.passive_aggressive.length - 1)]}")

3. ${owner}'s counter-proposal — 10 min
   ${conflict.side_a.position}
   (Comment from ${antagonist.name}: "${conflict.passive_aggressive[rng.int(0, conflict.passive_aggressive.length - 1)]}")

4. Attempt to reach consensus — 25 min
   (Historically, this has not been successful. Bringing ${bystander.name} as neutral party.)

5. Decide who actually owns this decision — 10 min
   (This was supposed to be decided ${rng.int(2, 5)} meetings ago.)

Pre-read: Please review the decision log (see v${rng.int(1, 3)} through v${rng.int(5, 8)} in the shared folder). If you haven't read it, ${conflict.passive_aggressive[rng.int(0, conflict.passive_aggressive.length - 1)]}`,
      mime: "application/vnd.google-apps.document",
    },

    // Contentious shared spreadsheet
    {
      title: `${project.name} - Resource Allocation (DISPUTED)`,
      content: `${project.name} Resource Allocation Matrix

IMPORTANT: ${antagonist.name} and ${owner} have conflicting edits in this sheet.
Please do NOT modify rows 4-12 until the dispute is resolved.

Edit History:
- ${owner} updated headcount projections (v${rng.int(8, 15)})
- ${antagonist.name} reverted changes with comment: "These numbers are wrong."
- ${owner} re-applied changes with comment: "${conflict.passive_aggressive[rng.int(0, conflict.passive_aggressive.length - 1)]}"
- ${antagonist.name} added a comment: "${conflict.heated_exchange[rng.int(0, conflict.heated_exchange.length - 1)]}"
- ${bystander.name} added a comment: "Can we please stop editing the same cells?"

Current State:
- Engineering headcount: ${rng.int(6, 12)} (${owner} says ${rng.int(8, 14)}, ${antagonist.name} says ${rng.int(4, 8)})
- Budget variance: ${rng.int(5, 25)}% over (disputed)
- Target date: ${project.target_date} (${antagonist.name} thinks this is "aspirational")

Resolution: Pending. ${bystander.name} has locked the sheet.`,
      mime: "application/vnd.google-apps.spreadsheet",
    },

    // Frustrated project brief
    {
      title: `${project.name} - Project Brief (FINAL) (FINAL v2) (ACTUALLY FINAL)`,
      content: `${project.name} Project Brief

Version: ${rng.int(7, 14)} (yes, really)
Last edited by: ${owner}
Status: "Final" — subject to change without notice, apparently

Objective:
${conflict.side_a.position}

Counter-objective (per ${antagonist.name}):
${conflict.side_b.position}

What we agreed on:
- We need to do something. (This is the extent of our consensus.)

What we disagree on:
- Everything else. See comment thread below.

Comments:
${owner}: "I've rewritten this brief ${rng.int(4, 8)} times based on contradictory feedback."
${antagonist.name}: "${conflict.passive_aggressive[rng.int(0, conflict.passive_aggressive.length - 1)]}"
${bystander.name}: "Maybe we should just have a meeting." (We have. ${rng.int(5, 10)} of them.)

Timeline: ${project.target_date}
Confidence: Low`,
      mime: "application/vnd.google-apps.document",
    },
  ];

  return rng.pick(templates);
}

export function generateGdriveResources({
  world,
  rng,
  count,
  startIso,
  endIso,
}: GdriveGeneratorParams): MemoryResourceInput[] {
  const records: MemoryResourceInput[] = [];

  for (let i = 0; i < count; i++) {
    const project = rng.pick(world.projects);
    const owner = rng.pick(world.people);
    const isSpicy = rng.bool(0.4);
    const occurredAt = randomIsoBetween(rng, startIso, endIso);
    const fileId = `gdrive_${project.key.toLowerCase()}_${i + 1}_${rng.int(1000, 9999)}`;

    const sharedWith = world.people
      .filter(p => p.id !== owner.id)
      .filter(() => rng.bool(0.6))
      .slice(0, 4)
      .map(p => p.email);

    const doc = isSpicy
      ? buildSpicyDoc(project, world, owner.name, rng)
      : buildNormalDoc(project, owner.name, rng);

    const metadata: GdriveSourceMetadata = {
      source_type: "gdrive",
      file_id: fileId,
      mime_type: doc.mime,
      folder_id: project.gdrive_folder_id,
      owner: owner.email,
      shared_with: sharedWith,
    };

    records.push({
      clone_id: world.cloneId,
      source_type: "gdrive",
      external_id: fileId,
      title: doc.title,
      author: owner.name,
      content: doc.content,
      occurred_at: occurredAt,
      modality: "text",
      source_metadata: metadata,
      raw_payload: {
        file_id: fileId,
        owner: owner.email,
        title: doc.title,
        body: doc.content,
      },
    });
  }

  return records.sort((a, b) =>
    a.occurred_at > b.occurred_at ? 1 : a.occurred_at < b.occurred_at ? -1 : 0
  );
}
