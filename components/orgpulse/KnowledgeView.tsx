"use client";

import { useState, useEffect, useCallback, type FormEvent } from "react";
import {
  Search,
  X,
  FileText,
  Users2,
  Clock,
  AlertTriangle,
  Link2,
  BookOpen,
  Brain,
  UserMinus,
  Loader2,
  Quote,
  Tag,
  Calendar,
  ExternalLink,
  CircleDot,
  ChevronDown,
} from "lucide-react";
import {
  getOnboardingOptions,
  generateOnboardingBrief,
  searchMemories,
  getOffboardingEmployees,
  generateHandoffPack,
} from "@/lib/orgpulse/api";
import type {
  OnboardingBrief,
  MemoryItem,
  MemoryType,
  HandoffPack,
  Employee,
} from "@/lib/orgpulse/types";

// ---- Constants ----

type KnowledgeTab = "onboarding" | "memory" | "offboarding";

const SEVERITY_COLORS = {
  low: "bg-blue-50 text-blue-700 border-blue-200",
  medium: "bg-amber-50 text-amber-700 border-amber-200",
  high: "bg-red-50 text-red-700 border-red-200",
};

const PRIORITY_COLORS = {
  low: "bg-neutral-100 text-neutral-600",
  medium: "bg-amber-50 text-amber-700",
  high: "bg-orange-50 text-orange-700",
  critical: "bg-red-50 text-red-700",
};

const STATUS_COLORS: Record<string, string> = {
  active: "bg-emerald-50 text-emerald-700",
  transitioning: "bg-amber-50 text-amber-700",
  "needs-owner": "bg-red-50 text-red-700",
};

// ============================================
// ONBOARDING TAB
// ============================================

