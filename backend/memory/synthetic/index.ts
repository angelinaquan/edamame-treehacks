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

export type SyntheticSource =
  | "slack"
  | "gdrive"
  | "email"
  | "github"
  | "jira"
  | "notion";

const ALL_SOURCES: SyntheticSource[] = [
  "slack",
  "gdrive",
  "email",
  "github",
  "jira",
  "notion",
];

const VOLUME_CONFIG: Record<
  NonNullable<SyntheticGenerationOptions["volume"]>,
  Record<SyntheticSource, number>
> = {
  small: { slack: 10, gdrive: 5, email: 4, github: 6, jira: 4, notion: 3 },
  medium: { slack: 20, gdrive: 10, email: 8, github: 12, jira: 8, notion: 6 },
  large: { slack: 35, gdrive: 16, email: 14, github: 20, jira: 14, notion: 10 },
};

export interface SyntheticGenerationResult {
  seed: string;
  startIso: string;
  endIso: string;
  resources: MemoryResourceInput[];
  counts: Record<SyntheticSource, number>;
}

// Hackathon window: 2/14/2026 9:30 PM PT – 2/15/2026 9:30 AM PT
// PT (PST) = UTC-8
const HACKATHON_START = "2026-02-15T05:30:00.000Z"; // 2/14 9:30 PM PT
const HACKATHON_END = "2026-02-15T17:30:00.000Z"; // 2/15 9:30 AM PT

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
  const requestedSources = options.sources?.length
    ? options.sources.filter(
        (s): s is SyntheticSource =>
          ALL_SOURCES.includes(s as SyntheticSource)
      )
    : ALL_SOURCES;
  const volume = options.volume ?? "medium";
  const counts = { ...VOLUME_CONFIG[volume] };
  const { startIso, endIso } = resolveDateRange(options.dateRange);

  const resources: MemoryResourceInput[] = [];
  const params = { world, rng, startIso, endIso };

  // ── Slack ──
  if (requestedSources.includes("slack")) {
    resources.push(
      ...generateSlackResources({ ...params, count: counts.slack })
    );
  } else {
    counts.slack = 0;
  }

  // ── Google Drive ──
  if (requestedSources.includes("gdrive")) {
    resources.push(
      ...generateGdriveResources({ ...params, count: counts.gdrive })
    );
  } else {
    counts.gdrive = 0;
  }

  // ── Email ──
  if (requestedSources.includes("email")) {
    resources.push(
      ...generateEmailResources({ ...params, count: counts.email })
    );
  } else {
    counts.email = 0;
  }

  // ── GitHub ──
  if (requestedSources.includes("github")) {
    resources.push(
      ...generateGithubResources({ ...params, count: counts.github })
    );
  } else {
    counts.github = 0;
  }

  // ── Jira ──
  if (requestedSources.includes("jira")) {
    resources.push(
      ...generateJiraResources({ ...params, count: counts.jira })
    );
  } else {
    counts.jira = 0;
  }

  // ── Notion ──
  if (requestedSources.includes("notion")) {
    resources.push(
      ...generateNotionResources({ ...params, count: counts.notion })
    );
  } else {
    counts.notion = 0;
  }

  // Sort all resources chronologically
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
