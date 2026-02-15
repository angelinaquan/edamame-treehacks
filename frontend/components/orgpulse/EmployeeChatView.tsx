"use client";

import {
  useState,
  useRef,
  useCallback,
  useEffect,
  type FormEvent,
} from "react";
import {
  Send,
  Quote,
  Loader2,
  Bot,
  Mic,
  MicOff,
  MessageSquare,
  Volume2,
  Brain,
  Zap,
  ChevronRight,
} from "lucide-react";
import { fetchCloneProfiles, streamCloneChat } from "@/lib/orgpulse/api";
import type {
  ChatMessage,
  Citation,
  CloneProfile,
} from "@/lib/orgpulse/types";

// ---- Memory learning types ----

interface MemoryEntry {
  id: string;
  fact: string;
  source: string;
  timestamp: string;
  status: "extracting" | "stored";
}

const SOURCE_LABELS: Record<string, string> = {
  conversation: "Conversation",
  slack: "Slack",
  github: "GitHub",
  gdrive: "Google Drive",
  email: "Gmail",
  notion: "Notion",
  jira: "Jira",
  voice: "Voice",
  manual: "Manual",
};

// ---- Memory Panel sub-component ----

function MemoryPanel({
  entries,
  cloneName,
  isOpen,
  onToggle,
}: {
  entries: MemoryEntry[];
  cloneName: string;
  isOpen: boolean;
  onToggle: () => void;
}) {
  return (
    <div
      className={`flex flex-col border-l border-[#1e1e22] bg-[#111114] transition-all ${
        isOpen ? "w-[300px]" : "w-[42px]"
      }`}
    >
      {/* Toggle header */}
      <button
        onClick={onToggle}
        className="flex items-center gap-2 border-b border-[#1e1e22] px-3 py-3 text-left transition-colors hover:bg-[#19191d]"
      >
        <Brain size={16} className="flex-shrink-0 text-[#c4b5a0]" />
        {isOpen && (
          <div className="flex-1 min-w-0">
            <span className="text-[12px] font-semibold text-[#ededed]">
              Continual Learning
            </span>
            <span className="ml-1.5 rounded-full bg-[#c4b5a020] px-1.5 py-0.5 text-[10px] font-medium text-[#c4b5a0]">
              {entries.length}
            </span>
          </div>
        )}
        <ChevronRight
          size={14}
          className={`flex-shrink-0 text-[#52525b] transition-transform ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {isOpen && (
        <div className="flex-1 overflow-y-auto">
          {entries.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <Brain size={20} className="mx-auto mb-2 text-[#3f3f46]" />
              <p className="text-[11.5px] text-[#52525b]">
                Memories will appear here as {cloneName.split(" ")[0]} learns from conversations.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-[#1e1e22]">
              {entries.map((entry) => (
                <div
                  key={entry.id}
                  className="animate-fade-in-up px-3 py-3"
                >
                  <div className="mb-1 flex items-center gap-1.5">
                    {entry.status === "extracting" ? (
                      <Loader2 size={10} className="animate-spin text-[#f59e0b]" />
                    ) : (
                      <Zap size={10} className="text-[#c4b5a0]" />
                    )}
                    <span
                      className={`text-[10px] font-medium ${
                        entry.status === "extracting"
                          ? "text-[#f59e0b]"
                          : "text-[#c4b5a0]"
                      }`}
                    >
                      {entry.status === "extracting"
                        ? "Extracting\u2026"
                        : "Stored"}
                    </span>
                    <span className="ml-auto text-[9px] text-[#52525b]">
                      {new Date(entry.timestamp).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                  <p className="text-[11.5px] leading-relaxed text-[#a1a1aa]">
                    {entry.fact}
                  </p>
                  <p className="mt-1 text-[10px] text-[#52525b]">
                    Source: {SOURCE_LABELS[entry.source] || entry.source}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ---- Helpers ----
let _msgId = 0;
function nextMsgId() {
  return `msg_${++_msgId}_${Date.now()}`;
}

// ---- Sub-components ----

function ChatBubble({
  message,
  cloneName,
}: {
  message: ChatMessage;
  cloneName: string;
}) {
  const isUser = message.role === "user";
  return (
    <div className={`animate-fade-in-up flex gap-3 ${isUser ? "flex-row-reverse" : ""}`}>
      <div
        className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-[11px] font-semibold ${
          isUser ? "bg-[#c4b5a0] text-[#0a0a0c]" : "bg-[#1e1e22] text-[#c4b5a0]"
        }`}
      >
        {isUser ? "You" : cloneName.split(" ").map((w) => w[0]).join("").slice(0, 2)}
      </div>
      <div className={`max-w-[75%] ${isUser ? "text-right" : ""}`}>
        <div
          className={`inline-block rounded-2xl px-4 py-3 text-[13px] leading-relaxed ${
            isUser
              ? "rounded-tr-md bg-[#c4b5a0] text-[#0a0a0c]"
              : "rounded-tl-md bg-[#19191d] text-[#d4d4d8] border border-[#1e1e22]"
          }`}
        >
          <div className="whitespace-pre-line">{message.content}</div>
        </div>
        {message.citations && message.citations.length > 0 && (
          <div className="mt-2 space-y-1.5">
            {message.citations.map((c, i) => (
              <div
                key={i}
                className="inline-flex items-start gap-1.5 rounded-lg bg-[#131316] border border-[#1e1e22] px-2.5 py-1.5 text-left"
              >
                <Quote size={10} className="mt-0.5 flex-shrink-0 text-[#52525b]" />
                <div>
                  <span className="text-[10px] font-medium text-[#71717a]">{c.source}</span>
                  {c.date && <span className="text-[10px] text-[#52525b]"> · {c.date}</span>}
                  <p className="mt-0.5 text-[11px] italic text-[#71717a] line-clamp-2">
                    &ldquo;{c.snippet}&rdquo;
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================
// Main Employee Chat View
// ============================================

interface EmployeeChatViewProps {
  demoTrigger: number;
}

export function EmployeeChatView({ demoTrigger }: EmployeeChatViewProps) {
  const [profile, setProfile] = useState<CloneProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [streamingContent, setStreamingContent] = useState("");
  const [streamingCitations, setStreamingCitations] = useState<Citation[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [input, setInput] = useState("");
  const [mode, setMode] = useState<"text" | "voice">("text");
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [memoryEntries, setMemoryEntries] = useState<MemoryEntry[]>([]);
  const [memoryPanelOpen, setMemoryPanelOpen] = useState(true);
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>("");
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Refs to avoid stale closures in recording callbacks
  const isStreamingRef = useRef(false);
  const messagesRef = useRef<ChatMessage[]>([]);
  const modeRef = useRef(mode);
  const startRecordingRef = useRef<() => void>(() => {});

  // Keep refs in sync
  useEffect(() => { isStreamingRef.current = isStreaming; }, [isStreaming]);
  useEffect(() => { messagesRef.current = messages; }, [messages]);
  useEffect(() => { modeRef.current = mode; }, [mode]);

  // Load the employee's own twin clone based on email mapping
  useEffect(() => {
    fetchCloneProfiles().then((profiles) => {
      const cloneName = typeof window !== "undefined"
        ? sessionStorage.getItem("orgpulse_clone_name") || ""
        : "";
      
      // Try to match by stored clone name
      if (cloneName) {
        const match = profiles.find((p) =>
          p.employee.name.toLowerCase().includes(cloneName.toLowerCase())
        );
        if (match) {
          setProfile(match);
          setLoading(false);
          return;
        }
      }

      // Fallback to first clone
      if (profiles.length > 0) {
        setProfile(profiles[0]);
      }
      setLoading(false);
    });
  }, []);

  // Enumerate audio input devices
  useEffect(() => {
    async function loadDevices() {
      try {
        const tempStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        tempStream.getTracks().forEach((t) => t.stop());
        const devices = await navigator.mediaDevices.enumerateDevices();
        const inputs = devices.filter((d) => d.kind === "audioinput");
        setAudioDevices(inputs);
        if (inputs.length > 0 && !selectedDeviceId) {
          setSelectedDeviceId(inputs[0].deviceId);
        }
      } catch {
        // permission denied — will surface when they try to record
      }
    }
    loadDevices();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, streamingContent]);

  // Poll for real memory entries from the backend (all sources: chat, Slack, etc.)
  const lastPollRef = useRef<string>(new Date().toISOString());
  const knownIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    // Initial load: fetch recent entries
    fetch("/api/memory/recent?limit=20")
      .then((res) => res.json())
      .then((data) => {
        if (data.entries && data.entries.length > 0) {
          const initial: MemoryEntry[] = data.entries.map(
            (e: { id: string; fact: string; source: string; timestamp: string }) => {
              knownIdsRef.current.add(e.id);
              return {
                id: e.id,
                fact: e.fact,
                source: e.source,
                timestamp: e.timestamp,
                status: "stored" as const,
              };
            }
          );
          setMemoryEntries((prev) => {
            const extracting = prev.filter((e) => e.status === "extracting");
            return [...extracting, ...initial];
          });
        }
      })
      .catch(() => {});

    // Poll every 4 seconds for new entries
    const interval = setInterval(async () => {
      try {
        const res = await fetch(
          `/api/memory/recent?limit=10&since=${encodeURIComponent(lastPollRef.current)}`
        );
        const data = await res.json();
        if (data.entries && data.entries.length > 0) {
          const newEntries: MemoryEntry[] = [];
          for (const e of data.entries as Array<{
            id: string;
            fact: string;
            source: string;
            timestamp: string;
          }>) {
            if (!knownIdsRef.current.has(e.id)) {
              knownIdsRef.current.add(e.id);
              newEntries.push({
                id: e.id,
                fact: e.fact,
                source: e.source,
                timestamp: e.timestamp,
                status: "stored",
              });
            }
          }
          if (newEntries.length > 0) {
            setMemoryEntries((prev) => {
              const withoutExtracting = prev.filter(
                (e) => e.status !== "extracting"
              );
              return [...newEntries, ...withoutExtracting];
            });
          }
          lastPollRef.current = data.entries[0].timestamp;
        }
      } catch {
        // polling error — skip
      }
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  // TTS: speak the assistant's response aloud
  const speakText = useCallback(async (text: string) => {
    if (!text.trim()) return;
    try {
      setIsPlayingAudio(true);
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      const res = await fetch("/api/voice/synthesize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      if (!res.ok) throw new Error("TTS failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.onended = () => {
        setIsPlayingAudio(false);
        URL.revokeObjectURL(url);
        audioRef.current = null;
        if (modeRef.current === "voice") {
          setTimeout(() => startRecordingRef.current(), 300);
        }
      };
      audio.onerror = () => {
        setIsPlayingAudio(false);
        URL.revokeObjectURL(url);
        audioRef.current = null;
      };
      await audio.play();
    } catch {
      setIsPlayingAudio(false);
    }
  }, []);

  const sendMessage = useCallback(
    async (question: string) => {
      if (!profile || !question.trim() || isStreamingRef.current) return;

      if (abortRef.current) abortRef.current.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      const userMsg: ChatMessage = {
        id: nextMsgId(),
        role: "user",
        content: question.trim(),
        timestamp: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, userMsg]);
      setInput("");
      setIsStreaming(true);
      setStreamingContent("");
      setStreamingCitations([]);

      // Show a temporary "extracting" indicator while the backend learns
      const extractingId = `extracting_${Date.now()}`;
      if (question.length >= 20) {
        setMemoryEntries((prev) => [
          {
            id: extractingId,
            fact: `Learning from: "${question.slice(0, 100)}${question.length > 100 ? "\u2026" : ""}"`,
            source: "conversation",
            timestamp: new Date().toISOString(),
            status: "extracting",
          },
          ...prev,
        ]);
      }

      try {
        let accumulated = "";
        let cites: Citation[] = [];
        const prevMessages = messagesRef.current.map((m) => ({ role: m.role, content: m.content }));
        const stream = streamCloneChat(
          profile.employee.id,
          question,
          controller.signal,
          prevMessages
        );
        for await (const event of stream) {
          if (event.type === "chunk") {
            accumulated += event.text;
            setStreamingContent(accumulated);
          } else if (event.type === "citations") {
            cites = event.citations;
            setStreamingCitations(cites);
          } else if (event.type === "learning") {
            // Backend confirmed learning — remove the extracting placeholder
            // The real entries will appear via polling
            setMemoryEntries((prev) =>
              prev.filter((e) => e.id !== extractingId)
            );
          }
        }

        const assistantMsg: ChatMessage = {
          id: nextMsgId(),
          role: "assistant",
          content: accumulated,
          timestamp: new Date().toISOString(),
          citations: cites.length > 0 ? cites : undefined,
        };
        setMessages((prev) => [...prev, assistantMsg]);

        // Auto-speak in voice mode
        if (modeRef.current === "voice" && accumulated.trim()) {
          speakText(accumulated);
        }
      } catch {
        // aborted — clean up extracting placeholder
        setMemoryEntries((prev) =>
          prev.filter((e) => e.id !== extractingId)
        );
      }

      setIsStreaming(false);
      setStreamingContent("");
      setStreamingCitations([]);
    },
    [profile, speakText]
  );

  const handleSubmit = useCallback(
    (e?: FormEvent) => {
      e?.preventDefault();
      sendMessage(input);
    },
    [input, sendMessage]
  );

  // ---- Voice recording ----
  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          ...(selectedDeviceId ? { deviceId: { exact: selectedDeviceId } } : {}),
        },
      });

      const mimeType = ["audio/webm;codecs=opus", "audio/webm", "audio/ogg;codecs=opus", "audio/mp4"]
        .find((t) => MediaRecorder.isTypeSupported(t)) || "audio/webm";

      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blobType = chunksRef.current[0]?.type || mimeType;
        const audioBlob = new Blob(chunksRef.current, { type: blobType });
        setIsRecording(false);

        // Guard: skip if no audio data was captured
        if (audioBlob.size === 0) {
          console.warn("[voice] Empty audio blob, skipping transcription");
          return;
        }

        setIsTranscribing(true);

        try {
          const ext = blobType.includes("ogg") ? "ogg" : blobType.includes("mp4") ? "m4a" : "webm";
          const formData = new FormData();
          formData.append("audio", audioBlob, `recording.${ext}`);
          const res = await fetch("/api/voice/transcribe", {
            method: "POST",
            body: formData,
          });
          if (res.ok) {
            const data = await res.json();
            if (data.text?.trim()) {
              sendMessage(data.text.trim());
            }
          }
        } catch {
          // transcription failed
        }
        setIsTranscribing(false);
      };

      mediaRecorder.start(1000);
      setIsRecording(true);
    } catch {
      // mic access denied
    }
  }, [sendMessage, selectedDeviceId]);

  // Keep ref in sync so speakText's onended can call the latest version
  useEffect(() => { startRecordingRef.current = startRecording; }, [startRecording]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      // Flush any buffered audio data before stopping to avoid empty blobs
      if (mediaRecorderRef.current.state === "recording") {
        mediaRecorderRef.current.requestData();
      }
      mediaRecorderRef.current.stop();
    }
  }, [isRecording]);

  // Demo trigger
  useEffect(() => {
    if (demoTrigger > 0 && profile) {
      sendMessage("What are you currently working on?");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [demoTrigger]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center bg-[#0a0a0c]">
        <Loader2 size={24} className="animate-spin text-[#52525b]" />
      </div>
    );
  }

  const cloneName = profile?.employee.name || "Your Twin";
  const displayName = cloneName.replace(" [Twin Clone]", "");
  const initials = profile?.employee.initials || "??";

  return (
    <div className="flex h-full">
      {/* Chat column */}
      <div className="flex flex-1 flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#1e1e22] bg-[#0e0e11] px-6 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#1e1e22] text-[13px] font-semibold text-[#c4b5a0]">
            {initials}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-[14px] font-semibold text-[#ededed]">{cloneName}</h3>
              <span className="flex items-center gap-1 rounded-full bg-[#10b98120] px-2 py-0.5 text-[10px] font-medium text-[#10b981]">
                <Bot size={10} />
                AI Twin
              </span>
            </div>
            <p className="text-[12px] text-[#71717a]">
              {profile?.personality?.slice(0, 80)}
            </p>
          </div>
        </div>

        {/* Mode toggle */}
        <div className="flex items-center gap-1 rounded-lg border border-[#1e1e22] p-0.5">
          <button
            onClick={() => setMode("text")}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[12px] font-medium transition-colors ${
              mode === "text"
                ? "bg-[#ededed] text-[#0a0a0c]"
                : "text-[#71717a] hover:text-[#a1a1aa]"
            }`}
          >
            <MessageSquare size={13} />
            Text
          </button>
          <button
            onClick={() => setMode("voice")}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[12px] font-medium transition-colors ${
              mode === "voice"
                ? "bg-[#ededed] text-[#0a0a0c]"
                : "text-[#71717a] hover:text-[#a1a1aa]"
            }`}
          >
            <Volume2 size={13} />
            Voice
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto bg-[#0a0a0c] px-6 py-5">
        {messages.length === 0 && !isStreaming ? (
          <div className="mx-auto max-w-lg text-center py-16">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#1e1e22] text-[#c4b5a0]">
              <span className="text-[20px] font-bold">{initials}</span>
            </div>
            <h3 className="mb-2 text-[16px] font-semibold text-[#ededed]">
              Talk to your AI Twin
            </h3>
            <p className="mb-6 text-[13px] leading-relaxed text-[#71717a]">
              {profile?.personality || "Your digital twin is ready to chat."}
            </p>
            <div className="grid grid-cols-2 gap-2 mx-auto max-w-md">
              {(profile?.suggestedQuestions || [
                "What are you working on?",
                "What should I know today?",
                "What are the biggest risks?",
                "Tell me about recent decisions.",
              ]).map((q) => (
                <button
                  key={q}
                  onClick={() => sendMessage(q)}
                  className="rounded-lg border border-[#1e1e22] bg-[#131316] px-3 py-2.5 text-left text-[12.5px] text-[#a1a1aa] transition-all hover:border-[#2a2a2e] hover:bg-[#19191d] hover:text-[#d4d4d8]"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="mx-auto max-w-2xl space-y-5">
            {messages.map((msg) => (
              <ChatBubble key={msg.id} message={msg} cloneName={cloneName} />
            ))}

            {/* Streaming */}
            {isStreaming && streamingContent && (
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-[#1e1e22] text-[11px] font-semibold text-[#c4b5a0]">
                  {initials}
                </div>
                <div className="max-w-[75%]">
                  <div className="inline-block rounded-2xl rounded-tl-md border border-[#1e1e22] bg-[#19191d] px-4 py-3 text-[13px] leading-relaxed text-[#d4d4d8]">
                    <div className="whitespace-pre-line">
                      {streamingContent}
                      <span className="inline-block h-4 w-0.5 animate-pulse bg-[#52525b] align-text-bottom" />
                    </div>
                  </div>
                  {streamingCitations.length > 0 && (
                    <div className="mt-2 space-y-1.5">
                      {streamingCitations.map((c, i) => (
                        <div key={i} className="inline-flex items-start gap-1.5 rounded-lg bg-[#131316] border border-[#1e1e22] px-2.5 py-1.5 text-left">
                          <Quote size={10} className="mt-0.5 flex-shrink-0 text-[#52525b]" />
                          <div>
                            <span className="text-[10px] font-medium text-[#71717a]">{c.source}</span>
                            <p className="mt-0.5 text-[11px] italic text-[#71717a] line-clamp-2">&ldquo;{c.snippet}&rdquo;</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {isStreaming && !streamingContent && (
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-[#1e1e22] text-[11px] font-semibold text-[#c4b5a0]">
                  {initials}
                </div>
                <div className="rounded-2xl rounded-tl-md border border-[#1e1e22] bg-[#19191d] px-4 py-3">
                  <div className="flex items-center gap-1">
                    <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#52525b] [animation-delay:0ms]" />
                    <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#52525b] [animation-delay:150ms]" />
                    <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#52525b] [animation-delay:300ms]" />
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input area */}
      <div className="border-t border-[#1e1e22] bg-[#0e0e11] px-6 py-3">
        {mode === "text" ? (
          <form onSubmit={handleSubmit} className="flex items-end gap-3">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit();
                }
              }}
              placeholder="Ask your twin a question\u2026"
              rows={1}
              className="max-h-32 min-h-[40px] flex-1 resize-none rounded-xl border border-[#1e1e22] bg-[#131316] px-4 py-2.5 text-[13px] text-[#ededed] placeholder:text-[#52525b] focus:border-[#2a2a2e] focus:bg-[#19191d] focus:outline-none focus:ring-1 focus:ring-[#2a2a2e]"
            />
            <button
              type="submit"
              disabled={!input.trim() || isStreaming}
              className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-[#c4b5a0] text-[#0a0a0c] transition-colors hover:bg-[#d4c5b0] disabled:cursor-not-allowed disabled:opacity-40"
            >
              {isStreaming ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            </button>
          </form>
        ) : (
          /* Voice mode */
          <div className="flex flex-col items-center gap-3 py-4">
            {/* Microphone selector */}
            {audioDevices.length > 0 && (
              <select
                value={selectedDeviceId}
                onChange={(e) => setSelectedDeviceId(e.target.value)}
                disabled={isRecording || isTranscribing}
                className="mb-1 w-64 rounded-lg border border-[#1e1e22] bg-[#131316] px-3 py-1.5 text-[12px] text-[#a1a1aa] outline-none focus:border-[#2a2a2e] focus:ring-1 focus:ring-[#2a2a2e]"
              >
                {audioDevices.map((d) => (
                  <option key={d.deviceId} value={d.deviceId}>
                    {d.label || `Mic ${d.deviceId.slice(0, 8)}\u2026`}
                  </option>
                ))}
              </select>
            )}
            <button
              onClick={isRecording ? stopRecording : startRecording}
              disabled={isStreaming || isTranscribing || isPlayingAudio}
              className={`flex h-16 w-16 items-center justify-center rounded-full transition-all ${
                isPlayingAudio
                  ? "bg-[#c4b5a0] text-[#0a0a0c] shadow-lg shadow-[#c4b5a020] animate-pulse"
                  : isRecording
                  ? "bg-[#ef4444] text-white shadow-lg shadow-[#ef444430] animate-pulse"
                  : isTranscribing
                  ? "bg-[#f59e0b20] text-[#f59e0b]"
                  : "bg-[#c4b5a0] text-[#0a0a0c] hover:bg-[#d4c5b0] shadow-lg"
              }`}
            >
              {isPlayingAudio ? (
                <Volume2 size={24} />
              ) : isTranscribing ? (
                <Loader2 size={24} className="animate-spin" />
              ) : isRecording ? (
                <MicOff size={24} />
              ) : (
                <Mic size={24} />
              )}
            </button>
            <p className="text-[12px] text-[#71717a]">
              {isPlayingAudio
                ? "Speaking\u2026"
                : isRecording
                ? "Recording\u2026 tap to stop"
                : isTranscribing
                ? "Transcribing\u2026"
                : isStreaming
                ? "Twin is responding\u2026"
                : "Tap to speak"}
            </p>
          </div>
        )}
      </div>
      </div>{/* end chat column */}

      {/* Memory learning panel */}
      <MemoryPanel
        entries={memoryEntries}
        cloneName={displayName}
        isOpen={memoryPanelOpen}
        onToggle={() => setMemoryPanelOpen((o) => !o)}
      />
    </div>
  );
}
