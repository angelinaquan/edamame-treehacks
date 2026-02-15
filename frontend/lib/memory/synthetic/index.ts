import type {
  MemoryResourceInput,
  SyntheticGenerationOptions,
} from "@/lib/core/types";
import { buildSyntheticWorld } from "./context";
import { generateGithubResources } from "./github";
import { generateNotionResources } from "./notion";
import { createSeededRng } from "./random";
import { generateSlackResources } from "./slack";

const DEFAULT_SOURCES: ("slack" | "notion" | "github")[] = [
  "slack",
  "notion",
  "github",
];

const VOLUME_CONFIG: Record<
  NonNullable<SyntheticGenerationOptions["volume"]>,
  Record<"slack" | "notion" | "github", number>
> = {
  small: { slack: 8, notion: 4, github: 6 },
  medium: { slack: 16, notion: 8, github: 12 },
  large: { slack: 28, notion: 12, github: 20 },
};

export interface SyntheticGenerationResult {
  seed: string;
  startIso: string;
  endIso: string;
  resources: MemoryResourceInput[];
  counts: Record<"slack" | "notion" | "github", number>;
}

function resolveDateRange(options?: SyntheticGenerationOptions["dateRange"]): {
  startIso: string;
  endIso: string;
} {
  const end = options?.end ? new Date(options.end) : new Date();
  const start = options?.start
    ? new Date(options.start)
    : new Date(end.getTime() - 1000 * 60 * 60 * 24 * 30);
  return { startIso: start.toISOString(), endIso: end.toISOString() };
}

export function generateSyntheticResources(
  options: SyntheticGenerationOptions
): SyntheticGenerationResult {
  const seed = String(options.seed ?? `${options.cloneId}-synthetic-seed`);
  const rng = createSeededRng(seed);
  const world = buildSyntheticWorld(options.cloneId, rng);
  const sources = options.sources?.length ? options.sources : DEFAULT_SOURCES;
  const volume = options.volume ?? "medium";
  const counts = { ...VOLUME_CONFIG[volume] };
  const { startIso, endIso } = resolveDateRange(options.dateRange);

  const resources: MemoryResourceInput[] = [];
  if (sources.includes("slack")) {
    resources.push(
      ...generateSlackResources({
        world,
        rng,
        count: counts.slack,
        startIso,
        endIso,
      })
    );
  } else {
    counts.slack = 0;
  }

  if (sources.includes("notion")) {
    resources.push(
      ...generateNotionResources({
        world,
        rng,
        count: counts.notion,
        startIso,
        endIso,
      })
    );
  } else {
    counts.notion = 0;
  }

  if (sources.includes("github")) {
    resources.push(
      ...generateGithubResources({
        world,
        rng,
        count: counts.github,
        startIso,
        endIso,
      })
    );
  } else {
    counts.github = 0;
  }

  resources.sort((a, b) =>
    a.occurred_at > b.occurred_at ? 1 : a.occurred_at < b.occurred_at ? -1 : 0
  );

  return {
    seed,
    startIso,
    endIso,
    resources,
    counts,
  };
}
