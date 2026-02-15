"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Play, Radio } from "lucide-react";

// ============================================
// Types
// ============================================

interface AgentNode {
  id: string;
  name: string;
  role: string;
  color: string;
  x: number;
  y: number;
}

interface AgentMessage {
  id: string;
  fromId: string;
  toId: string;
  type: "task" | "data" | "status" | "query" | "response" | "approval";
  content: string;
  timestamp: number;
}

interface Particle {
  id: string;
  fromId: string;
  toId: string;
  color: string;
  duration: number;
}

// ============================================
// Constants
// ============================================

const EVENT_TYPE_STYLES: Record<string, { color: string; label: string }> = {
  task: { color: "#60a5fa", label: "TASK" },
  data: { color: "#34d399", label: "DATA" },
  status: { color: "#fbbf24", label: "STATUS" },
  query: { color: "#818cf8", label: "QUERY" },
  response: { color: "#c4b5a0", label: "RESPONSE" },
  approval: { color: "#f472b6", label: "COMPLETE" },
};

const DEFAULT_AGENTS: AgentNode[] = [
  { id: "orchestrator", name: "Orchestrator", role: "Coordinator", color: "#c4b5a0", x: 300, y: 50 },
  { id: "research", name: "Research", role: "Data Gathering", color: "#60a5fa", x: 120, y: 160 },
  { id: "aggregator", name: "Aggregator", role: "Synthesis", color: "#a78bfa", x: 480, y: 160 },
  { id: "clone_1", name: "James L.", role: "ML Engineer", color: "#34d399", x: 60, y: 300 },
  { id: "clone_2", name: "Ella L.", role: "Full-Stack", color: "#fbbf24", x: 210, y: 316 },
  { id: "clone_3", name: "Angelina Q.", role: "Product & Frontend", color: "#f472b6", x: 360, y: 300 },
  { id: "clone_4", name: "Videet M.", role: "Backend & Infra", color: "#38bdf8", x: 510, y: 316 },
];

const DEFAULT_EDGES: [string, string][] = [
  ["orchestrator", "research"],
  ["orchestrator", "aggregator"],
  ["research", "clone_1"],
  ["research", "clone_2"],
  ["research", "clone_3"],
  ["research", "clone_4"],
  ["research", "aggregator"],
];

const SIMULATION_SEQUENCE: Omit<AgentMessage, "id" | "timestamp">[] = [
  { fromId: "orchestrator", toId: "research", type: "task", content: "Gather team status on the Ambient Intelligence demo — what's blocking launch?" },
  { fromId: "research", toId: "clone_1", type: "query", content: "James, what's the status on the ML pipeline for Ambient Intelligence?" },
  { fromId: "clone_1", toId: "research", type: "response", content: "Model inference is ready but we need Videet's streaming endpoint to go live first" },
  { fromId: "research", toId: "clone_2", type: "query", content: "Ella, how's the full-stack integration looking for the demo?" },
  { fromId: "clone_2", toId: "research", type: "response", content: "Frontend is wired up — waiting on the real-time WebSocket feed from backend" },
  { fromId: "research", toId: "clone_3", type: "query", content: "Angelina, is the product flow and UI ready for the demo?" },
  { fromId: "clone_3", toId: "research", type: "response", content: "UI is polished, but we need to finalize the onboarding copy and loading states" },
  { fromId: "research", toId: "clone_4", type: "query", content: "Videet, what's the infra status for the streaming endpoint?" },
  { fromId: "clone_4", toId: "research", type: "response", content: "Deploying to Modal tonight — should be live by morning, then James can hook in" },
  { fromId: "research", toId: "aggregator", type: "data", content: "Compiled 4 team responses — transferring for status synthesis" },
  { fromId: "aggregator", toId: "orchestrator", type: "status", content: "Synthesizing: ML ready, frontend ready, infra deploying tonight, UI needs copy pass" },
  { fromId: "aggregator", toId: "orchestrator", type: "approval", content: "Demo on track — critical path: Videet's deploy → James hooks ML → Ella integrates → Angelina finalizes UI" },
];

// ============================================
// Helpers
// ============================================

function getEdgePath(from: AgentNode, to: AgentNode, curvature = 0.15): string {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len === 0) return `M ${from.x},${from.y} L ${to.x},${to.y}`;
  const nx = -dy / len;
  const ny = dx / len;
  const offset = len * curvature;
  const cx = (from.x + to.x) / 2 + nx * offset;
  const cy = (from.y + to.y) / 2 + ny * offset;
  return `M ${from.x},${from.y} Q ${cx},${cy} ${to.x},${to.y}`;
}

