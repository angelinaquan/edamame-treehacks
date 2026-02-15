"use client";

import {
  useState,
  useRef,
  useCallback,
  useEffect,
  type FormEvent,
} from "react";
import {
  Search,
  Play,
  X,
  ChevronRight,
  Users,
  Filter,
  RotateCcw,
  ArrowRight,
  Quote,
  CheckCircle2,
  Clock,
  Loader2,
} from "lucide-react";
import { streamInsightsQuery } from "@/lib/orgpulse/api";
import { ALL_TEAMS } from "@/lib/orgpulse/mock-data";
import type {
  StreamStage,
  QueryPlan,
  EmployeeResponse,
  AggregationResult,
  InsightsFilters,
  Theme,
  Stance,
  StanceDistribution,
} from "@/lib/orgpulse/types";

// ---- Constants ----

const SCENARIOS = [
  { id: null as string | null, label: "Base scenario" },
  { id: "retraining", label: "With 12-month transition & retraining" },
];

const STANCE_COLORS: Record<Stance, string> = {
  support: "#10b981",
  neutral: "#f59e0b",
  oppose: "#ef4444",
};

const STANCE_BG: Record<Stance, string> = {
  support: "bg-emerald-50 text-emerald-700 border-emerald-200",
  neutral: "bg-amber-50 text-amber-700 border-amber-200",
  oppose: "bg-red-50 text-red-700 border-red-200",
};

const STANCE_LABELS: Record<Stance, string> = {
  support: "Support",
  neutral: "Neutral",
  oppose: "Oppose",
};

// ---- Sub-components ----

