import type {
  MemoryResourceInput,
  SyntheticGenerationOptions,
} from "@/lib/core/types";
import { buildSyntheticWorld } from "./context";
import { generateGdriveResources } from "./gdrive";
import { createSeededRng } from "./random";
import { generateSlackResources } from "./slack";

export type SyntheticSource = "slack" | "gdrive";

const ALL_SOURCES: SyntheticSource[] = ["slack", "gdrive"];

const VOLUME_CONFIG: Record<
  NonNullable<SyntheticGenerationOptions["volume"]>,
  Record<SyntheticSource, number>
> = {
  small: { slack: 10, gdrive: 5 },
  medium: { slack: 20, gdrive: 10 },
  large: { slack: 35, gdrive: 16 },
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
    ? options.sources.filter((s): s is SyntheticSource => ALL_SOURCES.includes(s as SyntheticSource))
    : ALL_SOURCES;
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

  if (requestedSources.includes("gdrive")) {
    resources.push(...generateGdriveResources({ ...params, count: counts.gdrive }));
  } else {
    counts.gdrive = 0;
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
