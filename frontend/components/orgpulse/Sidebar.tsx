"use client";

import {
  BarChart3,
  BookOpen,
  Sparkles,
  Users,
  Zap,
} from "lucide-react";

export type View = "insights" | "clones" | "knowledge";

interface SidebarProps {
  activeView: View;
  onViewChange: (view: View) => void;
  onDemoMode: () => void;
}

const navItems: { id: View; label: string; icon: React.ReactNode }[] = [
  {
    id: "insights",
    label: "Management Insights",
    icon: <BarChart3 size={18} />,
  },
  {
    id: "clones",
    label: "Agent Clones",
    icon: <Users size={18} />,
  },
  {
    id: "knowledge",
    label: "Knowledge Base",
    icon: <BookOpen size={18} />,
  },
];

export function Sidebar({ activeView, onViewChange, onDemoMode }: SidebarProps) {
  return (
    <aside className="flex h-full w-[240px] flex-col border-r border-neutral-200 bg-neutral-50/70">
      {/* Logo */}
      <div className="flex items-center gap-2 px-5 py-5">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600 text-white">
          <Sparkles size={15} />
        </div>
        <span className="text-[15px] font-semibold tracking-tight text-neutral-900">
          OrgPulse
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 pt-2">
        <p className="mb-2 px-2 text-[11px] font-medium uppercase tracking-wider text-neutral-400">
          Workflows
        </p>
        {navItems.map((item) => {
          const active = activeView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onViewChange(item.id)}
              className={`mb-0.5 flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-[13.5px] transition-colors ${
                active
                  ? "bg-neutral-200/80 font-medium text-neutral-900"
                  : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-800"
              }`}
            >
              <span className={active ? "text-neutral-800" : "text-neutral-400"}>
                {item.icon}
              </span>
              {item.label}
            </button>
          );
        })}
      </nav>

      {/* Demo mode button */}
      <div className="border-t border-neutral-200 px-3 py-3">
        <button
          onClick={onDemoMode}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-3 py-2 text-[13px] font-medium text-white shadow-sm transition-colors hover:bg-indigo-700 active:bg-indigo-800"
        >
          <Zap size={14} />
          Demo Mode
        </button>
      </div>
    </aside>
  );
}
