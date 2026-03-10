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
  fetchOnboardingOptions,
  generateOnboardingBrief,
  searchMemories,
  getOffboardingEmployees,
  fetchOffboardingEmployees,
  generateHandoffPack,
} from "@/lib/edamame/api";
import type {
  OnboardingBrief,
  MemoryItem,
  MemoryType,
  HandoffPack,
  Employee,
} from "@/lib/edamame/types";

// ---- Constants ----

type KnowledgeTab = "onboarding" | "memory" | "offboarding";

const SEVERITY_COLORS = {
  low: "bg-[#3b82f620] text-[#60a5fa] border-[#3b82f630]",
  medium: "bg-[#f59e0b20] text-[#fbbf24] border-[#f59e0b30]",
  high: "bg-[#ef444420] text-[#f87171] border-[#ef444430]",
};

const PRIORITY_COLORS = {
  low: "bg-[#1e1e22] text-[#a1a1aa]",
  medium: "bg-[#f59e0b20] text-[#fbbf24]",
  high: "bg-[#fb923c20] text-[#fb923c]",
  critical: "bg-[#ef444420] text-[#f87171]",
};

const STATUS_COLORS: Record<string, string> = {
  active: "bg-[#10b98120] text-[#34d399]",
  transitioning: "bg-[#f59e0b20] text-[#fbbf24]",
  "needs-owner": "bg-[#ef444420] text-[#f87171]",
};

// ============================================
// ONBOARDING TAB
// ============================================

