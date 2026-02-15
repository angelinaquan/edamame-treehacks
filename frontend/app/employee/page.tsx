"use client";

import { useState, useCallback } from "react";
import { EmployeeSidebar, type EmployeeView } from "@/components/orgpulse/EmployeeSidebar";
import { EmployeeChatView } from "@/components/orgpulse/EmployeeChatView";
import { ClonesView } from "@/components/orgpulse/ClonesView";
import { KnowledgeView } from "@/components/orgpulse/KnowledgeView";

export default function EmployeePage() {
  const [activeView, setActiveView] = useState<EmployeeView>("chat");
  const [demoTriggerChat, setDemoTriggerChat] = useState(0);
  const [demoTriggerCoworkers, setDemoTriggerCoworkers] = useState(0);
  const [demoTriggerKnowledge, setDemoTriggerKnowledge] = useState(0);

  const handleDemoMode = useCallback(() => {
    if (activeView === "chat") {
      setDemoTriggerChat((c) => c + 1);
    } else if (activeView === "coworkers") {
      setDemoTriggerCoworkers((c) => c + 1);
    } else {
      setDemoTriggerKnowledge((c) => c + 1);
    }
  }, [activeView]);

  return (
    <div className="flex h-screen bg-white">
      <EmployeeSidebar
        activeView={activeView}
        onViewChange={setActiveView}
        onDemoMode={handleDemoMode}
      />
      <main className="flex-1 overflow-hidden">
        <div className={activeView === "chat" ? "h-full" : "hidden"}>
          <EmployeeChatView demoTrigger={demoTriggerChat} />
        </div>
        <div className={activeView === "coworkers" ? "h-full" : "hidden"}>
          <ClonesView demoTrigger={demoTriggerCoworkers} />
        </div>
        <div className={activeView === "knowledge" ? "h-full" : "hidden"}>
          <KnowledgeView demoTrigger={demoTriggerKnowledge} />
        </div>
      </main>
    </div>
  );
}