function StageIndicator({ stage }: { stage: StreamStage }) {
  const stages: { key: StreamStage; label: string }[] = [
    { key: "planning", label: "Plan" },
    { key: "querying", label: "Query Employees" },
    { key: "aggregating", label: "Aggregate" },
  ];

  return (
    <div className="flex items-center gap-1">
      {stages.map((s, i) => {
        const stageOrder = ["planning", "querying", "aggregating", "complete"];
        const currentIdx = stageOrder.indexOf(stage);
        const thisIdx = stageOrder.indexOf(s.key);
        const isActive = stage === s.key;
        const isDone = currentIdx > thisIdx;

        return (
          <div key={s.key} className="flex items-center gap-1">
            {i > 0 && (
              <ChevronRight
                size={12}
                className={isDone ? "text-indigo-400" : "text-neutral-300"}
              />
            )}
            <div
              className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-medium transition-all ${
                isActive
                  ? "bg-indigo-100 text-indigo-700"
                  : isDone
                  ? "bg-emerald-50 text-emerald-600"
                  : "bg-neutral-100 text-neutral-400"
              }`}
            >
              {isDone ? (
                <CheckCircle2 size={12} />
              ) : isActive ? (
                <Loader2 size={12} className="animate-spin" />
              ) : (
                <Clock size={12} />
              )}
              {s.label}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function StanceBar({
  distribution,
  previous,
  animated,
}: {
  distribution: StanceDistribution;
  previous?: StanceDistribution | null;
  animated?: boolean;
}) {
  return (
    <div className="space-y-2">
      <div className="flex h-3 overflow-hidden rounded-full bg-neutral-100">
        <div
          className="transition-all duration-700"
          style={{
            width: `${distribution.support}%`,
            backgroundColor: STANCE_COLORS.support,
          }}
        />
        <div
          className="transition-all duration-700"
          style={{
            width: `${distribution.neutral}%`,
            backgroundColor: STANCE_COLORS.neutral,
          }}
        />
        <div
          className="transition-all duration-700"
          style={{
            width: `${distribution.oppose}%`,
            backgroundColor: STANCE_COLORS.oppose,
          }}
        />
      </div>
      <div className="flex items-center justify-between text-[12px]">
        {(["support", "neutral", "oppose"] as Stance[]).map((s) => {
          const val = distribution[s];
          const prev = previous?.[s];
          const delta = prev != null ? val - prev : null;
          return (
            <div key={s} className="flex items-center gap-1.5">
              <span
                className="inline-block h-2 w-2 rounded-full"
                style={{ backgroundColor: STANCE_COLORS[s] }}
              />
              <span className="font-medium text-neutral-700">
                {STANCE_LABELS[s]} {val}%
              </span>
              {delta != null && delta !== 0 && animated && (
                <span
                  className={`text-[11px] font-medium ${
                    delta > 0
                      ? s === "oppose"
                        ? "text-red-500"
                        : "text-emerald-500"
                      : s === "oppose"
                      ? "text-emerald-500"
                      : "text-red-500"
                  }`}
                >
                  {delta > 0 ? "+" : ""}
                  {delta}pp
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ThemeCard({
  theme,
  onClick,
  previousCount,
}: {
  theme: Theme;
  onClick: () => void;
  previousCount?: number;
}) {
  const delta =
    previousCount != null ? theme.count - previousCount : null;
  return (
    <button
      onClick={onClick}
      className="group w-full rounded-xl border border-neutral-200 bg-white p-4 text-left transition-all hover:border-neutral-300 hover:shadow-sm"
    >
      <div className="mb-2 flex items-center justify-between">
        <span
          className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${STANCE_BG[theme.dominantStance]}`}
        >
          {STANCE_LABELS[theme.dominantStance]}
        </span>
        <div className="flex items-center gap-1 text-[12px] text-neutral-400">
          <Users size={12} />
          {theme.count}
          {delta != null && delta !== 0 && (
            <span
              className={`ml-1 font-medium ${
                delta > 0 ? "text-indigo-500" : "text-neutral-400"
              }`}
            >
              {delta > 0 ? "+" : ""}
              {delta}
            </span>
          )}
        </div>
      </div>
      <h4 className="mb-1 text-[13.5px] font-semibold text-neutral-800 group-hover:text-neutral-900">
        {theme.label}
      </h4>
      <p className="text-[12.5px] leading-relaxed text-neutral-500">
        {theme.description}
      </p>
    </button>
  );
}

function EmployeeCard({
  response,
  onClick,
  index,
}: {
  response: EmployeeResponse;
  onClick: () => void;
  index: number;
}) {
  const avatarColors = [
    "bg-indigo-100 text-indigo-700",
    "bg-emerald-100 text-emerald-700",
    "bg-amber-100 text-amber-700",
    "bg-rose-100 text-rose-700",
    "bg-violet-100 text-violet-700",
    "bg-sky-100 text-sky-700",
    "bg-orange-100 text-orange-700",
  ];
  const color = avatarColors[index % avatarColors.length];

  return (
    <button
      onClick={onClick}
      className="animate-fade-in-up group w-full rounded-xl border border-neutral-200 bg-white p-4 text-left transition-all hover:border-neutral-300 hover:shadow-sm"
      style={{ animationDelay: `${index * 40}ms`, animationFillMode: "both" }}
    >
      <div className="flex items-start gap-3">
        <div
          className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-[12px] font-semibold ${color}`}
        >
          {response.employee.initials}
        </div>
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-center justify-between">
            <div>
              <span className="text-[13.5px] font-medium text-neutral-800">
                {response.employee.name}
              </span>
              <span className="ml-2 text-[12px] text-neutral-400">
                {response.employee.role} · {response.employee.team}
              </span>
            </div>
            <span
              className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${STANCE_BG[response.stance]}`}
            >
              {STANCE_LABELS[response.stance]}
            </span>
          </div>
          <p className="text-[12.5px] leading-relaxed text-neutral-500">
            {response.summary}
          </p>
          <div className="mt-2 flex items-center gap-2 text-[11px] text-neutral-400">
            <span>Confidence: {Math.round(response.confidence * 100)}%</span>
            <span>·</span>
            <span className="flex items-center gap-1 text-indigo-500 group-hover:text-indigo-600">
              View details <ArrowRight size={10} />
            </span>
          </div>
        </div>
      </div>
    </button>
  );
}

function DetailDrawer({
  response,
  onClose,
}: {
  response: EmployeeResponse;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/20" onClick={onClose} />
      <div className="animate-slide-in-right relative z-10 flex h-full w-full max-w-lg flex-col bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-200 px-6 py-4">
          <div>
            <h3 className="text-[15px] font-semibold text-neutral-900">
              {response.employee.name}
            </h3>
            <p className="text-[12.5px] text-neutral-500">
              {response.employee.role} · {response.employee.team} ·{" "}
              {response.employee.tenure}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {/* Stance */}
          <div className="mb-5">
            <div className="mb-2 text-[11px] font-medium uppercase tracking-wider text-neutral-400">
              Position
            </div>
            <span
              className={`inline-flex items-center rounded-full border px-3 py-1 text-[13px] font-medium ${STANCE_BG[response.stance]}`}
            >
              {STANCE_LABELS[response.stance]} · {Math.round(response.confidence * 100)}% confidence
            </span>
          </div>

          {/* Summary */}
          <div className="mb-5">
            <div className="mb-2 text-[11px] font-medium uppercase tracking-wider text-neutral-400">
              Summary
            </div>
            <p className="text-[13.5px] leading-relaxed text-neutral-700">
              {response.summary}
            </p>
          </div>

          {/* Reasoning */}
          <div className="mb-5">
            <div className="mb-2 text-[11px] font-medium uppercase tracking-wider text-neutral-400">
              Detailed Reasoning
            </div>
            <p className="text-[13.5px] leading-relaxed text-neutral-600">
              {response.reasoning}
            </p>
          </div>

          {/* Citations */}
          <div>
            <div className="mb-3 text-[11px] font-medium uppercase tracking-wider text-neutral-400">
              Evidence & Citations
            </div>
            <div className="space-y-3">
              {response.citations.map((c, i) => (
                <div
                  key={i}
                  className="rounded-lg border border-neutral-200 bg-neutral-50 p-3"
                >
                  <div className="mb-1.5 flex items-center gap-2 text-[11px] text-neutral-400">
                    <Quote size={12} />
                    <span className="font-medium text-neutral-500">
                      {c.source}
                    </span>
                    <span>· {c.date}</span>
                  </div>
                  <p className="text-[12.5px] italic leading-relaxed text-neutral-600">
                    &ldquo;{c.snippet}&rdquo;
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ThemeDrawer({
  theme,
  responses,
  onClose,
  onSelectEmployee,
}: {
  theme: Theme;
  responses: EmployeeResponse[];
  onClose: () => void;
  onSelectEmployee: (r: EmployeeResponse) => void;
}) {
  const themeEmployees = responses.filter((r) =>
    theme.employeeIds.includes(r.employee.id)
  );

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/20" onClick={onClose} />
      <div className="animate-slide-in-right relative z-10 flex h-full w-full max-w-lg flex-col bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-neutral-200 px-6 py-4">
          <div>
            <span
              className={`mb-1 inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${STANCE_BG[theme.dominantStance]}`}
            >
              {STANCE_LABELS[theme.dominantStance]}
            </span>
            <h3 className="text-[15px] font-semibold text-neutral-900">
              {theme.label}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600"
          >
            <X size={18} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5">
          <p className="mb-5 text-[13.5px] leading-relaxed text-neutral-600">
            {theme.description}
          </p>
          <div className="mb-3 text-[11px] font-medium uppercase tracking-wider text-neutral-400">
            Employees in this theme ({themeEmployees.length})
          </div>
          <div className="space-y-3">
            {themeEmployees.map((r, i) => (
              <button
                key={r.employee.id}
                onClick={() => {
                  onClose();
                  setTimeout(() => onSelectEmployee(r), 100);
                }}
                className="w-full rounded-lg border border-neutral-200 bg-neutral-50 p-3 text-left transition-colors hover:bg-neutral-100"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[13px] font-medium text-neutral-800">
                    {r.employee.name}
                  </span>
                  <span
                    className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${STANCE_BG[r.stance]}`}
                  >
                    {STANCE_LABELS[r.stance]}
                  </span>
                </div>
                <p className="mt-1 text-[12px] text-neutral-500">
                  {r.summary}
                </p>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function SkeletonCards({ count }: { count: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="rounded-xl border border-neutral-200 bg-white p-4"
        >
          <div className="flex items-start gap-3">
            <div className="skeleton h-9 w-9 rounded-full" />
            <div className="flex-1 space-y-2">
              <div className="skeleton h-4 w-1/3" />
              <div className="skeleton h-3 w-full" />
              <div className="skeleton h-3 w-2/3" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ============================================
// Main InsightsView
// ============================================

interface InsightsViewProps {
  demoTrigger: number;
}

export function InsightsView({ demoTrigger }: InsightsViewProps) {
  // ---- State ----
  const [query, setQuery] = useState("");
  const [stage, setStage] = useState<StreamStage>("idle");
  const [plan, setPlan] = useState<QueryPlan | null>(null);
  const [responses, setResponses] = useState<EmployeeResponse[]>([]);
  const [aggregation, setAggregation] = useState<AggregationResult | null>(
    null
  );
  const [filters, setFilters] = useState<InsightsFilters>({
    teams: [],
    scenario: null,
  });
  const [previousAggregation, setPreviousAggregation] =
    useState<AggregationResult | null>(null);
  const [previousThemeCounts, setPreviousThemeCounts] = useState<
    Record<string, number>
  >({});
  const [selectedEmployee, setSelectedEmployee] =
    useState<EmployeeResponse | null>(null);
  const [selectedTheme, setSelectedTheme] = useState<Theme | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const responsesEndRef = useRef<HTMLDivElement>(null);

  // ---- Run query ----
  const runQuery = useCallback(
    async (q: string, f: InsightsFilters) => {
      if (abortRef.current) abortRef.current.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      // Store previous results for delta
      if (aggregation) {
        setPreviousAggregation(aggregation);
        const counts: Record<string, number> = {};
        aggregation.themes.forEach((t) => (counts[t.id] = t.count));
        setPreviousThemeCounts(counts);
      }

      setIsRunning(true);
      setResponses([]);
      setAggregation(null);
      setStage("idle");
      setPlan(null);

      try {
        const stream = streamInsightsQuery(q, f, controller.signal);
        for await (const event of stream) {
          switch (event.type) {
            case "stage":
              setStage(event.stage);
              break;
            case "plan":
              setPlan(event.plan);
              break;
            case "employee_response":
              setResponses((prev) => [...prev, event.response]);
              break;
            case "aggregation":
              setAggregation(event.data);
              break;
          }
        }
      } catch {
        // aborted
      }
      setIsRunning(false);
    },
    [aggregation]
  );

  // ---- Submit handler ----
  const handleSubmit = useCallback(
    (e?: FormEvent) => {
      e?.preventDefault();
      if (!query.trim() || isRunning) return;
      setPreviousAggregation(null);
      setPreviousThemeCounts({});
      runQuery(query, filters);
    },
    [query, filters, isRunning, runQuery]
  );

  // ---- Filter change → rerun ----
  const handleFilterChange = useCallback(
    (newFilters: InsightsFilters) => {
      setFilters(newFilters);
      if (query.trim() && stage === "complete") {
        runQuery(query, newFilters);
      }
    },
    [query, stage, runQuery]
  );

  // ---- Demo trigger ----
  useEffect(() => {
    if (demoTrigger > 0) {
      const demoQuery =
        "If we discontinue Meridian Analytics, what will employees think?";
      setQuery(demoQuery);
      setPreviousAggregation(null);
      setPreviousThemeCounts({});
      setFilters({ teams: [], scenario: null });
      // Short delay so UI updates before streaming starts
      setTimeout(() => {
        runQuery(demoQuery, { teams: [], scenario: null });
      }, 100);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [demoTrigger]);

  // Auto-scroll to latest responses
  useEffect(() => {
    responsesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [responses.length]);

  const showDelta = previousAggregation != null && aggregation != null;

  return (
    <div className="flex h-full">
      {/* ---- Left Panel ---- */}
      <div className="flex w-[380px] flex-shrink-0 flex-col border-r border-neutral-200 bg-white">
        {/* Header */}
        <div className="border-b border-neutral-200 px-5 py-4">
          <h2 className="text-[15px] font-semibold text-neutral-900">
            Management Insights
          </h2>
          <p className="mt-0.5 text-[12.5px] text-neutral-500">
            Ask a question to query employee digital twins
          </p>
        </div>

        {/* Query input */}
        <form onSubmit={handleSubmit} className="border-b border-neutral-200 p-4">
          <textarea
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="e.g. If we discontinue Product X, what will employees think?"
            rows={3}
            className="mb-3 w-full resize-none rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2.5 text-[13.5px] text-neutral-800 placeholder:text-neutral-400 focus:border-indigo-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-100"
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleSubmit();
            }}
          />
          <button
            type="submit"
            disabled={!query.trim() || isRunning}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-neutral-900 px-4 py-2 text-[13px] font-medium text-white transition-colors hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isRunning ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Play size={14} />
            )}
            {isRunning ? "Analyzing…" : "Run Analysis"}
          </button>
        </form>

        {/* Stage indicator */}
        {stage !== "idle" && (
          <div className="border-b border-neutral-200 px-4 py-3">
            <StageIndicator stage={stage} />
          </div>
        )}

        {/* Filters */}
        {stage !== "idle" && (
          <div className="border-b border-neutral-200 px-4 py-3">
            <div className="mb-2 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-neutral-400">
              <Filter size={11} />
              Filters
            </div>

            {/* Team filter */}
            <div className="mb-3">
              <label className="mb-1 block text-[12px] text-neutral-500">
                Teams
              </label>
              <div className="flex flex-wrap gap-1.5">
                {ALL_TEAMS.map((team) => {
                  const active = filters.teams.includes(team);
                  return (
                    <button
                      key={team}
                      onClick={() => {
                        const newTeams = active
                          ? filters.teams.filter((t) => t !== team)
                          : [...filters.teams, team];
                        handleFilterChange({ ...filters, teams: newTeams });
                      }}
                      disabled={isRunning}
                      className={`rounded-md px-2 py-1 text-[11.5px] font-medium transition-colors ${
                        active
                          ? "bg-indigo-100 text-indigo-700"
                          : "bg-neutral-100 text-neutral-500 hover:bg-neutral-200"
                      }`}
                    >
                      {team}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Scenario */}
            <div>
              <label className="mb-1 block text-[12px] text-neutral-500">
                Scenario
              </label>
              <div className="flex flex-col gap-1.5">
                {SCENARIOS.map((s) => {
                  const active = filters.scenario === s.id;
                  return (
                    <button
                      key={s.id ?? "base"}
                      onClick={() =>
                        handleFilterChange({ ...filters, scenario: s.id })
                      }
                      disabled={isRunning}
                      className={`rounded-md px-2.5 py-1.5 text-left text-[12px] font-medium transition-colors ${
                        active
                          ? "bg-indigo-100 text-indigo-700"
                          : "bg-neutral-100 text-neutral-500 hover:bg-neutral-200"
                      }`}
                    >
                      {s.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Plan */}
        {plan && (
          <div className="flex-1 overflow-y-auto px-4 py-3">
            <div className="mb-2 text-[11px] font-medium uppercase tracking-wider text-neutral-400">
              Query Plan
            </div>
            <div className="space-y-1.5">
              {plan.steps.map((step, i) => (
                <div
                  key={i}
                  className="flex items-start gap-2 text-[12.5px] text-neutral-600"
                >
                  <span className="mt-0.5 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full bg-neutral-200 text-[10px] font-medium text-neutral-500">
                    {i + 1}
                  </span>
                  {step}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ---- Right Panel ---- */}
      <div className="flex-1 overflow-y-auto bg-neutral-50/50 px-6 py-5">
        {stage === "idle" ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-neutral-100">
              <Search size={24} className="text-neutral-400" />
            </div>
            <h3 className="mb-1 text-[15px] font-medium text-neutral-600">
              Ask a management question
            </h3>
            <p className="max-w-sm text-[13px] text-neutral-400">
              OrgPulse will query employee digital twins, aggregate sentiment,
              and surface key themes with evidence.
            </p>
          </div>
        ) : (
          <div className="mx-auto max-w-3xl">
            {/* Aggregation Summary */}
            {aggregation && (
              <div className="animate-fade-in mb-6 rounded-xl border border-neutral-200 bg-white p-5">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-[14px] font-semibold text-neutral-800">
                    Population Sentiment
                  </h3>
                  <div className="flex items-center gap-2 text-[12px] text-neutral-400">
                    <Users size={13} />
                    {aggregation.totalResponses} responses
                    <span className="text-neutral-300">·</span>
                    <span>
                      {Math.round(aggregation.overallConfidence * 100)}%
                      confidence
                    </span>
                  </div>
                </div>

                <StanceBar
                  distribution={aggregation.distribution}
                  previous={showDelta ? previousAggregation?.distribution : null}
                  animated={showDelta}
                />

                {/* Delta summary */}
                {showDelta && (
                  <div className="mt-4 flex items-start gap-2 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2.5">
                    <RotateCcw
                      size={14}
                      className="mt-0.5 flex-shrink-0 text-indigo-500"
                    />
                    <div>
                      <p className="text-[12.5px] font-medium text-indigo-800">
                        What changed
                      </p>
                      <p className="text-[12px] text-indigo-600">
                        {(() => {
                          const sd =
                            aggregation.distribution.support -
                            (previousAggregation?.distribution.support ?? 0);
                          const od =
                            aggregation.distribution.oppose -
                            (previousAggregation?.distribution.oppose ?? 0);
                          const parts: string[] = [];
                          if (sd > 0)
                            parts.push(`Support increased by ${sd}pp`);
                          if (sd < 0)
                            parts.push(
                              `Support decreased by ${Math.abs(sd)}pp`
                            );
                          if (od < 0)
                            parts.push(
                              `Opposition decreased by ${Math.abs(od)}pp`
                            );
                          if (od > 0)
                            parts.push(`Opposition increased by ${od}pp`);
                          return parts.join(". ") + ".";
                        })()}
                      </p>
                    </div>
                  </div>
                )}

                {/* Summary text */}
                <p className="mt-3 text-[12.5px] leading-relaxed text-neutral-500">
                  {aggregation.summary}
                </p>
              </div>
            )}

            {/* Themes */}
            {aggregation && aggregation.themes.length > 0 && (
              <div className="animate-fade-in mb-6">
                <h3 className="mb-3 text-[14px] font-semibold text-neutral-800">
                  Key Themes
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  {aggregation.themes.map((theme) => (
                    <ThemeCard
                      key={theme.id}
                      theme={theme}
                      onClick={() => setSelectedTheme(theme)}
                      previousCount={previousThemeCounts[theme.id]}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Loading skeleton while querying */}
            {stage === "querying" && responses.length === 0 && (
              <SkeletonCards count={3} />
            )}

            {/* Employee Responses */}
            {responses.length > 0 && (
              <div>
                <h3 className="mb-3 text-[14px] font-semibold text-neutral-800">
                  Individual Responses
                  <span className="ml-2 text-[12px] font-normal text-neutral-400">
                    {responses.length}
                    {stage === "querying" ? "…" : ""}
                  </span>
                </h3>
                <div className="space-y-3">
                  {responses.map((r, i) => (
                    <EmployeeCard
                      key={r.employee.id}
                      response={r}
                      onClick={() => setSelectedEmployee(r)}
                      index={i}
                    />
                  ))}
                </div>
                <div ref={responsesEndRef} />
              </div>
            )}

            {/* Querying skeleton below existing responses */}
            {stage === "querying" && responses.length > 0 && (
              <div className="mt-3">
                <SkeletonCards count={2} />
              </div>
            )}
          </div>
        )}
      </div>

      {/* ---- Drawers ---- */}
      {selectedEmployee && (
        <DetailDrawer
          response={selectedEmployee}
          onClose={() => setSelectedEmployee(null)}
        />
      )}
      {selectedTheme && (
        <ThemeDrawer
          theme={selectedTheme}
          responses={responses}
          onClose={() => setSelectedTheme(null)}
          onSelectEmployee={(r) => setSelectedEmployee(r)}
        />
      )}
    </div>
  );
}
