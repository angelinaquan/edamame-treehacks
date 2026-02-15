"use client";

import { useEffect, useRef, useState } from "react";
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
  const [transcript, setTranscript] = useState<string>("");
  const [audioLevel, setAudioLevel] = useState(0);
  const [trackInfo, setTrackInfo] = useState<string>("");
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>("");
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number>(0);
  const audioCtxRef = useRef<AudioContext | null>(null);

  // Enumerate audio input devices on mount
  useEffect(() => {
    async function loadDevices() {
      try {
        // Need a brief getUserMedia call to trigger permission so labels appear
        const tempStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        tempStream.getTracks().forEach((t) => t.stop());

        const devices = await navigator.mediaDevices.enumerateDevices();
        const inputs = devices.filter((d) => d.kind === "audioinput");
        setAudioDevices(inputs);
        if (inputs.length > 0 && !selectedDeviceId) {
          setSelectedDeviceId(inputs[0].deviceId);
        }
      } catch {
        // permission denied — we'll surface the error when they try to record
      }
    }
    loadDevices();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function getBestAudioMimeType(): string | undefined {
    const candidates = [
      "audio/webm;codecs=opus",
      "audio/webm",
      "audio/ogg;codecs=opus",
      "audio/mp4",
    ];
    return candidates.find((type) => MediaRecorder.isTypeSupported(type));
  }

  // Live audio level polling via AnalyserNode
  function startLevelMonitor(stream: MediaStream) {
    const ctx = new AudioContext();
    audioCtxRef.current = ctx;
    const source = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 256;
    source.connect(analyser);
    analyserRef.current = analyser;

    const data = new Uint8Array(analyser.frequencyBinCount);
    function poll() {
      analyser.getByteFrequencyData(data);
      // RMS-ish level 0-100
      let sum = 0;
      for (let i = 0; i < data.length; i++) sum += data[i];
      const avg = sum / data.length;
      setAudioLevel(Math.min(100, Math.round((avg / 255) * 100 * 2.5)));
      animFrameRef.current = requestAnimationFrame(poll);
    }
    poll();
  }

  function stopLevelMonitor() {
    cancelAnimationFrame(animFrameRef.current);
    setAudioLevel(0);
    if (audioCtxRef.current) {
      audioCtxRef.current.close().catch(() => {});
      audioCtxRef.current = null;
    }
    analyserRef.current = null;
  }

  const toggleRecording = async () => {
    if (isSaving) return;

    if (isRecording) {
      mediaRecorderRef.current?.stop();
      stopLevelMonitor();
      setIsRecording(false);
      return;
    }

    setError("");
    setStatus("");
    setTranscript("");
    setTrackInfo("");

    try {
      const constraints: MediaStreamConstraints = {
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          ...(selectedDeviceId ? { deviceId: { exact: selectedDeviceId } } : {}),
        },
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);

      // Capture track diagnostics
      const track = stream.getAudioTracks()[0];
      const settings = track.getSettings();
      setTrackInfo(
        `device="${track.label}" muted=${track.muted} enabled=${track.enabled} ` +
        `sampleRate=${settings.sampleRate ?? "?"} channels=${settings.channelCount ?? "?"}`
      );

      // Start live level meter
      startLevelMonitor(stream);

      const mimeType = getBestAudioMimeType();
      const mediaRecorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        const blobType = chunksRef.current[0]?.type || mimeType || "audio/webm";
        const blob = new Blob(chunksRef.current, { type: blobType });
        stream.getTracks().forEach((t) => t.stop());

        setIsSaving(true);
        setStatus("Transcribing and saving...");

        try {
          const formData = new FormData();
          const extension = blobType.includes("ogg")
            ? "ogg"
            : blobType.includes("mp4")
              ? "m4a"
              : "webm";
          formData.append("audio", blob, `meeting-recording.${extension}`);
          formData.append("cloneId", cloneId);
          formData.append("contextScope", "company");
          if (title.trim()) formData.append("title", title.trim());

          const response = await fetch("/api/meetings/transcribe-save", {
            method: "POST",
            body: formData,
          });
          const data = (await response.json()) as {
            error?: string;
            result?: { memory_id?: string };
            transcript?: string;
          };

          if (!response.ok) {
            throw new Error(data.error || "Failed to save meeting transcript");
          }

          setStatus("Meeting transcript saved successfully.");
          setTranscript((data.transcript ?? "").trim());
        } catch (err) {
          setStatus("");
          setError(
            err instanceof Error ? err.message : "Failed to save transcript"
          );
        } finally {
          setIsSaving(false);
        }
      };

      mediaRecorder.start(1000);
      setIsRecording(true);
    } catch {
      setError("Mic access denied or unavailable.");
    }
  };

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
      <h3 className="text-sm font-semibold text-neutral-900">
        Meeting Recorder (Company Context)
      </h3>
      <p className="mt-1 text-xs text-neutral-500">
        Record, transcribe, and store meeting context in Supabase.
      </p>

      {/* Microphone selector */}
      {audioDevices.length > 1 && (
        <div className="mt-3">
          <label className="mb-1 block text-xs text-neutral-500">
            Microphone
          </label>
          <select
            value={selectedDeviceId}
            onChange={(e) => setSelectedDeviceId(e.target.value)}
            disabled={isRecording || isSaving}
            className="w-full rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm outline-none ring-indigo-500 focus:ring-2"
          >
            {audioDevices.map((d) => (
              <option key={d.deviceId} value={d.deviceId}>
                {d.label || `Mic ${d.deviceId.slice(0, 8)}...`}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="mt-3">
        <label className="mb-1 block text-xs text-neutral-500">
          Meeting title (optional)
        </label>
        <input
          type="text"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="e.g. Weekly Product Sync"
          className="w-full rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm outline-none ring-indigo-500 focus:ring-2"
        />
      </div>

      <button
        onClick={toggleRecording}
        disabled={isSaving}
        className={`mt-3 inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors ${
          isRecording
            ? "bg-red-600 hover:bg-red-700"
            : "bg-neutral-900 hover:bg-neutral-800"
        } disabled:cursor-not-allowed disabled:opacity-60`}
      >
        {isRecording ? <MicOff size={16} /> : <Mic size={16} />}
        {isRecording ? "Stop & Save" : isSaving ? "Saving..." : "Start Recording"}
      </button>

      {/* Live audio level meter */}
      {isRecording && (
        <div className="mt-3">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono text-neutral-500">Level</span>
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-neutral-200">
              <div
                className="h-full rounded-full transition-all duration-75"
                style={{
                  width: `${audioLevel}%`,
                  backgroundColor:
                    audioLevel > 50
                      ? "#22c55e"
                      : audioLevel > 15
                        ? "#eab308"
                        : "#ef4444",
                }}
              />
            </div>
            <span className="w-8 text-right text-[10px] font-mono text-neutral-500">
              {audioLevel}%
            </span>
          </div>
          {audioLevel === 0 && (
            <p className="mt-1 text-[10px] text-red-500">
              No audio detected — check that the correct mic is selected and not muted in System Preferences.
            </p>
          )}
        </div>
      )}

      {/* Track diagnostics */}
      {trackInfo && (
        <p className="mt-2 text-[10px] font-mono text-neutral-400">{trackInfo}</p>
      )}

      {status && <p className="mt-3 text-xs text-emerald-600">{status}</p>}
      {error && <p className="mt-3 text-xs text-red-600">{error}</p>}
      {transcript && (
        <div className="mt-3 rounded-lg border border-neutral-200 bg-neutral-50 p-3">
          <p className="mb-1 text-xs font-medium text-neutral-600">
            Transcription preview
          </p>
          <p className="max-h-28 overflow-y-auto text-xs leading-relaxed text-neutral-700">
            {transcript}
          </p>
        </div>
      )}
    </div>
  );
}
