import type {
  MemoryResourceInput,
  SyntheticGenerationOptions,
} from "@/lib/core/types";
import { buildSyntheticWorld } from "./context";
import { generateEmailResources } from "./email";
import { generateGdriveResources } from "./gdrive";
import { generateGithubResources } from "./github";
import { generateJiraResources } from "./jira";
import { generateNotionResources } from "./notion";
import { createSeededRng } from "./random";
import { generateSlackResources } from "./slack";

export type SyntheticSource = "slack" | "notion" | "github" | "jira" | "gdrive" | "email";

const ALL_SOURCES: SyntheticSource[] = [
  "slack",
  "notion",
  "github",
  "jira",
  "gdrive",
  "email",
];

const VOLUME_CONFIG: Record<
  NonNullable<SyntheticGenerationOptions["volume"]>,
  Record<SyntheticSource, number>
> = {
  small: { slack: 8, notion: 4, github: 6, jira: 6, gdrive: 4, email: 6 },
  medium: { slack: 16, notion: 8, github: 12, jira: 10, gdrive: 8, email: 12 },
  large: { slack: 28, notion: 12, github: 20, jira: 16, gdrive: 12, email: 20 },
};

export interface SyntheticGenerationResult {
  seed: string;
  startIso: string;
  endIso: string;
  resources: MemoryResourceInput[];
  counts: Record<SyntheticSource, number>;
}

// Hackathon window: 2/13/2026 9:30 PM PT – 2/14/2026 9:00 PM PT
// PT (PST) = UTC-8
const HACKATHON_START = "2026-02-14T05:30:00.000Z"; // 2/13 9:30 PM PT
const HACKATHON_END = "2026-02-15T05:00:00.000Z"; // 2/14 9:00 PM PT

function resolveDateRange(options?: SyntheticGenerationOptions["dateRange"]): {
  startIso: string;
  endIso: string;
} {
  const start = options?.start
    ? new Date(options.start).toISOString()
    : HACKATHON_START;
  const end = options?.end
    ? new Date(options.end).toISOString()
    : HACKATHON_END;
  return { startIso: start, endIso: end };
}

export function generateSyntheticResources(
  options: SyntheticGenerationOptions
): SyntheticGenerationResult {
  const seed = String(options.seed ?? `${options.cloneId}-synthetic-seed`);
  const rng = createSeededRng(seed);
  const world = buildSyntheticWorld(options.cloneId, rng);
  const requestedSources = options.sources?.length ? options.sources : ALL_SOURCES;
  const volume = options.volume ?? "medium";
  const counts = { ...VOLUME_CONFIG[volume] };
  const { startIso, endIso } = resolveDateRange(options.dateRange);

  const resources: MemoryResourceInput[] = [];
  const params = { world, rng, startIso, endIso };

  if (requestedSources.includes("slack")) {
    resources.push(...generateSlackResources({ ...params, count: counts.slack }));
  } else {
    counts.slack = 0;
  }

  if (requestedSources.includes("notion")) {
    resources.push(...generateNotionResources({ ...params, count: counts.notion }));
  } else {
    counts.notion = 0;
  }

  if (requestedSources.includes("github")) {
    resources.push(...generateGithubResources({ ...params, count: counts.github }));
  } else {
    counts.github = 0;
  }

  if (requestedSources.includes("jira")) {
    resources.push(...generateJiraResources({ ...params, count: counts.jira }));
  } else {
    counts.jira = 0;
  }

  if (requestedSources.includes("gdrive")) {
    resources.push(...generateGdriveResources({ ...params, count: counts.gdrive }));
  } else {
    counts.gdrive = 0;
  }

  if (requestedSources.includes("email")) {
    resources.push(...generateEmailResources({ ...params, count: counts.email }));
  } else {
    counts.email = 0;
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
