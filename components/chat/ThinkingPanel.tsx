"use client";

import { Brain, Search, MessageSquare, CheckCircle2 } from "lucide-react";

interface ThinkingPanelProps {
  steps: string[];
  isActive: boolean;
}

function getStepIcon(step: string) {
  if (step.toLowerCase().includes("search")) return <Search size={14} />;
  if (step.toLowerCase().includes("consult")) return <MessageSquare size={14} />;
  if (step.toLowerCase().includes("generat")) return <Brain size={14} />;
  return <CheckCircle2 size={14} />;
}

export function ThinkingPanel({ steps, isActive }: ThinkingPanelProps) {
  return (
    <div className="border-b border-zinc-200 p-4 dark:border-zinc-800">
      <div className="mb-3 flex items-center gap-2">
        <Brain
          size={16}
          className={`text-violet-500 ${isActive ? "animate-pulse" : ""}`}
        />
        <h3 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Clone Thinking
        </h3>
        {isActive && (
          <span className="ml-auto text-[10px] uppercase tracking-wider text-violet-500 font-medium">
            Active
          </span>
        )}
      </div>
      <div className="space-y-2">
        {steps.map((step, i) => (
          <div
            key={i}
            className={`flex items-center gap-2 text-xs transition-opacity ${
              i === steps.length - 1 && isActive
                ? "text-zinc-900 dark:text-zinc-100"
                : "text-zinc-500 dark:text-zinc-400"
            }`}
          >
            <span
              className={`shrink-0 ${
                i === steps.length - 1 && isActive
                  ? "text-violet-500"
                  : "text-zinc-400 dark:text-zinc-600"
              }`}
            >
              {getStepIcon(step)}
            </span>
            <span>{step}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
