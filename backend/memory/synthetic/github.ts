import type { GithubSourceMetadata, MemoryResourceInput } from "@/lib/core/types";
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

function buildCommitBody(project: SyntheticProject, rng: SeededRng): string {
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
    const prNumber = rng.int(120, 420);
    const occurredAt = randomIsoBetween(rng, startIso, endIso);
    const filesChanged = [
      `src/${project.key.toLowerCase()}/service.ts`,
      `src/${project.key.toLowerCase()}/handlers.ts`,
      `tests/${project.key.toLowerCase()}.spec.ts`,
    ];
    const content = buildCommitBody(project, rng);

    const metadata: GithubSourceMetadata = {
      source_type: "github",
      repo: project.repo,
      commit_sha: commitSha,
      pr_number: prNumber,
      author: author.name,
      branch: rng.pick(["main", "release/candidate", "feature/hardening"]),
      files_changed: filesChanged,
      source_url: `https://github.com/${project.repo}/commit/${commitSha}`,
    };

    records.push({
      clone_id: world.cloneId,
      source_type: "github",
      external_id: `github_${project.key.toLowerCase()}_${i + 1}`,
      title: `${project.repo} commit ${commitSha.slice(0, 8)}`,
      author: author.name,
      content,
      occurred_at: occurredAt,
      modality: "text",
      source_metadata: metadata,
      raw_payload: {
        sha: commitSha,
        repository: project.repo,
        pull_request: prNumber,
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
