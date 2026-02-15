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
  Volume2,
} from "lucide-react";
import { fetchCloneProfiles, streamCloneChat } from "@/lib/orgpulse/api";
import type {
  ChatMessage,
  Citation,
  CloneProfile,
} from "@/lib/orgpulse/types";

// ---- VAD tuning constants ----
const VAD_THRESHOLD = 0.04; // RMS volume to consider as speech (stricter)
const VAD_SPEECH_MIN_MS = 280; // sustained speech before triggering capture (slightly longer)
const VAD_SILENCE_MS = 1300; // silence duration to auto-stop capture (slightly shorter for quicker reset)
const VAD_INTERRUPT_THRESHOLD = 0.055; // higher bar while TTS is playing
const VAD_INTERRUPT_MIN_MS = 360; // require longer speech to barge-in

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

interface SendMessageOptions {
  source?: "text" | "audio";
  audioInputSeq?: number;
}

export function EmployeeChatView({ demoTrigger }: EmployeeChatViewProps) {
  const [profile, setProfile] = useState<CloneProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [streamingContent, setStreamingContent] = useState("");
  const [streamingCitations, setStreamingCitations] = useState<Citation[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [input, setInput] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false); // VAD-triggered capture in progress
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>("");
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [isListening, setIsListening] = useState(false); // persistent mic stream active
  const abortRef = useRef<AbortController | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Persistent mic stream refs (always-on in voice mode)
  const persistentStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const vadFrameRef = useRef<number | null>(null);
  const speechStartRef = useRef<number | null>(null); // timestamp when speech volume first exceeded threshold
  const silenceStartRef = useRef<number | null>(null); // timestamp when volume dropped below threshold
  const latestAudioInputSeqRef = useRef(0);
  const ttsRequestSeqRef = useRef(0);
  const activeTtsUrlRef = useRef<string | null>(null);

  // Refs to avoid stale closures in recording callbacks
  const isStreamingRef = useRef(false);
  const isPlayingAudioRef = useRef(false);
  const isCapturingRef = useRef(false);
  const isTranscribingRef = useRef(false);
  const messagesRef = useRef<ChatMessage[]>([]);

  // Keep refs in sync
  useEffect(() => { isStreamingRef.current = isStreaming; }, [isStreaming]);
  useEffect(() => { isPlayingAudioRef.current = isPlayingAudio; }, [isPlayingAudio]);
  useEffect(() => { isCapturingRef.current = isCapturing; }, [isCapturing]);
  useEffect(() => { isTranscribingRef.current = isTranscribing; }, [isTranscribing]);
  useEffect(() => { messagesRef.current = messages; }, [messages]);

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

  // TTS: speak the assistant's response aloud
  // The VAD loop handles barge-in; onended just resets playback state.
  const speakText = useCallback(async (text: string, audioInputSeq: number) => {
    if (!text.trim()) return;
    if (audioInputSeq !== latestAudioInputSeqRef.current) return;

    const requestSeq = ++ttsRequestSeqRef.current;
    try {
      setIsPlayingAudio(true);
      // Stop any currently playing audio
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
        audioRef.current = null;
      }
      if (activeTtsUrlRef.current) {
        URL.revokeObjectURL(activeTtsUrlRef.current);
        activeTtsUrlRef.current = null;
      }

      const res = await fetch("/api/voice/synthesize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      if (!res.ok) throw new Error("TTS failed");

      // Drop stale synth responses. Only newest request is allowed to play.
      if (requestSeq !== ttsRequestSeqRef.current) {
        setIsPlayingAudio(false);
        return;
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      activeTtsUrlRef.current = url;
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.onended = () => {
        if (requestSeq !== ttsRequestSeqRef.current) return;
        setIsPlayingAudio(false);
        if (activeTtsUrlRef.current === url) {
          URL.revokeObjectURL(url);
          activeTtsUrlRef.current = null;
        }
        audioRef.current = null;
        // No auto-start recording here — the persistent mic + VAD handles it
      };
      audio.onerror = () => {
        if (requestSeq !== ttsRequestSeqRef.current) return;
        setIsPlayingAudio(false);
        if (activeTtsUrlRef.current === url) {
          URL.revokeObjectURL(url);
          activeTtsUrlRef.current = null;
        }
        audioRef.current = null;
      };
      await audio.play();
    } catch {
      if (requestSeq === ttsRequestSeqRef.current) {
        setIsPlayingAudio(false);
      }
    }
  }, []);

  const sendMessage = useCallback(
    async (question: string, options?: SendMessageOptions) => {
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

        // Auto-speak for conversational (voice-originated) turns only
        if (
          options?.source === "audio" &&
          options.audioInputSeq === latestAudioInputSeqRef.current &&
          accumulated.trim()
        ) {
          speakText(accumulated, options.audioInputSeq);
        }
      } catch {
        // aborted
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

  // ---- Transcribe and send captured audio ----
  const transcribeAndSend = useCallback(async (audioBlob: Blob, mimeType: string) => {
    if (audioBlob.size === 0) {
      console.warn("[voice] Empty audio blob, skipping transcription");
      return;
    }
    setIsTranscribing(true);
    try {
      const ext = mimeType.includes("ogg") ? "ogg" : mimeType.includes("mp4") ? "m4a" : "webm";
      const formData = new FormData();
      formData.append("audio", audioBlob, `recording.${ext}`);
      const res = await fetch("/api/voice/transcribe", {
        method: "POST",
        body: formData,
      });
      if (res.ok) {
        const data = await res.json();
        if (data.text?.trim()) {
          const audioInputSeq = latestAudioInputSeqRef.current + 1;
          latestAudioInputSeqRef.current = audioInputSeq;
          sendMessage(data.text.trim(), { source: "audio", audioInputSeq });
        }
      }
    } catch {
      // transcription failed
    }
    setIsTranscribing(false);
  }, [sendMessage]);

  // ---- Start capture: create MediaRecorder on the persistent stream ----
  const startCapture = useCallback(() => {
    const stream = persistentStreamRef.current;
    if (!stream || isCapturingRef.current) return;
    if (mediaRecorderRef.current?.state === "recording") return;

    const mimeType = ["audio/mp4", "audio/webm;codecs=opus", "audio/webm", "audio/ogg;codecs=opus"]
      .find((t) => MediaRecorder.isTypeSupported(t)) || "audio/webm";

    const mediaRecorder = new MediaRecorder(stream, { mimeType });
    mediaRecorderRef.current = mediaRecorder;
    chunksRef.current = [];
    isCapturingRef.current = true;

    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };

    mediaRecorder.onstop = () => {
      const blobType = chunksRef.current[0]?.type || mimeType;
      const audioBlob = new Blob(chunksRef.current, { type: blobType });
      isCapturingRef.current = false;
      setIsCapturing(false);
      setIsRecording(false);
      // Reset VAD timing so it can detect the next utterance
      speechStartRef.current = null;
      silenceStartRef.current = null;
      transcribeAndSend(audioBlob, blobType);
    };

    mediaRecorder.start(1000);
    setIsCapturing(true);
    setIsRecording(true);
  }, [transcribeAndSend]);

  // ---- Stop capture: stop MediaRecorder (persistent stream stays open) ----
  const stopCapture = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.requestData();
      mediaRecorderRef.current.stop();
    }
  }, []);

  // ---- Manual recording fallback ----
  const startRecording = useCallback(async () => {
    // If persistent stream is active, delegate to startCapture
    if (persistentStreamRef.current) {
      startCapture();
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          ...(selectedDeviceId ? { deviceId: { exact: selectedDeviceId } } : {}),
        },
      });

      const mimeType = ["audio/mp4", "audio/webm;codecs=opus", "audio/webm", "audio/ogg;codecs=opus"]
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
        transcribeAndSend(audioBlob, blobType);
      };

      mediaRecorder.start(1000);
      setIsRecording(true);
    } catch {
      // mic access denied
    }
  }, [transcribeAndSend, selectedDeviceId, startCapture]);

  const stopRecording = useCallback(() => {
    // If persistent stream is active, delegate to stopCapture
    if (persistentStreamRef.current) {
      stopCapture();
      return;
    }
    if (mediaRecorderRef.current && isRecording) {
      if (mediaRecorderRef.current.state === "recording") {
        mediaRecorderRef.current.requestData();
      }
      mediaRecorderRef.current.stop();
    }
  }, [isRecording, stopCapture]);

  // ---- Interrupt TTS (barge-in) ----
  const interruptTTS = useCallback(() => {
    ttsRequestSeqRef.current += 1;
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
    if (activeTtsUrlRef.current) {
      URL.revokeObjectURL(activeTtsUrlRef.current);
      activeTtsUrlRef.current = null;
    }
    setIsPlayingAudio(false);
  }, []);

  // ---- Persistent mic stream + VAD loop ----
  useEffect(() => {
    let cancelled = false;

    async function openMic() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
            ...(selectedDeviceId ? { deviceId: { exact: selectedDeviceId } } : {}),
          },
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        persistentStreamRef.current = stream;

        // Set up Web Audio analyser
        const ctx = new AudioContext();
        const source = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 2048;
        analyser.smoothingTimeConstant = 0.3;
        source.connect(analyser);
        audioContextRef.current = ctx;
        analyserRef.current = analyser;

        setIsListening(true);

        // Start VAD loop
        const dataArray = new Float32Array(analyser.fftSize);

        function vadLoop() {
          if (cancelled) return;

          analyser.getFloatTimeDomainData(dataArray);

          // Compute RMS volume
          let sum = 0;
          for (let i = 0; i < dataArray.length; i++) {
            sum += dataArray[i] * dataArray[i];
          }
          const rms = Math.sqrt(sum / dataArray.length);
          const now = Date.now();

          const isTtsPlaying = isPlayingAudioRef.current;
          const activeThreshold = isTtsPlaying ? VAD_INTERRUPT_THRESHOLD : VAD_THRESHOLD;
          const activeSpeechMinMs = isTtsPlaying ? VAD_INTERRUPT_MIN_MS : VAD_SPEECH_MIN_MS;

          if (rms >= activeThreshold) {
            // Sound detected
            silenceStartRef.current = null;

            if (speechStartRef.current === null) {
              speechStartRef.current = now;
            }

            const speechDuration = now - speechStartRef.current;

            // Sustained speech detected — trigger barge-in or start capture
            if (speechDuration >= activeSpeechMinMs) {
              // Barge-in: interrupt TTS if playing
              if (isTtsPlaying) {
                interruptTTS();
              }

              // Start capture if idle. Avoid starting while streaming/transcribing.
              if (
                !isCapturingRef.current &&
                !isStreamingRef.current &&
                !isTranscribingRef.current
              ) {
                startCapture();
              }
            }
          } else {
            // Silence
            speechStartRef.current = null;

            // If currently capturing, track silence to auto-stop
            if (isCapturingRef.current) {
              if (silenceStartRef.current === null) {
                silenceStartRef.current = now;
              }
              const silenceDuration = now - silenceStartRef.current;
              if (silenceDuration >= VAD_SILENCE_MS) {
                // Auto-stop capture
                stopCapture();
                silenceStartRef.current = null;
              }
            } else {
              silenceStartRef.current = null;
            }
          }

          vadFrameRef.current = requestAnimationFrame(vadLoop);
        }

        vadFrameRef.current = requestAnimationFrame(vadLoop);
      } catch {
        // mic access denied
        setIsListening(false);
      }
    }

    openMic();

    return () => {
      cancelled = true;
      if (vadFrameRef.current != null) {
        cancelAnimationFrame(vadFrameRef.current);
        vadFrameRef.current = null;
      }
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {});
        audioContextRef.current = null;
        analyserRef.current = null;
      }
      if (persistentStreamRef.current) {
        persistentStreamRef.current.getTracks().forEach((t) => t.stop());
        persistentStreamRef.current = null;
      }
      setIsListening(false);
    };
  }, [interruptTTS, selectedDeviceId, startCapture, stopCapture]);

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

        <span className="rounded-full border border-neutral-200 bg-neutral-50 px-3 py-1 text-[11px] font-medium text-neutral-600">
          Type or speak
        </span>
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
        <div className="space-y-2">
          {/* Microphone selector */}
          {audioDevices.length > 0 && (
            <select
              value={selectedDeviceId}
              onChange={(e) => setSelectedDeviceId(e.target.value)}
              disabled={isCapturing || isTranscribing}
              className="w-64 rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-1.5 text-[12px] text-neutral-600 outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
            >
              {audioDevices.map((d) => (
                <option key={d.deviceId} value={d.deviceId}>
                  {d.label || `Mic ${d.deviceId.slice(0, 8)}…`}
                </option>
              ))}
            </select>
          )}

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
              placeholder="Ask your twin a question or speak…"
              rows={1}
              className="max-h-32 min-h-[40px] flex-1 resize-none rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-2.5 text-[13px] text-neutral-800 placeholder:text-neutral-400 focus:border-indigo-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-100"
            />
            <button
              type="submit"
              disabled={!input.trim() || isStreaming}
              className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-neutral-900 text-white transition-colors hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-40"
              title="Send message"
            >
              {isStreaming ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            </button>
            <button
              type="button"
              onClick={() => {
                if (isPlayingAudio) {
                  // Manual barge-in: tap to interrupt TTS
                  interruptTTS();
                  // Start capturing immediately for the next turn.
                  if (
                    persistentStreamRef.current &&
                    !isCapturingRef.current &&
                    !isTranscribingRef.current &&
                    !isStreamingRef.current
                  ) {
                    speechStartRef.current = null;
                    silenceStartRef.current = null;
                    startCapture();
                  }
                } else if (isCapturing) {
                  // Manual stop capture
                  stopCapture();
                } else if (!isListening) {
                  // Fallback: start recording manually
                  startRecording();
                }
                // If listening (idle), VAD handles capture automatically — button is informational
              }}
              disabled={isTranscribing}
              className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl transition-all ${
                isPlayingAudio
                  ? "bg-gradient-to-br from-blue-500 to-violet-600 text-white shadow-lg shadow-blue-200 animate-pulse cursor-pointer"
                  : isCapturing || isRecording
                  ? "bg-red-500 text-white shadow-lg shadow-red-200 animate-pulse"
                  : isTranscribing
                  ? "bg-amber-100 text-amber-600"
                  : isListening
                  ? "bg-emerald-600 text-white shadow-lg shadow-emerald-200"
                  : "bg-neutral-900 text-white hover:bg-neutral-800 shadow-lg"
              }`}
              title="Voice input"
            >
              {isPlayingAudio ? (
                <Volume2 size={18} />
              ) : isTranscribing ? (
                <Loader2 size={18} className="animate-spin" />
              ) : isCapturing || isRecording ? (
                <MicOff size={18} />
              ) : (
                <Mic size={18} />
              )}
            </button>
          </form>

          <p className="text-[12px] text-neutral-500">
            {isPlayingAudio
              ? "Speaking… say something or tap mic to interrupt"
              : isCapturing || isRecording
              ? "Recording…"
              : isTranscribing
              ? "Transcribing…"
              : isStreaming
              ? "Twin is responding…"
              : isListening
              ? "Listening…"
              : "Starting mic…"}
          </p>
        </div>
      </div>
    </div>
  );
}