function getAnimationPath(from: AgentNode, to: AgentNode, curvature = 0.15): string {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len === 0) return "M 0,0 L 0,0";
  const nx = -dy / len;
  const ny = dx / len;
  const offset = len * curvature;
  const cx = dx / 2 + nx * offset;
  const cy = dy / 2 + ny * offset;
  return `M 0,0 Q ${cx},${cy} ${dx},${dy}`;
}

function getEdgeKey(a: string, b: string): string {
  return [a, b].sort().join("--");
}

let _particleId = 0;
let _eventId = 0;

// ============================================
// Component
// ============================================

interface AgentNetworkViewProps {
  trigger?: number;
  compact?: boolean;
}

export function AgentNetworkView({
  trigger = 0,
  compact = false,
}: AgentNetworkViewProps) {
  const agents = DEFAULT_AGENTS;
  const agentMap = useMemo(
    () => new Map(agents.map((a) => [a.id, a])),
    [agents]
  );

  const [events, setEvents] = useState<AgentMessage[]>([]);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [activeNodes, setActiveNodes] = useState<Set<string>>(new Set());
  const [activeEdges, setActiveEdges] = useState<Set<string>>(new Set());
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const feedRef = useRef<HTMLDivElement>(null);

  // Clean up timers on unmount
  useEffect(() => {
    return () => timersRef.current.forEach((t) => clearTimeout(t));
  }, []);

  // Auto-scroll feed to top (newest first)
  useEffect(() => {
    if (feedRef.current) {
      feedRef.current.scrollTop = 0;
    }
  }, [events.length]);

  // Fire a single agent event
  const fireEvent = useCallback(
    (msg: Omit<AgentMessage, "id" | "timestamp">) => {
      const event: AgentMessage = {
        ...msg,
        id: `evt_${++_eventId}`,
        timestamp: Date.now(),
      };

      setEvents((prev) => [event, ...prev]);

      // Activate nodes
      setActiveNodes(
        (prev) => new Set([...prev, msg.fromId, msg.toId])
      );

      // Activate edge
      const edgeKey = getEdgeKey(msg.fromId, msg.toId);
      setActiveEdges((prev) => new Set([...prev, edgeKey]));

      // Add particle
      const particle: Particle = {
        id: `p_${++_particleId}`,
        fromId: msg.fromId,
        toId: msg.toId,
        color: EVENT_TYPE_STYLES[msg.type]?.color || "#c4b5a0",
        duration: 900,
      };
      setParticles((prev) => [...prev, particle]);

      // Deactivate nodes/edges after delay
      const t1 = setTimeout(() => {
        setActiveNodes((prev) => {
          const next = new Set(prev);
          next.delete(msg.fromId);
          next.delete(msg.toId);
          return next;
        });
        setActiveEdges((prev) => {
          const next = new Set(prev);
          next.delete(edgeKey);
          return next;
        });
      }, 1400);

      // Remove particle after animation completes
      const t2 = setTimeout(() => {
        setParticles((prev) => prev.filter((p) => p.id !== particle.id));
      }, particle.duration + 200);

      timersRef.current.push(t1, t2);
    },
    []
  );

  // Run the simulation sequence
  const runSimulation = useCallback(() => {
    if (isRunning) return;

    // Reset state
    setEvents([]);
    setParticles([]);
    setActiveNodes(new Set());
    setActiveEdges(new Set());
    setIsRunning(true);
    setProgress(0);
    timersRef.current.forEach((t) => clearTimeout(t));
    timersRef.current = [];

    const delays = [
      0, 1400, 2800, 4000, 5400, 6800, 8200, 9600, 11000, 12400, 13800, 15200,
    ];

    SIMULATION_SEQUENCE.forEach((msg, i) => {
      const t = setTimeout(() => {
        fireEvent(msg);
        setProgress(((i + 1) / SIMULATION_SEQUENCE.length) * 100);
        if (i === SIMULATION_SEQUENCE.length - 1) {
          const done = setTimeout(() => setIsRunning(false), 1800);
          timersRef.current.push(done);
        }
      }, delays[i] ?? i * 1400);
      timersRef.current.push(t);
    });
  }, [isRunning, fireEvent]);

  // Trigger from parent
  useEffect(() => {
    if (trigger > 0) {
      runSimulation();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trigger]);

  const svgWidth = 620;
  const svgHeight = compact ? 300 : 380;

  return (
    <div
      className={`flex ${
        compact ? "flex-col" : "flex-row"
      } gap-0 rounded-xl border border-[#1e1e22] bg-[#0c0c0f] overflow-hidden`}
      style={{
        fontFamily:
          "var(--font-geist-mono, 'SF Mono', 'Fira Code', 'Cascadia Code', monospace)",
      }}
    >
      {/* ──── Topology Panel ──── */}
      <div
        className={`relative ${compact ? "w-full" : "flex-1"} bg-[#0c0c0f]`}
      >
        {/* Header bar */}
        <div className="flex items-center justify-between border-b border-[#1e1e22] px-4 py-2.5">
          <div className="flex items-center gap-2">
            <Radio
              size={13}
              className={
                isRunning
                  ? "text-[#34d399] animate-pulse"
                  : "text-[#3f3f46]"
              }
            />
            <span className="text-[11px] font-medium uppercase tracking-[0.12em] text-[#52525b]">
              Agent Topology
            </span>
          </div>
          <div className="flex items-center gap-3">
            {isRunning && (
              <span className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-[#34d399]">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#34d399] animate-pulse" />
                Live
              </span>
            )}
            <button
              onClick={runSimulation}
              disabled={isRunning}
              className="flex items-center gap-1.5 rounded-md bg-[#1e1e22] px-2.5 py-1 text-[11px] font-medium text-[#a1a1aa] transition-all hover:bg-[#2a2a2e] hover:text-[#ededed] disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <Play size={10} />
              Run Workflow
            </button>
          </div>
        </div>

        {/* Progress bar */}
        {isRunning && (
          <div className="h-[2px] w-full bg-[#1e1e22]">
            <div
              className="h-full bg-gradient-to-r from-[#34d399] to-[#60a5fa] transition-all duration-700 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}

        {/* SVG Graph */}
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full"
          style={{ minHeight: compact ? 240 : 300 }}
        >
          {/* Background dot grid */}
          <defs>
            <pattern
              id="agentDotGrid"
              x="0"
              y="0"
              width="24"
              height="24"
              patternUnits="userSpaceOnUse"
            >
              <circle
                cx="12"
                cy="12"
                r="0.6"
                fill="#ffffff"
                opacity="0.035"
              />
            </pattern>
            <filter
              id="agentGlow"
              x="-100%"
              y="-100%"
              width="300%"
              height="300%"
            >
              <feGaussianBlur in="SourceGraphic" stdDeviation="6" />
            </filter>
          </defs>

          <rect
            width={svgWidth}
            height={svgHeight}
            fill="url(#agentDotGrid)"
          />

          {/* ── Edges ── */}
          {DEFAULT_EDGES.map(([fromId, toId]) => {
            const from = agentMap.get(fromId);
            const to = agentMap.get(toId);
            if (!from || !to) return null;
            const key = getEdgeKey(fromId, toId);
            const active = activeEdges.has(key);
            const path = getEdgePath(from, to);

            return (
              <g key={key}>
                {/* Active glow layer */}
                {active && (
                  <path
                    d={path}
                    fill="none"
                    stroke={from.color}
                    strokeWidth={4}
                    opacity={0.12}
                    filter="url(#agentGlow)"
                  />
                )}
                {/* Edge line */}
                <path
                  d={path}
                  fill="none"
                  stroke={active ? "#3f3f46" : "#1e1e22"}
                  strokeWidth={active ? 1.2 : 0.7}
                  opacity={active ? 0.9 : 0.35}
                  strokeDasharray={active ? "none" : "4 3"}
                  style={{ transition: "all 0.3s ease" }}
                />
              </g>
            );
          })}

          {/* ── Particles ── */}
          {particles.map((p) => {
            const from = agentMap.get(p.fromId);
            const to = agentMap.get(p.toId);
            if (!from || !to) return null;
            const animPath = getAnimationPath(from, to);

            return (
              <g
                key={p.id}
                transform={`translate(${from.x},${from.y})`}
              >
                {/* Outer glow */}
                <circle r={8} fill={p.color} opacity={0.12}>
                  <animateMotion
                    dur={`${p.duration}ms`}
                    path={animPath}
                    fill="freeze"
                  />
                </circle>
                {/* Mid glow */}
                <circle r={5} fill={p.color} opacity={0.25}>
                  <animateMotion
                    dur={`${p.duration}ms`}
                    path={animPath}
                    fill="freeze"
                  />
                </circle>
                {/* Core particle */}
                <circle r={2.5} fill={p.color} opacity={0.95}>
                  <animateMotion
                    dur={`${p.duration}ms`}
                    path={animPath}
                    fill="freeze"
                  />
                </circle>
              </g>
            );
          })}

          {/* ── Nodes ── */}
          {agents.map((node) => {
            const active = activeNodes.has(node.id);
            return (
              <g key={node.id}>
                {/* Ambient glow behind node */}
                {active && (
                  <circle
                    cx={node.x}
                    cy={node.y}
                    r={28}
                    fill={node.color}
                    opacity={0.1}
                    filter="url(#agentGlow)"
                  />
                )}
                {/* Ring pulse when active */}
                {active && (
                  <circle
                    cx={node.x}
                    cy={node.y}
                    r={22}
                    fill="none"
                    stroke={node.color}
                    strokeWidth={1}
                    opacity={0.3}
                  >
                    <animate
                      attributeName="r"
                      from="22"
                      to="34"
                      dur="0.8s"
                      fill="freeze"
                    />
                    <animate
                      attributeName="opacity"
                      from="0.3"
                      to="0"
                      dur="0.8s"
                      fill="freeze"
                    />
                  </circle>
                )}
                {/* Node circle */}
                <circle
                  cx={node.x}
                  cy={node.y}
                  r={20}
                  fill="#0c0c0f"
                  stroke={node.color}
                  strokeWidth={active ? 2.2 : 1.2}
                  opacity={active ? 1 : 0.55}
                  style={{
                    transition: "all 0.3s ease",
                    filter: active
                      ? `drop-shadow(0 0 8px ${node.color}50)`
                      : "none",
                  }}
                />
                {/* Initials */}
                <text
                  x={node.x}
                  y={node.y + 1}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill={node.color}
                  fontSize="10"
                  fontWeight="600"
                  fontFamily="inherit"
                  opacity={active ? 1 : 0.65}
                  style={{ transition: "opacity 0.3s ease" }}
                >
                  {node.name
                    .split(" ")
                    .map((w) => w[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase()}
                </text>
                {/* Name */}
                <text
                  x={node.x}
                  y={node.y + 34}
                  textAnchor="middle"
                  fill={active ? "#ededed" : "#71717a"}
                  fontSize="9.5"
                  fontFamily="inherit"
                  style={{ transition: "fill 0.3s ease" }}
                >
                  {node.name}
                </text>
                {/* Role */}
                <text
                  x={node.x}
                  y={node.y + 46}
                  textAnchor="middle"
                  fill="#3f3f46"
                  fontSize="7"
                  fontFamily="inherit"
                  letterSpacing="0.06em"
                >
                  {node.role.toUpperCase()}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* ──── Event Stream Panel ──── */}
      <div
        className={`${
          compact ? "w-full border-t" : "w-[300px] border-l"
        } border-[#1e1e22] flex flex-col bg-[#0a0a0c]`}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#1e1e22] px-4 py-2.5">
          <span className="text-[11px] font-medium uppercase tracking-[0.12em] text-[#52525b]">
            Event Stream
          </span>
          <span className="text-[10px] tabular-nums text-[#3f3f46]">
            {events.length} events
          </span>
        </div>

        {/* Feed */}
        <div
          ref={feedRef}
          className="flex-1 overflow-y-auto"
          style={{ maxHeight: compact ? 200 : svgHeight + 30 }}
        >
          {events.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-14 text-center">
              <Radio size={16} className="mb-2.5 text-[#2a2a2e]" />
              <p className="text-[11px] text-[#3f3f46]">
                Waiting for agent activity…
              </p>
            </div>
          ) : (
            <div className="divide-y divide-[#1e1e22]/60">
              {events.map((evt) => {
                const from = agentMap.get(evt.fromId);
                const to = agentMap.get(evt.toId);
                const style =
                  EVENT_TYPE_STYLES[evt.type] ||
                  EVENT_TYPE_STYLES.status;

                return (
                  <div
                    key={evt.id}
                    className="animate-fade-in-up px-4 py-3"
                  >
                    {/* Type badge + timestamp */}
                    <div className="mb-1.5 flex items-center justify-between">
                      <span
                        className="rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.1em]"
                        style={{
                          color: style.color,
                          backgroundColor: `${style.color}15`,
                        }}
                      >
                        {style.label}
                      </span>
                      <span className="text-[9px] tabular-nums text-[#3f3f46]">
                        {new Date(evt.timestamp).toLocaleTimeString(
                          [],
                          {
                            hour: "2-digit",
                            minute: "2-digit",
                            second: "2-digit",
                          }
                        )}
                      </span>
                    </div>
                    {/* Route */}
                    <div className="mb-1 flex items-center gap-1.5 text-[10px]">
                      <span
                        style={{
                          color: from?.color || "#71717a",
                        }}
                      >
                        {from?.name || evt.fromId}
                      </span>
                      <span className="text-[#3f3f46]">→</span>
                      <span
                        style={{
                          color: to?.color || "#71717a",
                        }}
                      >
                        {to?.name || evt.toId}
                      </span>
                    </div>
                    {/* Content */}
                    <p className="text-[11px] leading-relaxed text-[#71717a]">
                      {evt.content}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
