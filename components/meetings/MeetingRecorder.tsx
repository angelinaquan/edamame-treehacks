"use client";

import { useRef, useState } from "react";
import { Mic, MicOff } from "lucide-react";

interface MeetingRecorderProps {
  cloneId?: string;
}

export function MeetingRecorder({ cloneId = "auto" }: MeetingRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [title, setTitle] = useState("");
  const [status, setStatus] = useState<string>("");
  const [error, setError] = useState<string>("");
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const toggleRecording = async () => {
    if (isSaving) return;

    if (isRecording) {
      mediaRecorderRef.current?.stop();
      setIsRecording(false);
      return;
    }

    setError("");
    setStatus("");

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        stream.getTracks().forEach((track) => track.stop());
        setIsSaving(true);
        setStatus("Transcribing and saving...");

        try {
          const formData = new FormData();
          formData.append("audio", blob, "meeting-recording.webm");
          formData.append("cloneId", cloneId);
          formData.append("contextScope", "company");
          if (title.trim()) {
            formData.append("title", title.trim());
          }

          const response = await fetch("/api/meetings/transcribe-save", {
            method: "POST",
            body: formData,
          });
          const data = (await response.json()) as {
            error?: string;
            result?: { chunks_created?: number; title?: string };
          };

          if (!response.ok) {
            throw new Error(data.error || "Failed to save meeting transcript");
          }

          const chunks = data.result?.chunks_created ?? 0;
          setStatus(`Saved meeting transcript (${chunks} chunks).`);
        } catch (err) {
          setStatus("");
          setError(
            err instanceof Error ? err.message : "Failed to save transcript"
          );
        } finally {
          setIsSaving(false);
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch {
      setError("Mic access denied or unavailable.");
    }
  };

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
        Meeting Recorder (Company Context)
      </h3>
      <p className="mt-1 text-xs text-zinc-500">
        Record a meeting, auto-transcribe it, and save as shared company context.
      </p>

      <div className="mt-3">
        <label className="mb-1 block text-xs text-zinc-500">
          Meeting title (optional)
        </label>
        <input
          type="text"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="e.g. Weekly Product Sync"
          className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm outline-none ring-blue-500 focus:ring-2 dark:border-zinc-700 dark:bg-zinc-950"
        />
      </div>

      <button
        onClick={toggleRecording}
        disabled={isSaving}
        className={`mt-3 inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors ${
          isRecording
            ? "bg-red-600 hover:bg-red-700"
            : "bg-blue-600 hover:bg-blue-700"
        } disabled:cursor-not-allowed disabled:opacity-60`}
      >
        {isRecording ? <MicOff size={16} /> : <Mic size={16} />}
        {isRecording ? "Stop & Save" : isSaving ? "Saving..." : "Start Recording"}
      </button>

      {status && <p className="mt-3 text-xs text-green-600">{status}</p>}
      {error && <p className="mt-3 text-xs text-red-600">{error}</p>}
    </div>
  );
}
