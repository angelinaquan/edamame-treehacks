"use client";

import {
  useState,
  useRef,
  useCallback,
  useEffect,
  type FormEvent,
} from "react";
import {
  Search,
  Send,
  Quote,
  Loader2,
  Sparkles,
  MessageSquare,
  ArrowRight,
  Bot,
} from "lucide-react";
import { getCloneProfiles, fetchCloneProfiles, streamCloneChat } from "@/lib/orgpulse/api";
import type {
  ChatMessage,
  Citation,
  CloneProfile,
  Employee,
} from "@/lib/orgpulse/types";

// ---- Helpers ----

let _msgId = 0;
function nextMsgId() {
  return `msg_${++_msgId}_${Date.now()}`;
}

const AVATAR_COLORS = [
  "bg-[#1e1e22] text-[#818cf8]",
  "bg-[#1e1e22] text-[#34d399]",
  "bg-[#1e1e22] text-[#fbbf24]",
  "bg-[#1e1e22] text-[#fb7185]",
  "bg-[#1e1e22] text-[#a78bfa]",
  "bg-[#1e1e22] text-[#38bdf8]",
  "bg-[#1e1e22] text-[#fb923c]",
  "bg-[#1e1e22] text-[#2dd4bf]",
  "bg-[#1e1e22] text-[#f472b6]",
  "bg-[#1e1e22] text-[#a3e635]",
  "bg-[#1e1e22] text-[#22d3ee]",
];

function getAvatarColor(index: number) {
  return AVATAR_COLORS[index % AVATAR_COLORS.length];
}

// ---- Sub-components ----

function EmployeeListItem({
  profile,
  active,
  onClick,
  colorIndex,
  hasMessages,
}: {
  profile: CloneProfile;
  active: boolean;
  onClick: () => void;
  colorIndex: number;
  hasMessages: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-colors ${
        active
          ? "bg-[#19191d] border-r-2 border-[#c4b5a0]"
          : "hover:bg-[#131316]"
      }`}
    >
      <div
        className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-[12px] font-semibold ${getAvatarColor(colorIndex)}`}
      >
        {profile.employee.initials}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between">
          <span
            className={`truncate text-[13px] font-medium ${
              active ? "text-[#ededed]" : "text-[#d4d4d8]"
            }`}
          >
            {profile.employee.name}
          </span>
          {hasMessages && (
            <MessageSquare size={12} className="flex-shrink-0 text-[#3f3f46]" />
          )}
        </div>
        <p className="truncate text-[11.5px] text-[#71717a]">
          {profile.employee.role} · {profile.employee.team}
        </p>
      </div>
    </button>
  );
}

function SuggestedQuestion({
  question,
  onClick,
}: {
  question: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="group flex items-center gap-2 rounded-lg border border-[#1e1e22] bg-[#131316] px-3 py-2.5 text-left text-[12.5px] text-[#a1a1aa] transition-all hover:border-[#2a2a2e] hover:bg-[#19191d] hover:text-[#d4d4d8]"
    >
      <ArrowRight
        size={12}
        className="flex-shrink-0 text-[#3f3f46] transition-colors group-hover:text-[#c4b5a0]"
      />
      <span className="line-clamp-2">{question}</span>
    </button>
  );
}

function ChatBubble({
  message,
  employee,
  colorIndex,
}: {
  message: ChatMessage;
  employee: Employee;
  colorIndex: number;
}) {
  const isUser = message.role === "user";
  return (
    <div
      className={`animate-fade-in-up flex gap-3 ${
        isUser ? "flex-row-reverse" : ""
      }`}
    >
      {/* Avatar */}
      <div
        className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-[11px] font-semibold ${
          isUser
            ? "bg-[#c4b5a0] text-[#0a0a0c]"
            : getAvatarColor(colorIndex)
        }`}
      >
        {isUser ? "You" : employee.initials}
      </div>

      {/* Content */}
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

        {/* Citations */}
        {message.citations && message.citations.length > 0 && (
          <div className="mt-2 space-y-1.5">
            {message.citations.map((c, i) => (
              <div
                key={i}
                className="inline-flex items-start gap-1.5 rounded-lg bg-[#131316] border border-[#1e1e22] px-2.5 py-1.5 text-left"
              >
                <Quote size={10} className="mt-0.5 flex-shrink-0 text-[#52525b]" />
                <div>
                  <span className="text-[10px] font-medium text-[#71717a]">
                    {c.source}
                  </span>
                  <span className="text-[10px] text-[#52525b]"> · {c.date}</span>
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

function TypingIndicator({
  employee,
  colorIndex,
}: {
  employee: Employee;
  colorIndex: number;
}) {
  return (
    <div className="flex items-start gap-3">
      <div
        className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-[11px] font-semibold ${getAvatarColor(colorIndex)}`}
      >
        {employee.initials}
      </div>
      <div className="rounded-2xl rounded-tl-md border border-[#1e1e22] bg-[#19191d] px-4 py-3">
        <div className="flex items-center gap-1">
          <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#52525b] [animation-delay:0ms]" />
          <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#52525b] [animation-delay:150ms]" />
          <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#52525b] [animation-delay:300ms]" />
        </div>
      </div>
    </div>
  );
}

