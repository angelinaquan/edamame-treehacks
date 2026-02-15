"use client";

import { useState, useEffect } from "react";
import {
  BookOpen,
  Sparkles,
  MessageSquare,
  Users,
  Settings,
  Zap,
  LogOut,
} from "lucide-react";

export type EmployeeView = "chat" | "coworkers" | "knowledge";

interface EmployeeSidebarProps {
  activeView: EmployeeView;
  onViewChange: (view: EmployeeView) => void;
  onDemoMode: () => void;
}

const navItems: { id: EmployeeView; label: string; icon: React.ReactNode }[] = [
  {
    id: "chat",
    label: "My Twin Clone",
    icon: <MessageSquare size={18} />,
  },
  {
    id: "coworkers",
    label: "Coworker Twins",
    icon: <Users size={18} />,
  },
  {
    id: "knowledge",
    label: "Knowledge Base",
    icon: <BookOpen size={18} />,
  },
];

export function EmployeeSidebar({
  activeView,
  onViewChange,
  onDemoMode,
}: EmployeeSidebarProps) {
  const [email, setEmail] = useState("");
  const [cloneName, setCloneName] = useState("");

  useEffect(() => {
    setEmail(sessionStorage.getItem("orgpulse_email") || "");
    setCloneName(sessionStorage.getItem("orgpulse_clone_name") || "");
  }, []);

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

      {/* User info */}
      {(cloneName || email) && (
        <div className="mx-3 mb-3 rounded-lg bg-[#1a1a1e] px-3 py-2">
          <p className="text-[12px] font-medium text-[#c4b5a0]">
            {cloneName || email}
          </p>
          {cloneName && email && (
            <p className="text-[10px] text-[#71717a]">{email}</p>
          )}
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 px-3 pt-2">
        <p className="mb-2 px-2 text-[11px] font-medium uppercase tracking-wider text-[#52525b]">
          Workspace
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
          <span className="text-[#52525b]"><Settings size={18} /></span>
          Integrations
        </a>
        <button
          onClick={onDemoMode}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#c4b5a0] px-3 py-2 text-[13px] font-medium text-[#0a0a0c] shadow-sm transition-colors hover:bg-[#d4c5b0] active:bg-[#b4a590]"
        >
          <Zap size={14} />
          Demo Mode
        </button>
        <a
          href="/"
          className="flex w-full items-center justify-center gap-2 rounded-md px-3 py-1.5 text-[12px] text-[#52525b] transition-colors hover:text-[#a1a1aa]"
        >
          <LogOut size={12} />
          Switch Portal
        </a>
      </div>
    </aside>
  );
}
