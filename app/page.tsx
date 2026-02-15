"use client";

import { useState, useRef, useCallback, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { ChatWindow } from "@/components/chat/ChatWindow";
import { mockClones } from "@/lib/mock-data";
import { Menu, X } from "lucide-react";

function ChatPage() {
  const searchParams = useSearchParams();
  const cloneParam = searchParams.get("clone");

  const activeClone = cloneParam
    ? mockClones.find((c) => c.id === cloneParam) || mockClones[0]
    : mockClones[0];

  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Close sidebar on route change
  useEffect(() => {
    setSidebarOpen(false);
  }, [cloneParam]);

  const handleVoiceResponse = useCallback(async (text: string) => {
    try {
      const res = await fetch("/api/voice/synthesize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: text.slice(0, 500) }),
      });

      if (!res.ok) return;

      const audioBlob = await res.blob();
      const audioUrl = URL.createObjectURL(audioBlob);

      if (audioRef.current) {
        audioRef.current.pause();
      }

      const audio = new Audio(audioUrl);
      audioRef.current = audio;
      setIsPlayingAudio(true);

      audio.onended = () => {
        setIsPlayingAudio(false);
        URL.revokeObjectURL(audioUrl);
      };

      audio.onerror = () => {
        setIsPlayingAudio(false);
        URL.revokeObjectURL(audioUrl);
      };

      await audio.play();
    } catch (err) {
      console.error("TTS playback failed:", err);
      setIsPlayingAudio(false);
    }
  }, []);

  return (
    <div className="flex h-screen">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-50 transform transition-transform lg:static lg:transform-none ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        <Sidebar />
      </div>

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header with mobile menu button */}
        <div className="flex items-center border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
          <button
            onClick={() => setSidebarOpen(true)}
            className="flex h-14 w-14 items-center justify-center text-zinc-500 lg:hidden"
          >
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          <div className="flex-1">
            <Header
              title={`Chat with ${activeClone.name}'s Twin`}
              noBorder
            />
          </div>
        </div>

        <main className="flex-1 overflow-hidden">
          <ChatWindow
            cloneId={activeClone.id}
            cloneName={activeClone.name}
            onVoiceResponse={handleVoiceResponse}
          />
        </main>
      </div>

      {/* Audio playing indicator */}
      {isPlayingAudio && (
        <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-full bg-blue-600 px-4 py-2 text-sm text-white shadow-lg">
          <div className="h-2 w-2 animate-pulse rounded-full bg-white" />
          Speaking...
        </div>
      )}
    </div>
  );
}

export default function Home() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
        </div>
      }
    >
      <ChatPage />
    </Suspense>
  );
}