// ============================================
// Main ClonesView
// ============================================

interface ClonesViewProps {
  demoTrigger: number;
}

export function ClonesView({ demoTrigger }: ClonesViewProps) {
  const [profiles, setProfiles] = useState(getCloneProfiles());
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Fetch real clone profiles from backend on mount
  useEffect(() => {
    fetchCloneProfiles().then((p) => setProfiles(p));
  }, []);
  const [searchQuery, setSearchQuery] = useState("");
  const [conversations, setConversations] = useState<
    Record<string, ChatMessage[]>
  >({});
  const [streamingContent, setStreamingContent] = useState("");
  const [streamingCitations, setStreamingCitations] = useState<Citation[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [input, setInput] = useState("");
  const abortRef = useRef<AbortController | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const selectedProfile = profiles.find(
    (p) => p.employee.id === selectedId
  );
  const messages = selectedId ? conversations[selectedId] ?? [] : [];

  const filteredProfiles = searchQuery
    ? profiles.filter(
        (p) =>
          p.employee.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.employee.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.employee.team.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : profiles;

  // Group filtered profiles by team
  const groupedProfiles = filteredProfiles.reduce<
    { team: string; members: typeof profiles }[]
  >((groups, profile) => {
    const existing = groups.find((g) => g.team === profile.employee.team);
    if (existing) {
      existing.members.push(profile);
    } else {
      groups.push({ team: profile.employee.team, members: [profile] });
    }
    return groups;
  }, []);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, streamingContent]);

  // Focus input when selecting a clone
  useEffect(() => {
    if (selectedId) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [selectedId]);

  const sendMessage = useCallback(
    async (question: string) => {
      if (!selectedId || !question.trim() || isStreaming) return;

      // Cancel any previous stream
      if (abortRef.current) abortRef.current.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      const userMsg: ChatMessage = {
        id: nextMsgId(),
        role: "user",
        content: question.trim(),
        timestamp: new Date().toISOString(),
      };

      setConversations((prev) => ({
        ...prev,
        [selectedId]: [...(prev[selectedId] ?? []), userMsg],
      }));
      setInput("");
      setIsStreaming(true);
      setStreamingContent("");
      setStreamingCitations([]);

      try {
        let accumulated = "";
        let cites: Citation[] = [];
        // Pass conversation history for RAG context
        const prevMessages = (conversations[selectedId] ?? []).map((m) => ({
          role: m.role,
          content: m.content,
        }));
        const stream = streamCloneChat(
          selectedId,
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
          }
        }

        // Finalize: add assistant message to conversation
        const assistantMsg: ChatMessage = {
          id: nextMsgId(),
          role: "assistant",
          content: accumulated,
          timestamp: new Date().toISOString(),
          citations: cites.length > 0 ? cites : undefined,
        };

        setConversations((prev) => ({
          ...prev,
          [selectedId]: [...(prev[selectedId] ?? []), assistantMsg],
        }));
      } catch {
        // aborted
      }

      setIsStreaming(false);
      setStreamingContent("");
      setStreamingCitations([]);
    },
    [selectedId, isStreaming]
  );

  const handleSubmit = useCallback(
    (e?: FormEvent) => {
      e?.preventDefault();
      sendMessage(input);
    },
    [input, sendMessage]
  );

  // Demo trigger — select Marcus Chen and ask about the query optimizer
  useEffect(() => {
    if (demoTrigger > 0 && profiles.length > 0) {
      const marcus = profiles[0]; // Marcus Chen
      setSelectedId(marcus.employee.id);
      setTimeout(() => {
        sendMessage("How does the analytics query optimizer work?");
      }, 300);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [demoTrigger]);

  const profileIndex = (id: string) =>
    profiles.findIndex((p) => p.employee.id === id);

  return (
    <div className="flex h-full">
      {/* ---- Left: Clone list ---- */}
      <div className="flex w-[280px] flex-shrink-0 flex-col border-r border-[#1e1e22] bg-[#0e0e11]">
        {/* Header */}
        <div className="border-b border-[#1e1e22] px-4 py-4">
          <h2 className="text-[15px] font-semibold text-[#ededed]">
            Agent Clones
          </h2>
          <p className="mt-0.5 text-[12px] text-[#71717a]">
            Chat with individual digital twins
          </p>
        </div>

        {/* Search */}
        <div className="border-b border-[#1e1e22] px-3 py-2.5">
          <div className="relative">
            <Search
              size={14}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#52525b]"
            />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search people\u2026"
              className="w-full rounded-md border border-[#1e1e22] bg-[#131316] py-1.5 pl-8 pr-3 text-[12.5px] text-[#ededed] placeholder:text-[#52525b] focus:border-[#2a2a2e] focus:outline-none focus:ring-1 focus:ring-[#2a2a2e]"
            />
          </div>
        </div>

        {/* List grouped by team */}
        <div className="flex-1 overflow-y-auto">
          {groupedProfiles.map((group) => (
            <div key={group.team}>
              <div className="sticky top-0 z-10 border-b border-[#1e1e22] bg-[#111114]/90 px-4 py-1.5 backdrop-blur-sm">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-[#52525b]">
                  {group.team}
                </span>
                <span className="ml-1.5 text-[10px] font-medium text-[#3f3f46]">
                  {group.members.length}
                </span>
              </div>
              <div className="divide-y divide-[#1e1e22]">
                {group.members.map((profile) => (
                  <EmployeeListItem
                    key={profile.employee.id}
                    profile={profile}
                    active={selectedId === profile.employee.id}
                    onClick={() => setSelectedId(profile.employee.id)}
                    colorIndex={profileIndex(profile.employee.id)}
                    hasMessages={
                      (conversations[profile.employee.id]?.length ?? 0) > 0
                    }
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ---- Right: Chat area ---- */}
      <div className="flex flex-1 flex-col bg-[#0a0a0c]">
        {selectedProfile ? (
          <>
            {/* Chat header */}
            <div className="flex items-center justify-between border-b border-[#1e1e22] bg-[#0e0e11] px-5 py-3">
              <div className="flex items-center gap-3">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-full text-[13px] font-semibold ${getAvatarColor(
                    profileIndex(selectedProfile.employee.id)
                  )}`}
                >
                  {selectedProfile.employee.initials}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-[14px] font-semibold text-[#ededed]">
                      {selectedProfile.employee.name}
                    </h3>
                    <span className="flex items-center gap-1 rounded-full bg-[#10b98120] px-2 py-0.5 text-[10px] font-medium text-[#10b981]">
                      <Bot size={10} />
                      AI Clone
                    </span>
                  </div>
                  <p className="text-[12px] text-[#71717a]">
                    {selectedProfile.employee.role} ·{" "}
                    {selectedProfile.employee.team} ·{" "}
                    {selectedProfile.employee.tenure}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-1">
                {selectedProfile.expertise.slice(0, 3).map((tag) => (
                  <span
                    key={tag}
                    className="rounded-md bg-[#1e1e22] px-2 py-0.5 text-[10px] font-medium text-[#71717a]"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            {/* Messages area */}
            <div className="flex-1 overflow-y-auto px-5 py-5">
              {messages.length === 0 && !isStreaming ? (
                /* Empty state with personality + suggested questions */
                <div className="mx-auto max-w-lg">
                  <div className="mb-6 rounded-xl border border-[#1e1e22] bg-[#131316] p-5 text-center">
                    <div
                      className={`mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl ${getAvatarColor(
                        profileIndex(selectedProfile.employee.id)
                      )}`}
                    >
                      <span className="text-[18px] font-bold">
                        {selectedProfile.employee.initials}
                      </span>
                    </div>
                    <h3 className="mb-1 text-[15px] font-semibold text-[#ededed]">
                      {selectedProfile.employee.name}&apos;s Digital Twin
                    </h3>
                    <p className="text-[12.5px] leading-relaxed text-[#71717a]">
                      {selectedProfile.personality}
                    </p>
                  </div>

                  <p className="mb-3 text-center text-[12px] font-medium text-[#52525b]">
                    Suggested questions
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {selectedProfile.suggestedQuestions.map((q) => (
                      <SuggestedQuestion
                        key={q}
                        question={q}
                        onClick={() => sendMessage(q)}
                      />
                    ))}
                  </div>
                </div>
              ) : (
                /* Message list */
                <div className="mx-auto max-w-2xl space-y-5">
                  {messages.map((msg) => (
                    <ChatBubble
                      key={msg.id}
                      message={msg}
                      employee={selectedProfile.employee}
                      colorIndex={profileIndex(selectedProfile.employee.id)}
                    />
                  ))}

                  {/* Streaming message */}
                  {isStreaming && streamingContent && (
                    <div className="flex items-start gap-3">
                      <div
                        className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-[11px] font-semibold ${getAvatarColor(
                          profileIndex(selectedProfile.employee.id)
                        )}`}
                      >
                        {selectedProfile.employee.initials}
                      </div>
                      <div className="max-w-[75%]">
                        <div className="inline-block rounded-2xl rounded-tl-md border border-[#1e1e22] bg-[#19191d] px-4 py-3 text-[13px] leading-relaxed text-[#d4d4d8]">
                          <div className="whitespace-pre-line">
                            {streamingContent}
                            <span className="inline-block h-4 w-0.5 animate-pulse bg-[#52525b] align-text-bottom" />
                          </div>
                        </div>
                        {/* Streaming citations */}
                        {streamingCitations.length > 0 && (
                          <div className="mt-2 space-y-1.5">
                            {streamingCitations.map((c, i) => (
                              <div
                                key={i}
                                className="inline-flex items-start gap-1.5 rounded-lg bg-[#131316] border border-[#1e1e22] px-2.5 py-1.5 text-left"
                              >
                                <Quote
                                  size={10}
                                  className="mt-0.5 flex-shrink-0 text-[#52525b]"
                                />
                                <div>
                                  <span className="text-[10px] font-medium text-[#71717a]">
                                    {c.source}
                                  </span>
                                  <span className="text-[10px] text-[#52525b]">
                                    {" "}
                                    · {c.date}
                                  </span>
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
                  )}

                  {/* Typing indicator (before content starts) */}
                  {isStreaming && !streamingContent && (
                    <TypingIndicator
                      employee={selectedProfile.employee}
                      colorIndex={profileIndex(selectedProfile.employee.id)}
                    />
                  )}

                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            {/* Input area */}
            <div className="border-t border-[#1e1e22] bg-[#0e0e11] px-5 py-3">
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
                  placeholder={`Ask ${selectedProfile.employee.name.split(" ")[0]} a question\u2026`}
                  rows={1}
                  className="max-h-32 min-h-[40px] flex-1 resize-none rounded-xl border border-[#1e1e22] bg-[#131316] px-4 py-2.5 text-[13px] text-[#ededed] placeholder:text-[#52525b] focus:border-[#2a2a2e] focus:bg-[#19191d] focus:outline-none focus:ring-1 focus:ring-[#2a2a2e]"
                />
                <button
                  type="submit"
                  disabled={!input.trim() || isStreaming}
                  className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-[#c4b5a0] text-[#0a0a0c] transition-colors hover:bg-[#d4c5b0] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {isStreaming ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Send size={16} />
                  )}
                </button>
              </form>
            </div>
          </>
        ) : (
          /* No clone selected */
          <div className="flex h-full flex-col items-center justify-center text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#1e1e22]">
              <Sparkles size={24} className="text-[#52525b]" />
            </div>
            <h3 className="mb-1 text-[15px] font-medium text-[#a1a1aa]">
              Select an agent clone
            </h3>
            <p className="max-w-xs text-[13px] text-[#52525b]">
              Choose an employee from the list to chat with their AI digital
              twin. Each clone has unique expertise and perspective.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
