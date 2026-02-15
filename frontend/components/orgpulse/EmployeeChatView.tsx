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
} from "lucide-react";
import { fetchCloneProfiles, streamCloneChat } from "@/lib/orgpulse/api";
import type {
  ChatMessage,
  Citation,
  CloneProfile,
} from "@/lib/orgpulse/types";

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
          isUser ? "bg-neutral-900 text-white" : "bg-indigo-100 text-indigo-700"
        }`}
      >
        {isUser ? "You" : cloneName.split(" ").map((w) => w[0]).join("").slice(0, 2)}
      </div>
      <div className={`max-w-[75%] ${isUser ? "text-right" : ""}`}>
        <div
          className={`inline-block rounded-2xl px-4 py-3 text-[13px] leading-relaxed ${
            isUser
              ? "rounded-tr-md bg-neutral-900 text-white"
              : "rounded-tl-md bg-white text-neutral-700 shadow-sm border border-neutral-100"
          }`}
        >
          <div className="whitespace-pre-line">{message.content}</div>
        </div>
        {message.citations && message.citations.length > 0 && (
          <div className="mt-2 space-y-1.5">
            {message.citations.map((c, i) => (
              <div
                key={i}
                className="inline-flex items-start gap-1.5 rounded-lg bg-neutral-50 border border-neutral-200 px-2.5 py-1.5 text-left"
              >
                <Quote size={10} className="mt-0.5 flex-shrink-0 text-neutral-400" />
                <div>
                  <span className="text-[10px] font-medium text-neutral-500">{c.source}</span>
                  {c.date && <span className="text-[10px] text-neutral-400"> · {c.date}</span>}
                  <p className="mt-0.5 text-[11px] italic text-neutral-500 line-clamp-2">
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
  const abortRef = useRef<AbortController | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  // Load the first available clone (the employee's own twin)
  useEffect(() => {
    fetchCloneProfiles().then((profiles) => {
      if (profiles.length > 0) {
        setProfile(profiles[0]);
      }
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, streamingContent]);

  const sendMessage = useCallback(
    async (question: string) => {
      if (!profile || !question.trim() || isStreaming) return;

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

      try {
        let accumulated = "";
        let cites: Citation[] = [];
        const prevMessages = messages.map((m) => ({ role: m.role, content: m.content }));
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
      } catch {
        // aborted
      }

      setIsStreaming(false);
      setStreamingContent("");
      setStreamingCitations([]);
    },
    [profile, isStreaming, messages]
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
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const audioBlob = new Blob(chunksRef.current, { type: "audio/webm" });
        setIsRecording(false);
        setIsTranscribing(true);

        try {
          const formData = new FormData();
          formData.append("file", audioBlob, "recording.webm");
          const res = await fetch("/api/voice/transcribe", {
            method: "POST",
            body: formData,
          });
          if (res.ok) {
            const data = await res.json();
            if (data.text) {
              sendMessage(data.text);
            }
          }
        } catch {
          // transcription failed
        }
        setIsTranscribing(false);
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch {
      // mic access denied
    }
  }, [sendMessage]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
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
      <div className="flex h-full items-center justify-center">
        <Loader2 size={24} className="animate-spin text-neutral-400" />
      </div>
    );
  }

  const cloneName = profile?.employee.name || "Your Twin";
  const initials = profile?.employee.initials || "??";

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-neutral-200 bg-white px-6 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 text-[13px] font-semibold text-indigo-700">
            {initials}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-[14px] font-semibold text-neutral-900">{cloneName}</h3>
              <span className="flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-600">
                <Bot size={10} />
                AI Twin
              </span>
            </div>
            <p className="text-[12px] text-neutral-500">
              {profile?.personality?.slice(0, 80)}
            </p>
          </div>
        </div>

        {/* Mode toggle */}
        <div className="flex items-center gap-1 rounded-lg border border-neutral-200 p-0.5">
          <button
            onClick={() => setMode("text")}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[12px] font-medium transition-colors ${
              mode === "text"
                ? "bg-neutral-900 text-white"
                : "text-neutral-500 hover:text-neutral-700"
            }`}
          >
            <MessageSquare size={13} />
            Text
          </button>
          <button
            onClick={() => setMode("voice")}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[12px] font-medium transition-colors ${
              mode === "voice"
                ? "bg-neutral-900 text-white"
                : "text-neutral-500 hover:text-neutral-700"
            }`}
          >
            <Volume2 size={13} />
            Voice
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-5">
        {messages.length === 0 && !isStreaming ? (
          <div className="mx-auto max-w-lg text-center py-16">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-700">
              <span className="text-[20px] font-bold">{initials}</span>
            </div>
            <h3 className="mb-2 text-[16px] font-semibold text-neutral-800">
              Talk to your AI Twin
            </h3>
            <p className="mb-6 text-[13px] leading-relaxed text-neutral-500">
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
                  className="rounded-lg border border-neutral-200 bg-white px-3 py-2.5 text-left text-[12.5px] text-neutral-600 transition-all hover:border-neutral-300 hover:bg-neutral-50"
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
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-indigo-100 text-[11px] font-semibold text-indigo-700">
                  {initials}
                </div>
                <div className="max-w-[75%]">
                  <div className="inline-block rounded-2xl rounded-tl-md border border-neutral-100 bg-white px-4 py-3 text-[13px] leading-relaxed text-neutral-700 shadow-sm">
                    <div className="whitespace-pre-line">
                      {streamingContent}
                      <span className="inline-block h-4 w-0.5 animate-pulse bg-neutral-400 align-text-bottom" />
                    </div>
                  </div>
                  {streamingCitations.length > 0 && (
                    <div className="mt-2 space-y-1.5">
                      {streamingCitations.map((c, i) => (
                        <div key={i} className="inline-flex items-start gap-1.5 rounded-lg bg-neutral-50 border border-neutral-200 px-2.5 py-1.5 text-left">
                          <Quote size={10} className="mt-0.5 flex-shrink-0 text-neutral-400" />
                          <div>
                            <span className="text-[10px] font-medium text-neutral-500">{c.source}</span>
                            <p className="mt-0.5 text-[11px] italic text-neutral-500 line-clamp-2">&ldquo;{c.snippet}&rdquo;</p>
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
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-indigo-100 text-[11px] font-semibold text-indigo-700">
                  {initials}
                </div>
                <div className="rounded-2xl rounded-tl-md border border-neutral-100 bg-white px-4 py-3 shadow-sm">
                  <div className="flex items-center gap-1">
                    <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-neutral-400 [animation-delay:0ms]" />
                    <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-neutral-400 [animation-delay:150ms]" />
                    <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-neutral-400 [animation-delay:300ms]" />
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input area */}
      <div className="border-t border-neutral-200 bg-white px-6 py-3">
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
              placeholder="Ask your twin a question…"
              rows={1}
              className="max-h-32 min-h-[40px] flex-1 resize-none rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-2.5 text-[13px] text-neutral-800 placeholder:text-neutral-400 focus:border-indigo-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-100"
            />
            <button
              type="submit"
              disabled={!input.trim() || isStreaming}
              className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-neutral-900 text-white transition-colors hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {isStreaming ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            </button>
          </form>
        ) : (
          /* Voice mode */
          <div className="flex flex-col items-center gap-3 py-4">
            <button
              onClick={isRecording ? stopRecording : startRecording}
              disabled={isStreaming || isTranscribing}
              className={`flex h-16 w-16 items-center justify-center rounded-full transition-all ${
                isRecording
                  ? "bg-red-500 text-white shadow-lg shadow-red-200 animate-pulse"
                  : isTranscribing
                  ? "bg-amber-100 text-amber-600"
                  : "bg-neutral-900 text-white hover:bg-neutral-800 shadow-lg"
              }`}
            >
              {isTranscribing ? (
                <Loader2 size={24} className="animate-spin" />
              ) : isRecording ? (
                <MicOff size={24} />
              ) : (
                <Mic size={24} />
              )}
            </button>
            <p className="text-[12px] text-neutral-500">
              {isRecording
                ? "Recording… tap to stop"
                : isTranscribing
                ? "Transcribing…"
                : isStreaming
                ? "Twin is responding…"
                : "Tap to speak"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