function OnboardingTab({ autoTrigger }: { autoTrigger: number }) {
  const options = getOnboardingOptions();
  const [selectedRole, setSelectedRole] = useState("");
  const [selectedTeam, setSelectedTeam] = useState("");
  const [brief, setBrief] = useState<OnboardingBrief | null>(null);
  const [loading, setLoading] = useState(false);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  const handleGenerate = useCallback(async () => {
    if (!selectedRole || !selectedTeam) return;
    setLoading(true);
    setBrief(null);
    const result = await generateOnboardingBrief(selectedRole, selectedTeam);
    setBrief(result);
    setLoading(false);
  }, [selectedRole, selectedTeam]);

  useEffect(() => {
    if (autoTrigger > 0) {
      setSelectedRole("Senior Product Manager");
      setSelectedTeam("AI Platform");
      setTimeout(async () => {
        setLoading(true);
        const result = await generateOnboardingBrief(
          "Senior Product Manager",
          "AI Platform"
        );
        setBrief(result);
        setLoading(false);
      }, 200);
    }
  }, [autoTrigger]);

  const SectionHeader = ({
    title,
    icon,
    id,
    count,
  }: {
    title: string;
    icon: React.ReactNode;
    id: string;
    count: number;
  }) => (
    <button
      onClick={() => setExpandedSection(expandedSection === id ? null : id)}
      className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-neutral-50"
    >
      <div className="flex items-center gap-2">
        <span className="text-neutral-400">{icon}</span>
        <span className="text-[13.5px] font-semibold text-neutral-800">
          {title}
        </span>
        <span className="rounded-full bg-neutral-100 px-1.5 py-0.5 text-[11px] font-medium text-neutral-500">
          {count}
        </span>
      </div>
      <ChevronDown
        size={14}
        className={`text-neutral-400 transition-transform ${
          expandedSection === id ? "rotate-180" : ""
        }`}
      />
    </button>
  );

  return (
    <div className="h-full overflow-y-auto">
      {/* Selector */}
      <div className="border-b border-neutral-200 px-6 py-5">
        <h3 className="mb-1 text-[15px] font-semibold text-neutral-900">
          Onboarding Brief Generator
        </h3>
        <p className="mb-4 text-[12.5px] text-neutral-500">
          Select a role and team to generate a contextual onboarding brief
        </p>
        <div className="flex items-end gap-3">
          <div className="flex-1">
            <label className="mb-1 block text-[12px] font-medium text-neutral-500">
              Role
            </label>
            <select
              value={selectedRole}
              onChange={(e) => {
                setSelectedRole(e.target.value);
                const match = options.find((o) => o.role === e.target.value);
                if (match) setSelectedTeam(match.team);
              }}
              className="w-full rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-[13px] text-neutral-700 focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-100"
            >
              <option value="">Select role…</option>
              {options.map((o) => (
                <option key={o.role} value={o.role}>
                  {o.role}
                </option>
              ))}
            </select>
          </div>
          <div className="flex-1">
            <label className="mb-1 block text-[12px] font-medium text-neutral-500">
              Team
            </label>
            <input
              value={selectedTeam}
              onChange={(e) => setSelectedTeam(e.target.value)}
              placeholder="Team"
              className="w-full rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-[13px] text-neutral-700 focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-100"
            />
          </div>
          <button
            onClick={handleGenerate}
            disabled={!selectedRole || !selectedTeam || loading}
            className="flex items-center gap-2 rounded-lg bg-neutral-900 px-4 py-2 text-[13px] font-medium text-white transition-colors hover:bg-neutral-800 disabled:opacity-40"
          >
            {loading ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <FileText size={14} />
            )}
            Generate
          </button>
        </div>
      </div>

      {/* Loading */}
      {loading && !brief && (
        <div className="flex items-center justify-center py-16">
          <div className="flex items-center gap-3 text-[13px] text-neutral-500">
            <Loader2 size={18} className="animate-spin text-indigo-500" />
            Generating onboarding brief…
          </div>
        </div>
      )}

      {/* Brief content */}
      {brief && (
        <div className="animate-fade-in px-6 py-5">
          <div className="mb-5 rounded-xl border border-neutral-200 bg-white p-5">
            <div className="mb-1 text-[11px] font-medium uppercase tracking-wider text-neutral-400">
              Onboarding Brief
            </div>
            <h3 className="text-[16px] font-semibold text-neutral-900">
              {brief.role}, {brief.team}
            </h3>
          </div>

          {/* Key Context */}
          <div className="mb-4 rounded-xl border border-neutral-200 bg-white">
            <SectionHeader
              title="Key Context"
              icon={<BookOpen size={15} />}
              id="context"
              count={brief.keyContext.length}
            />
            {(expandedSection === "context" || expandedSection === null) && (
              <div className="px-3 pb-3">
                <div className="space-y-2 pl-2">
                  {brief.keyContext.map((item, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-2 text-[12.5px] leading-relaxed text-neutral-600"
                    >
                      <CircleDot
                        size={10}
                        className="mt-1.5 flex-shrink-0 text-neutral-300"
                      />
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Key People */}
          <div className="mb-4 rounded-xl border border-neutral-200 bg-white">
            <SectionHeader
              title="Key People"
              icon={<Users2 size={15} />}
              id="people"
              count={brief.keyPeople.length}
            />
            {(expandedSection === "people" || expandedSection === null) && (
              <div className="px-3 pb-3">
                <div className="space-y-2">
                  {brief.keyPeople.map((person, i) => (
                    <div
                      key={i}
                      className="rounded-lg border border-neutral-100 bg-neutral-50 p-3"
                    >
                      <div className="mb-1 flex items-center justify-between">
                        <span className="text-[13px] font-medium text-neutral-800">
                          {person.name}
                        </span>
                        <span className="text-[11px] text-neutral-400">
                          {person.role}
                        </span>
                      </div>
                      <p className="mb-1 text-[12px] text-neutral-500">
                        {person.relationship}
                      </p>
                      <p className="text-[12px] italic text-indigo-600">
                        💡 {person.tip}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Key Docs */}
          <div className="mb-4 rounded-xl border border-neutral-200 bg-white">
            <SectionHeader
              title="Key Documents"
              icon={<FileText size={15} />}
              id="docs"
              count={brief.keyDocs.length}
            />
            {(expandedSection === "docs" || expandedSection === null) && (
              <div className="px-3 pb-3">
                <div className="space-y-2">
                  {brief.keyDocs.map((doc, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between rounded-lg border border-neutral-100 bg-neutral-50 p-3"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[13px] font-medium text-neutral-800">
                            {doc.title}
                          </span>
                          <span className="rounded bg-neutral-200 px-1.5 py-0.5 text-[10px] font-medium text-neutral-500">
                            {doc.type}
                          </span>
                        </div>
                        <p className="mt-0.5 text-[12px] text-neutral-500">
                          {doc.relevance}
                        </p>
                      </div>
                      <ExternalLink
                        size={14}
                        className="flex-shrink-0 text-neutral-300"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Decisions */}
          <div className="mb-4 rounded-xl border border-neutral-200 bg-white">
            <SectionHeader
              title="Recent Decisions"
              icon={<Calendar size={15} />}
              id="decisions"
              count={brief.decisions.length}
            />
            {expandedSection === "decisions" && (
              <div className="px-3 pb-3">
                <div className="space-y-2">
                  {brief.decisions.map((d, i) => (
                    <div
                      key={i}
                      className="rounded-lg border border-neutral-100 bg-neutral-50 p-3"
                    >
                      <div className="mb-1 flex items-center gap-2">
                        <span className="rounded bg-neutral-200 px-1.5 py-0.5 text-[10px] font-medium text-neutral-500">
                          {d.date}
                        </span>
                      </div>
                      <p className="mb-1 text-[13px] font-medium text-neutral-800">
                        {d.decision}
                      </p>
                      <p className="mb-1 text-[12px] text-neutral-500">
                        {d.rationale}
                      </p>
                      <p className="text-[11px] text-neutral-400">
                        Participants: {d.participants.join(", ")}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Risks */}
          <div className="mb-4 rounded-xl border border-neutral-200 bg-white">
            <SectionHeader
              title="Risks & Landmines"
              icon={<AlertTriangle size={15} />}
              id="risks"
              count={brief.risks.length}
            />
            {expandedSection === "risks" && (
              <div className="px-3 pb-3">
                <div className="space-y-2">
                  {brief.risks.map((r, i) => (
                    <div
                      key={i}
                      className="rounded-lg border border-neutral-100 bg-neutral-50 p-3"
                    >
                      <div className="mb-1 flex items-center gap-2">
                        <span
                          className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase ${
                            SEVERITY_COLORS[r.severity]
                          }`}
                        >
                          {r.severity}
                        </span>
                      </div>
                      <p className="mb-1 text-[13px] font-medium text-neutral-800">
                        {r.risk}
                      </p>
                      <p className="text-[12px] text-neutral-500">
                        {r.context}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================
// MEMORY EXPLORER TAB
// ============================================

function MemoryTab() {
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<MemoryType | "all">("all");
  const [results, setResults] = useState<MemoryItem[]>([]);
  const [selectedMemory, setSelectedMemory] = useState<MemoryItem | null>(null);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const doSearch = useCallback(async (q: string, t: MemoryType | "all") => {
    setLoading(true);
    const items = await searchMemories(q, t);
    setResults(items);
    setLoading(false);
    setHasSearched(true);
  }, []);

  useEffect(() => {
    doSearch("", "all");
  }, [doSearch]);

  const handleSearch = (e: FormEvent) => {
    e.preventDefault();
    doSearch(query, typeFilter);
  };

  return (
    <div className="flex h-full">
      {/* Results list */}
      <div className="flex flex-1 flex-col border-r border-neutral-200">
        {/* Search */}
        <form
          onSubmit={handleSearch}
          className="border-b border-neutral-200 px-5 py-4"
        >
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400"
              />
              <input
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  doSearch(e.target.value, typeFilter);
                }}
                placeholder="Search organizational memory…"
                className="w-full rounded-lg border border-neutral-200 bg-neutral-50 py-2 pl-9 pr-3 text-[13px] text-neutral-700 placeholder:text-neutral-400 focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-100"
              />
            </div>
          </div>
          <div className="mt-2.5 flex gap-1.5">
            {(["all", "episodic", "semantic"] as const).map((t) => {
              const active = typeFilter === t;
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => {
                    setTypeFilter(t);
                    doSearch(query, t);
                  }}
                  className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[11.5px] font-medium transition-colors ${
                    active
                      ? "bg-indigo-100 text-indigo-700"
                      : "bg-neutral-100 text-neutral-500 hover:bg-neutral-200"
                  }`}
                >
                  {t === "episodic" ? (
                    <Clock size={11} />
                  ) : t === "semantic" ? (
                    <Brain size={11} />
                  ) : null}
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </button>
              );
            })}
          </div>
        </form>

        {/* Results */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12 text-[13px] text-neutral-400">
              <Loader2 size={16} className="mr-2 animate-spin" />
              Searching…
            </div>
          ) : results.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Search size={20} className="mb-2 text-neutral-300" />
              <p className="text-[13px] text-neutral-400">
                {hasSearched
                  ? "No memories found"
                  : "Search organizational memory"}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-neutral-100">
              {results.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setSelectedMemory(item)}
                  className={`w-full px-5 py-3 text-left transition-colors hover:bg-neutral-50 ${
                    selectedMemory?.id === item.id ? "bg-indigo-50/50" : ""
                  }`}
                >
                  <div className="mb-1 flex items-center gap-2">
                    {item.type === "episodic" ? (
                      <Clock size={12} className="text-indigo-400" />
                    ) : (
                      <Brain size={12} className="text-violet-400" />
                    )}
                    <span className="text-[13px] font-medium text-neutral-800">
                      {item.title}
                    </span>
                  </div>
                  <p className="mb-1.5 line-clamp-2 text-[12px] leading-relaxed text-neutral-500">
                    {item.content.slice(0, 120)}…
                  </p>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-neutral-400">
                      {new Date(item.timestamp).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </span>
                    <span className="text-neutral-200">·</span>
                    <div className="flex gap-1">
                      {item.tags.slice(0, 3).map((tag) => (
                        <span
                          key={tag}
                          className="rounded bg-neutral-100 px-1.5 py-0.5 text-[10px] text-neutral-500"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Detail panel */}
      <div className="w-[420px] flex-shrink-0 overflow-y-auto bg-white">
        {selectedMemory ? (
          <div className="animate-fade-in px-5 py-5">
            <div className="mb-4 flex items-start justify-between">
              <div>
                <div className="mb-1 flex items-center gap-2">
                  {selectedMemory.type === "episodic" ? (
                    <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] font-medium text-indigo-600">
                      Episodic
                    </span>
                  ) : (
                    <span className="rounded-full bg-violet-50 px-2 py-0.5 text-[11px] font-medium text-violet-600">
                      Semantic
                    </span>
                  )}
                  <span className="text-[11px] text-neutral-400">
                    {selectedMemory.team}
                  </span>
                </div>
                <h3 className="text-[15px] font-semibold text-neutral-900">
                  {selectedMemory.title}
                </h3>
              </div>
              <button
                onClick={() => setSelectedMemory(null)}
                className="rounded-lg p-1 text-neutral-400 hover:bg-neutral-100"
              >
                <X size={16} />
              </button>
            </div>

            <div className="mb-4 flex items-center gap-2 text-[12px] text-neutral-400">
              <Calendar size={12} />
              {new Date(selectedMemory.timestamp).toLocaleDateString("en-US", {
                weekday: "long",
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </div>

            {/* Tags */}
            <div className="mb-4 flex flex-wrap gap-1.5">
              {selectedMemory.tags.map((tag) => (
                <span
                  key={tag}
                  className="flex items-center gap-1 rounded-md bg-neutral-100 px-2 py-1 text-[11px] font-medium text-neutral-500"
                >
                  <Tag size={10} />
                  {tag}
                </span>
              ))}
            </div>

            {/* Content */}
            <div className="mb-5 whitespace-pre-line text-[13px] leading-relaxed text-neutral-600">
              {selectedMemory.content}
            </div>

            {/* Citations */}
            {selectedMemory.citations.length > 0 && (
              <div>
                <div className="mb-2 text-[11px] font-medium uppercase tracking-wider text-neutral-400">
                  Sources
                </div>
                <div className="space-y-2">
                  {selectedMemory.citations.map((c, i) => (
                    <div
                      key={i}
                      className="rounded-lg border border-neutral-200 bg-neutral-50 p-3"
                    >
                      <div className="mb-1 flex items-center gap-2 text-[11px] text-neutral-400">
                        <Quote size={11} />
                        <span className="font-medium text-neutral-500">
                          {c.source}
                        </span>
                        <span>· {c.date}</span>
                      </div>
                      <p className="text-[12px] italic text-neutral-600">
                        &ldquo;{c.snippet}&rdquo;
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <Brain size={24} className="mb-3 text-neutral-300" />
            <p className="text-[13px] text-neutral-400">
              Select a memory to view details
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================
// OFFBOARDING TAB
// ============================================

function OffboardingTab({ autoTrigger }: { autoTrigger: number }) {
  const offboardingEmployees = getOffboardingEmployees();
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(
    null
  );
  const [pack, setPack] = useState<HandoffPack | null>(null);
  const [loading, setLoading] = useState(false);

  const handleGenerate = useCallback(async (emp: Employee) => {
    setSelectedEmployee(emp);
    setLoading(true);
    setPack(null);
    const result = await generateHandoffPack(emp.id);
    setPack(result);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (autoTrigger > 0 && offboardingEmployees.length > 0) {
      handleGenerate(offboardingEmployees[0]);
    }
  }, [autoTrigger, handleGenerate, offboardingEmployees]);

  return (
    <div className="h-full overflow-y-auto">
      {/* Employee selector */}
      <div className="border-b border-neutral-200 px-6 py-5">
        <h3 className="mb-1 text-[15px] font-semibold text-neutral-900">
          Offboarding Handoff Pack
        </h3>
        <p className="mb-4 text-[12.5px] text-neutral-500">
          Select a departing employee to generate their handoff documentation
        </p>
        <div className="flex gap-3">
          {offboardingEmployees.map((emp) => {
            const active = selectedEmployee?.id === emp.id;
            return (
              <button
                key={emp.id}
                onClick={() => handleGenerate(emp)}
                disabled={loading}
                className={`flex-1 rounded-xl border p-4 text-left transition-all ${
                  active
                    ? "border-indigo-300 bg-indigo-50/50 shadow-sm"
                    : "border-neutral-200 bg-white hover:border-neutral-300 hover:shadow-sm"
                }`}
              >
                <div className="mb-1 text-[13.5px] font-medium text-neutral-800">
                  {emp.name}
                </div>
                <p className="text-[12px] text-neutral-500">
                  {emp.role} · {emp.team}
                </p>
                <p className="mt-1 text-[11px] text-neutral-400">
                  {emp.tenure}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-16">
          <div className="flex items-center gap-3 text-[13px] text-neutral-500">
            <Loader2 size={18} className="animate-spin text-indigo-500" />
            Generating handoff pack…
          </div>
        </div>
      )}

      {/* Handoff pack */}
      {pack && !loading && (
        <div className="animate-fade-in px-6 py-5">
          {/* Summary bullets */}
          <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50/50 p-5">
            <div className="mb-3 flex items-center gap-2 text-[13px] font-semibold text-amber-800">
              <AlertTriangle size={15} />
              What the next owner must know
            </div>
            <div className="space-y-2">
              {pack.summaryBullets.map((bullet, i) => (
                <div
                  key={i}
                  className="flex items-start gap-2 text-[12.5px] leading-relaxed text-amber-900/80"
                >
                  <CircleDot
                    size={10}
                    className="mt-1.5 flex-shrink-0 text-amber-400"
                  />
                  {bullet}
                </div>
              ))}
            </div>
          </div>

          {/* Ownership areas */}
          <div className="mb-5">
            <h4 className="mb-3 text-[14px] font-semibold text-neutral-800">
              Ownership Areas
            </h4>
            <div className="space-y-3">
              {pack.ownershipAreas.map((area, i) => (
                <div
                  key={i}
                  className="rounded-xl border border-neutral-200 bg-white p-4"
                >
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-[13.5px] font-medium text-neutral-800">
                      {area.area}
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                        STATUS_COLORS[area.status] ||
                        "bg-neutral-100 text-neutral-600"
                      }`}
                    >
                      {area.status}
                    </span>
                  </div>
                  <p className="text-[12.5px] leading-relaxed text-neutral-500">
                    {area.description}
                  </p>
                  {area.suggestedOwner && (
                    <p className="mt-2 flex items-center gap-1.5 text-[12px] text-indigo-600">
                      <Users2 size={12} />
                      Suggested owner: {area.suggestedOwner}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Unresolved work */}
          <div className="mb-5">
            <h4 className="mb-3 text-[14px] font-semibold text-neutral-800">
              Unresolved Work
            </h4>
            <div className="space-y-3">
              {pack.unresolvedWork.map((item, i) => (
                <div
                  key={i}
                  className="rounded-xl border border-neutral-200 bg-white p-4"
                >
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-[13.5px] font-medium text-neutral-800">
                      {item.title}
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase ${
                        PRIORITY_COLORS[item.priority]
                      }`}
                    >
                      {item.priority}
                    </span>
                  </div>
                  <p className="text-[12.5px] leading-relaxed text-neutral-500">
                    {item.description}
                  </p>
                  {item.deadline && (
                    <p className="mt-2 flex items-center gap-1.5 text-[12px] text-neutral-400">
                      <Clock size={12} />
                      Due: {item.deadline}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Key links */}
          <div className="mb-5">
            <h4 className="mb-3 text-[14px] font-semibold text-neutral-800">
              Key Links & Resources
            </h4>
            <div className="grid grid-cols-2 gap-2">
              {pack.keyLinks.map((link, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 rounded-lg border border-neutral-200 bg-white p-3"
                >
                  <Link2 size={14} className="flex-shrink-0 text-neutral-400" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[12.5px] font-medium text-neutral-700">
                      {link.title}
                    </p>
                    <p className="text-[11px] text-neutral-400">
                      {link.category}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================
// Main KnowledgeView
// ============================================

const tabs: { id: KnowledgeTab; label: string; icon: React.ReactNode }[] = [
  { id: "onboarding", label: "Onboarding", icon: <BookOpen size={15} /> },
  { id: "memory", label: "Memory Explorer", icon: <Brain size={15} /> },
  { id: "offboarding", label: "Offboarding", icon: <UserMinus size={15} /> },
];

interface KnowledgeViewProps {
  demoTrigger: number;
}

export function KnowledgeView({ demoTrigger }: KnowledgeViewProps) {
  const [activeTab, setActiveTab] = useState<KnowledgeTab>("onboarding");

  return (
    <div className="flex h-full flex-col">
      {/* Tab bar */}
      <div className="flex items-center border-b border-neutral-200 bg-white px-5">
        {tabs.map((tab) => {
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 border-b-2 px-4 py-3 text-[13px] font-medium transition-colors ${
                active
                  ? "border-neutral-900 text-neutral-900"
                  : "border-transparent text-neutral-500 hover:text-neutral-700"
              }`}
            >
              <span className={active ? "text-neutral-700" : "text-neutral-400"}>
                {tab.icon}
              </span>
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === "onboarding" && (
          <OnboardingTab autoTrigger={demoTrigger} />
        )}
        {activeTab === "memory" && <MemoryTab />}
        {activeTab === "offboarding" && (
          <OffboardingTab autoTrigger={demoTrigger} />
        )}
      </div>
    </div>
  );
}
