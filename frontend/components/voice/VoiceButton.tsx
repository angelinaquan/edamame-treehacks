"use client";

import { useState, useRef } from "react";
import { Mic, MicOff, Volume2 } from "lucide-react";
import { Waveform } from "./Waveform";

interface VoiceButtonProps {
  onTranscript: (text: string) => void;
  isPlayingAudio?: boolean;
  size?: "sm" | "md" | "lg";
}

export function VoiceButton({
  onTranscript,
  isPlayingAudio = false,
  size = "md",
}: VoiceButtonProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  function getBestAudioMimeType(): string | undefined {
    const candidates = [
      "audio/webm;codecs=opus",
      "audio/webm",
      "audio/ogg;codecs=opus",
      "audio/mp4",
    ];
    return candidates.find((type) => MediaRecorder.isTypeSupported(type));
  }

  const sizeClasses = {
    sm: "h-10 w-10",
    md: "h-14 w-14",
    lg: "h-20 w-20",
  };

  const iconSizes = {
    sm: 18,
    md: 24,
    lg: 32,
  };

  const toggleRecording = async () => {
    if (isRecording) {
      mediaRecorderRef.current?.stop();
      setIsRecording(false);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      const mimeType = getBestAudioMimeType();
      const mediaRecorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        const blobType = chunksRef.current[0]?.type || mimeType || "audio/webm";
        const blob = new Blob(chunksRef.current, { type: blobType });
        stream.getTracks().forEach((t) => t.stop());
        setIsTranscribing(true);

        try {
          const formData = new FormData();
          const extension = blobType.includes("ogg")
            ? "ogg"
            : blobType.includes("mp4")
              ? "m4a"
              : "webm";
          formData.append("audio", blob, `recording.${extension}`);
          const res = await fetch("/api/voice/transcribe", {
            method: "POST",
            body: formData,
          });
          const { text } = await res.json();
          if (text) onTranscript(text);
        } catch (err) {
          console.error("Transcription failed:", err);
        } finally {
          setIsTranscribing(false);
        }
      };

      mediaRecorder.start(1000);
      setIsRecording(true);
    } catch (err) {
      console.error("Mic access denied:", err);
    }
  };

  if (isPlayingAudio) {
    return (
      <div className="flex flex-col items-center gap-3">
        <div
          className={`flex ${sizeClasses[size]} items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-violet-600 text-white shadow-lg`}
        >
          <Volume2 size={iconSizes[size]} className="animate-pulse" />
        </div>
        <Waveform isActive />
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <button
        onClick={toggleRecording}
        disabled={isTranscribing}
        className={`flex ${sizeClasses[size]} items-center justify-center rounded-full transition-all ${
          isRecording
            ? "bg-red-500 text-white shadow-lg shadow-red-500/30 animate-pulse"
            : isTranscribing
              ? "bg-amber-500 text-white"
              : "bg-gradient-to-br from-blue-500 to-violet-600 text-white shadow-lg hover:shadow-xl hover:scale-105"
        }`}
      >
        {isTranscribing ? (
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
        ) : isRecording ? (
          <MicOff size={iconSizes[size]} />
        ) : (
          <Mic size={iconSizes[size]} />
        )}
      </button>
      {isRecording && <Waveform isActive />}
      <span className="text-xs text-zinc-500">
        {isTranscribing
          ? "Transcribing..."
          : isRecording
            ? "Listening... tap to stop"
            : "Tap to speak"}
      </span>
    </div>
  );
}