function OnboardingTab({ autoTrigger }: { autoTrigger: number }) {
  const [options, setOptions] = useState(getOnboardingOptions());
  const [selectedRole, setSelectedRole] = useState("");
  const [selectedTeam, setSelectedTeam] = useState("");
  const [brief, setBrief] = useState<OnboardingBrief | null>(null);
  const [loading, setLoading] = useState(false);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  // Fetch real onboarding options from Supabase on mount
  useEffect(() => {
    fetchOnboardingOptions().then((opts) => setOptions(opts));
  }, []);

  const handleGenerate = useCallback(async () => {
    if (!selectedRole || !selectedTeam) return;
    setLoading(true);
    setBrief(null);
    const result = await generateOnboardingBrief(selectedRole, selectedTeam);
    setBrief(result);
    setLoading(false);
  }, [selectedRole, selectedTeam]);

  useEffect(() => {
    if (autoTrigger > 0 && options.length > 0) {
      const firstOption = options[0];
      setSelectedRole(firstOption.role);
      setSelectedTeam(firstOption.team);
      setTimeout(async () => {
        setLoading(true);
        const result = await generateOnboardingBrief(
          firstOption.role,
          firstOption.team
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
      className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-[#19191d]"
    >
      <div className="flex items-center gap-2">
        <span className="text-[#52525b]">{icon}</span>
        <span className="text-[13.5px] font-semibold text-[#ededed]">
          {title}
        </span>
        <span className="rounded-full bg-[#1e1e22] px-1.5 py-0.5 text-[11px] font-medium text-[#71717a]">
          {count}
        </span>
      </div>
      <ChevronDown
        size={14}
        className={`text-[#52525b] transition-transform ${
          expandedSection === id ? "rotate-180" : ""
        }`}
      />
    </button>
  );

  return (
    <div className="h-full overflow-y-auto">
      {/* Selector */}
      <div className="border-b border-[#1e1e22] px-6 py-5">
        <h3 className="mb-1 text-[15px] font-semibold text-[#ededed]">
          Onboarding Brief Generator
        </h3>
        <p className="mb-4 text-[12.5px] text-[#71717a]">
          Select a role and team to generate a contextual onboarding brief
        </p>
        <div className="flex items-end gap-3">
          <div className="flex-1">
            <label className="mb-1 block text-[12px] font-medium text-[#71717a]">
              Role
            </label>
            <select
              value={selectedRole}
              onChange={(e) => {
                setSelectedRole(e.target.value);
                const match = options.find((o) => o.role === e.target.value);
                if (match) setSelectedTeam(match.team);
              }}
              className="w-full rounded-lg border border-[#1e1e22] bg-[#131316] px-3 py-2 text-[13px] text-[#ededed] focus:border-[#2a2a2e] focus:outline-none focus:ring-1 focus:ring-[#2a2a2e]"
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
            <label className="mb-1 block text-[12px] font-medium text-[#71717a]">
              Team
            </label>
            <input
              value={selectedTeam}
              onChange={(e) => setSelectedTeam(e.target.value)}
              placeholder="Team"
              className="w-full rounded-lg border border-[#1e1e22] bg-[#131316] px-3 py-2 text-[13px] text-[#ededed] focus:border-[#2a2a2e] focus:outline-none focus:ring-1 focus:ring-[#2a2a2e]"
            />
          </div>
          <button
            onClick={handleGenerate}
            disabled={!selectedRole || !selectedTeam || loading}
            className="flex items-center gap-2 rounded-lg bg-[#c4b5a0] px-4 py-2 text-[13px] font-medium text-[#0a0a0c] transition-colors hover:bg-[#d4c5b0] disabled:opacity-40"
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
          <div className="flex items-center gap-3 text-[13px] text-[#71717a]">
            <Loader2 size={18} className="animate-spin text-[#c4b5a0]" />
            Generating onboarding brief…
          </div>
        </div>
      )}

      {/* Brief content */}
      {brief && (
        <div className="animate-fade-in px-6 py-5">
          <div className="mb-5 rounded-xl border border-[#1e1e22] bg-[#131316] p-5">
            <div className="mb-1 text-[11px] font-medium uppercase tracking-wider text-[#52525b]">
              Onboarding Brief
            </div>
            <h3 className="text-[16px] font-semibold text-[#ededed]">
              {brief.role}, {brief.team}
            </h3>
          </div>

          {/* Key Context */}
          <div className="mb-4 rounded-xl border border-[#1e1e22] bg-[#131316]">
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
                      className="flex items-start gap-2 text-[12.5px] leading-relaxed text-[#a1a1aa]"
                    >
                      <CircleDot
                        size={10}
                        className="mt-1.5 flex-shrink-0 text-[#3f3f46]"
                      />
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Key People */}
          <div className="mb-4 rounded-xl border border-[#1e1e22] bg-[#131316]">
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
                      className="rounded-lg border border-[#1e1e22] bg-[#19191d] p-3"
                    >
                      <div className="mb-1 flex items-center justify-between">
                        <span className="text-[13px] font-medium text-[#d4d4d8]">
                          {person.name}
                        </span>
                        <span className="text-[11px] text-[#52525b]">
                          {person.role}
                        </span>
                      </div>
                      <p className="mb-1 text-[12px] text-[#71717a]">
                        {person.relationship}
                      </p>
                      <p className="text-[12px] italic text-[#c4b5a0]">
                        {person.tip}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Key Docs */}
          <div className="mb-4 rounded-xl border border-[#1e1e22] bg-[#131316]">
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
                      className="flex items-center justify-between rounded-lg border border-[#1e1e22] bg-[#19191d] p-3"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[13px] font-medium text-[#d4d4d8]">
                            {doc.title}
                          </span>
                          <span className="rounded bg-[#1e1e22] px-1.5 py-0.5 text-[10px] font-medium text-[#71717a]">
                            {doc.type}
                          </span>
                        </div>
                        <p className="mt-0.5 text-[12px] text-[#71717a]">
                          {doc.relevance}
                        </p>
                      </div>
                      <ExternalLink
                        size={14}
                        className="flex-shrink-0 text-[#3f3f46]"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Decisions */}
          <div className="mb-4 rounded-xl border border-[#1e1e22] bg-[#131316]">
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
                      className="rounded-lg border border-[#1e1e22] bg-[#19191d] p-3"
                    >
                      <div className="mb-1 flex items-center gap-2">
                        <span className="rounded bg-[#1e1e22] px-1.5 py-0.5 text-[10px] font-medium text-[#71717a]">
                          {d.date}
                        </span>
                      </div>
                      <p className="mb-1 text-[13px] font-medium text-[#d4d4d8]">
                        {d.decision}
                      </p>
                      <p className="mb-1 text-[12px] text-[#71717a]">
                        {d.rationale}
                      </p>
                      <p className="text-[11px] text-[#52525b]">
                        Participants: {d.participants.join(", ")}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Risks */}
          <div className="mb-4 rounded-xl border border-[#1e1e22] bg-[#131316]">
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
                      className="rounded-lg border border-[#1e1e22] bg-[#19191d] p-3"
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
                      <p className="mb-1 text-[13px] font-medium text-[#d4d4d8]">
                        {r.risk}
                      </p>
                      <p className="text-[12px] text-[#71717a]">
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
      <div className="flex flex-1 flex-col border-r border-[#1e1e22]">
        {/* Search */}
        <form
          onSubmit={handleSearch}
          className="border-b border-[#1e1e22] px-5 py-4"
        >
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-[#52525b]"
              />
              <input
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  doSearch(e.target.value, typeFilter);
                }}
                placeholder="Search organizational memory…"
                className="w-full rounded-lg border border-[#1e1e22] bg-[#131316] py-2 pl-9 pr-3 text-[13px] text-[#ededed] placeholder:text-[#52525b] focus:border-[#2a2a2e] focus:outline-none focus:ring-1 focus:ring-[#2a2a2e]"
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
                      ? "bg-[#c4b5a020] text-[#c4b5a0]"
                      : "bg-[#1e1e22] text-[#71717a] hover:bg-[#222226]"
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
            <div className="flex items-center justify-center py-12 text-[13px] text-[#52525b]">
              <Loader2 size={16} className="mr-2 animate-spin" />
              Searching…
            </div>
          ) : results.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Search size={20} className="mb-2 text-[#3f3f46]" />
              <p className="text-[13px] text-[#52525b]">
                {hasSearched
                  ? "No memories found"
                  : "Search organizational memory"}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-[#1e1e22]">
              {results.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setSelectedMemory(item)}
                  className={`w-full px-5 py-3 text-left transition-colors hover:bg-[#131316] ${
                    selectedMemory?.id === item.id ? "bg-[#19191d]" : ""
                  }`}
                >
                  <div className="mb-1 flex items-center gap-2">
                    {item.type === "episodic" ? (
                      <Clock size={12} className="text-[#818cf8]" />
                    ) : (
                      <Brain size={12} className="text-[#a78bfa]" />
                    )}
                    <span className="text-[13px] font-medium text-[#d4d4d8]">
                      {item.title}
                    </span>
                  </div>
                  <p className="mb-1.5 line-clamp-2 text-[12px] leading-relaxed text-[#71717a]">
                    {item.content.slice(0, 120)}…
                  </p>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-[#52525b]">
                      {new Date(item.timestamp).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </span>
                    <span className="text-[#3f3f46]">·</span>
                    <div className="flex gap-1">
                      {item.tags.slice(0, 3).map((tag) => (
                        <span
                          key={tag}
                          className="rounded bg-[#1e1e22] px-1.5 py-0.5 text-[10px] text-[#71717a]"
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
      <div className="w-[420px] flex-shrink-0 overflow-y-auto bg-[#0e0e11]">
        {selectedMemory ? (
          <div className="animate-fade-in px-5 py-5">
            <div className="mb-4 flex items-start justify-between">
              <div>
                <div className="mb-1 flex items-center gap-2">
                  {selectedMemory.type === "episodic" ? (
                    <span className="rounded-full bg-[#818cf820] px-2 py-0.5 text-[11px] font-medium text-[#818cf8]">
                      Episodic
                    </span>
                  ) : (
                    <span className="rounded-full bg-[#a78bfa20] px-2 py-0.5 text-[11px] font-medium text-[#a78bfa]">
                      Semantic
                    </span>
                  )}
                  <span className="text-[11px] text-[#52525b]">
                    {selectedMemory.team}
                  </span>
                </div>
                <h3 className="text-[15px] font-semibold text-[#ededed]">
                  {selectedMemory.title}
                </h3>
              </div>
              <button
                onClick={() => setSelectedMemory(null)}
                className="rounded-lg p-1 text-[#52525b] hover:bg-[#1e1e22]"
              >
                <X size={16} />
              </button>
            </div>

            <div className="mb-4 flex items-center gap-2 text-[12px] text-[#52525b]">
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
                  className="flex items-center gap-1 rounded-md bg-[#1e1e22] px-2 py-1 text-[11px] font-medium text-[#71717a]"
                >
                  <Tag size={10} />
                  {tag}
                </span>
              ))}
            </div>

            {/* Content */}
            <div className="mb-5 whitespace-pre-line text-[13px] leading-relaxed text-[#a1a1aa]">
              {selectedMemory.content}
            </div>

            {/* Citations */}
            {selectedMemory.citations.length > 0 && (
              <div>
                <div className="mb-2 text-[11px] font-medium uppercase tracking-wider text-[#52525b]">
                  Sources
                </div>
                <div className="space-y-2">
                  {selectedMemory.citations.map((c, i) => (
                    <div
                      key={i}
                      className="rounded-lg border border-[#1e1e22] bg-[#131316] p-3"
                    >
                      <div className="mb-1 flex items-center gap-2 text-[11px] text-[#52525b]">
                        <Quote size={11} />
                        <span className="font-medium text-[#71717a]">
                          {c.source}
                        </span>
                        <span>· {c.date}</span>
                      </div>
                      <p className="text-[12px] italic text-[#a1a1aa]">
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
            <Brain size={24} className="mb-3 text-[#3f3f46]" />
            <p className="text-[13px] text-[#52525b]">
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
  const [offboardingEmployees, setOffboardingEmployees] = useState(
    getOffboardingEmployees()
  );
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(
    null
  );
  const [pack, setPack] = useState<HandoffPack | null>(null);
  const [loading, setLoading] = useState(false);

  // Fetch real employees from Supabase on mount
  useEffect(() => {
    fetchOffboardingEmployees().then((emps) => setOffboardingEmployees(emps));
  }, []);

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
      <div className="border-b border-[#1e1e22] px-6 py-5">
        <h3 className="mb-1 text-[15px] font-semibold text-[#ededed]">
          Offboarding Handoff Pack
        </h3>
        <p className="mb-4 text-[12.5px] text-[#71717a]">
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
                    ? "border-[#c4b5a050] bg-[#c4b5a010]"
                    : "border-[#1e1e22] bg-[#131316] hover:border-[#2a2a2e] hover:bg-[#19191d]"
                }`}
              >
                <div className="mb-1 text-[13.5px] font-medium text-[#d4d4d8]">
                  {emp.name}
                </div>
                <p className="text-[12px] text-[#71717a]">
                  {emp.role} · {emp.team}
                </p>
                <p className="mt-1 text-[11px] text-[#52525b]">
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
          <div className="flex items-center gap-3 text-[13px] text-[#71717a]">
            <Loader2 size={18} className="animate-spin text-[#c4b5a0]" />
            Generating handoff pack…
          </div>
        </div>
      )}

      {/* Handoff pack */}
      {pack && !loading && (
        <div className="animate-fade-in px-6 py-5">
          {/* Summary bullets */}
          <div className="mb-5 rounded-xl border border-[#f59e0b30] bg-[#f59e0b10] p-5">
            <div className="mb-3 flex items-center gap-2 text-[13px] font-semibold text-[#fbbf24]">
              <AlertTriangle size={15} />
              What the next owner must know
            </div>
            <div className="space-y-2">
              {pack.summaryBullets.map((bullet, i) => (
                <div
                  key={i}
                  className="flex items-start gap-2 text-[12.5px] leading-relaxed text-[#d4d4d8]"
                >
                  <CircleDot
                    size={10}
                    className="mt-1.5 flex-shrink-0 text-[#fbbf24]"
                  />
                  {bullet}
                </div>
              ))}
            </div>
          </div>

          {/* Ownership areas */}
          <div className="mb-5">
            <h4 className="mb-3 text-[14px] font-semibold text-[#ededed]">
              Ownership Areas
            </h4>
            <div className="space-y-3">
              {pack.ownershipAreas.map((area, i) => (
                <div
                  key={i}
                  className="rounded-xl border border-[#1e1e22] bg-[#131316] p-4"
                >
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-[13.5px] font-medium text-[#d4d4d8]">
                      {area.area}
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                        STATUS_COLORS[area.status] ||
                        "bg-[#1e1e22] text-[#a1a1aa]"
                      }`}
                    >
                      {area.status}
                    </span>
                  </div>
                  <p className="text-[12.5px] leading-relaxed text-[#71717a]">
                    {area.description}
                  </p>
                  {area.suggestedOwner && (
                    <p className="mt-2 flex items-center gap-1.5 text-[12px] text-[#c4b5a0]">
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
            <h4 className="mb-3 text-[14px] font-semibold text-[#ededed]">
              Unresolved Work
            </h4>
            <div className="space-y-3">
              {pack.unresolvedWork.map((item, i) => (
                <div
                  key={i}
                  className="rounded-xl border border-[#1e1e22] bg-[#131316] p-4"
                >
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-[13.5px] font-medium text-[#d4d4d8]">
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
                  <p className="text-[12.5px] leading-relaxed text-[#71717a]">
                    {item.description}
                  </p>
                  {item.deadline && (
                    <p className="mt-2 flex items-center gap-1.5 text-[12px] text-[#52525b]">
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
            <h4 className="mb-3 text-[14px] font-semibold text-[#ededed]">
              Key Links & Resources
            </h4>
            <div className="grid grid-cols-2 gap-2">
              {pack.keyLinks.map((link, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 rounded-lg border border-[#1e1e22] bg-[#131316] p-3"
                >
                  <Link2 size={14} className="flex-shrink-0 text-[#52525b]" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[12.5px] font-medium text-[#d4d4d8]">
                      {link.title}
                    </p>
                    <p className="text-[11px] text-[#52525b]">
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
      <div className="flex items-center border-b border-[#1e1e22] bg-[#0e0e11] px-5">
        {tabs.map((tab) => {
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 border-b-2 px-4 py-3 text-[13px] font-medium transition-colors ${
                active
                  ? "border-[#c4b5a0] text-[#ededed]"
                  : "border-transparent text-[#71717a] hover:text-[#a1a1aa]"
              }`}
            >
              <span className={active ? "text-[#c4b5a0]" : "text-[#52525b]"}>
                {tab.icon}
              </span>
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-hidden bg-[#0a0a0c]">
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
