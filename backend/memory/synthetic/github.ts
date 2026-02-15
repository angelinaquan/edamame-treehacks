import type { MemoryResourceInput } from "@/lib/core/types";

interface GithubSourceMetadata extends Record<string, unknown> {
  source_type: "github";
  repo: string;
  commit_sha: string;
  author: string;
  branch: string;
  files_changed: string[];
}
import type { SyntheticProject, SyntheticWorld } from "./context";
import { randomIsoBetween, type SeededRng } from "./random";

interface GithubGeneratorParams {
  world: SyntheticWorld;
  rng: SeededRng;
  count: number;
  startIso: string;
  endIso: string;
}

function randomHex(rng: SeededRng, len: number): string {
  const chars = "abcdef0123456789";
  let out = "";
  for (let i = 0; i < len; i++) {
    out += chars[rng.int(0, chars.length - 1)];
  }
  return out;
}

function buildNormalBody(project: SyntheticProject, rng: SeededRng): string {
  const modules = ["auth", "audit", "events", "api", "onboarding", "search"];
  const selected = rng.pick(modules);
  const latency = rng.int(80, 190);
  return `Commit summary for ${project.name}

Implemented ${selected} improvements and confirmed regression tests are passing.
We decided to keep the rollout checkpoint on ${project.target_date}.

Verification:
- CI status: green
- p95 latency improved to ${latency}ms
- Critical issue count reduced by ${rng.int(1, 4)}

Next steps:
- We will monitor production logs for 48 hours.
- Important: if error budget exceeds 2%, rollback will trigger automatically.`;
}

function buildSpicyBody(
  project: SyntheticProject,
  world: SyntheticWorld,
  rng: SeededRng
): string {
  const conflict = rng.pick(world.conflicts);
  const reviewer = rng.pick(world.people);
  const author = rng.pick(world.people.filter(p => p.id !== reviewer.id));

  const templates = [
    // Combative PR review
    `PR #${rng.int(200, 500)}: ${project.name} - CHANGES REQUESTED (again)

Review by ${reviewer.name}:

This PR has fundamental problems. I've left the same comment on three previous PRs and the pattern keeps appearing.

${reviewer.name}: "This approach won't scale. We discussed this in the architecture review and agreed not to do it this way."
${author.name}: "The architecture review was 6 months ago and the requirements have changed. This is the pragmatic solution."
${reviewer.name}: "Pragmatic is a nice word for 'cutting corners.' ${conflict.passive_aggressive[rng.int(0, conflict.passive_aggressive.length - 1)]}"
${author.name}: "${conflict.heated_exchange[rng.int(0, conflict.heated_exchange.length - 1)]}"

Status: BLOCKED - waiting on resolution
Files changed: ${rng.int(12, 35)}
Comments: ${rng.int(28, 65)}
Review rounds: ${rng.int(4, 8)}`,

    // Revert with blame
    `REVERT: "${project.key}: Undo ${author.name}'s changes from last sprint"

This commit reverts the changes from PR #${rng.int(300, 450)} which introduced a regression in production.

Impact:
- ${rng.int(200, 2000)} users affected
- Error rate spiked to ${rng.int(5, 15)}% for ${rng.int(2, 8)} hours
- On-call engineer (${reviewer.name}) had to fix it at ${rng.int(1, 4)}am

Post-mortem notes:
- The original PR was approved without adequate review
- Test coverage was ${rng.int(15, 40)}% — well below our 80% minimum
- ${conflict.heated_exchange[rng.int(0, conflict.heated_exchange.length - 1)]}
- Root cause: ${conflict.passive_aggressive[rng.int(0, conflict.passive_aggressive.length - 1)]}

Action items:
- Mandatory review from 2+ senior engineers going forward
- ${author.name} to write post-mortem (due: EOD Friday)`,

    // Frustrated commit message
    `${project.key}: Fix the fix that fixed the fix

Third attempt at resolving the ${rng.pick(["auth", "caching", "rate-limit", "migration"])} issue.

Previous "fixes":
1. PR #${rng.int(350, 400)} — broke staging
2. PR #${rng.int(401, 430)} — fixed staging, broke prod
3. This PR — hopefully actually works this time

Note to future maintainers: the reason this code is so convoluted is because requirements changed ${rng.int(4, 7)} times during implementation. See Slack thread in #${project.channel} for the full saga.

${conflict.passive_aggressive[rng.int(0, conflict.passive_aggressive.length - 1)]}

Tests: passing (for now)
Confidence level: moderate to low`,
  ];

  return rng.pick(templates);
}

export function generateGithubResources({
  world,
  rng,
  count,
  startIso,
  endIso,
}: GithubGeneratorParams): MemoryResourceInput[] {
  const records: MemoryResourceInput[] = [];

  for (let i = 0; i < count; i++) {
    const project = rng.pick(world.projects);
    const author = rng.pick(world.people);
    const commitSha = randomHex(rng, 40);
    const isSpicy = rng.bool(0.35);
    const occurredAt = randomIsoBetween(rng, startIso, endIso);
    const filesChanged = [
      `src/${project.key.toLowerCase()}/service.ts`,
      `src/${project.key.toLowerCase()}/handlers.ts`,
      `tests/${project.key.toLowerCase()}.spec.ts`,
    ];

    const content = isSpicy
      ? buildSpicyBody(project, world, rng)
      : buildNormalBody(project, rng);

    const metadata: GithubSourceMetadata = {
      source_type: "github",
      repo: project.repo,
      commit_sha: commitSha,
      pr_number: rng.int(120, 500),
      author: author.name,
      branch: rng.pick(["main", "release/candidate", "feature/hardening", "hotfix/revert-again"]),
      files_changed: filesChanged,
      source_url: `https://github.com/${project.repo}/commit/${commitSha}`,
    };

    records.push({
      clone_id: world.cloneId,
      source_type: "github",
      external_id: `github_${project.key.toLowerCase()}_${i + 1}`,
      title: `${project.repo} ${isSpicy ? "revert" : "commit"} ${commitSha.slice(0, 8)}`,
      author: author.name,
      content,
      occurred_at: occurredAt,
      modality: "text",
      source_metadata: metadata,
      raw_payload: {
        sha: commitSha,
        repository: project.repo,
        author: author.name,
        files: filesChanged,
        body: content,
      },
    });
  }

  return records.sort((a, b) =>
    a.occurred_at > b.occurred_at ? 1 : a.occurred_at < b.occurred_at ? -1 : 0
  );
}
