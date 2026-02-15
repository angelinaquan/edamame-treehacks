"use client";

import {
  BarChart3,
  BookOpen,
  Sparkles,
  Users,
  Zap,
  Settings,
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
    <aside className="flex h-full w-[240px] flex-col border-r border-[#1e1e22] bg-[#111114]">
      {/* Logo */}
      <div className="flex items-center gap-2 px-5 py-5">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#c4b5a0] text-[#0a0a0c]">
          <Sparkles size={15} />
        </div>
        <span className="text-[15px] font-semibold tracking-tight text-[#ededed]">
          OrgPulse
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 pt-2">
        <p className="mb-2 px-2 text-[11px] font-medium uppercase tracking-wider text-[#52525b]">
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
                  ? "bg-[#1e1e22] font-medium text-[#ededed]"
                  : "text-[#a1a1aa] hover:bg-[#19191d] hover:text-[#d4d4d8]"
              }`}
            >
              <span className={active ? "text-[#c4b5a0]" : "text-[#52525b]"}>
                {item.icon}
              </span>
              {item.label}
            </button>
          );
        })}
      </nav>

      {/* Bottom actions */}
      <div className="border-t border-[#1e1e22] px-3 py-3 space-y-2">
        <a
          href="/settings"
          className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-[13.5px] text-[#a1a1aa] transition-colors hover:bg-[#19191d] hover:text-[#d4d4d8]"
        >
          <span className="text-[#52525b]">
            <Settings size={18} />
          </span>
          Integrations
        </a>
        <button
          onClick={onDemoMode}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#c4b5a0] px-3 py-2 text-[13px] font-medium text-[#0a0a0c] shadow-sm transition-colors hover:bg-[#d4c5b0] active:bg-[#b4a590]"
        >
          <Zap size={14} />
          Demo Mode
        </button>
      </div>
    </aside>
  );
}
