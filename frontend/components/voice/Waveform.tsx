"use client";

interface WaveformProps {
  isActive: boolean;
}

export function Waveform({ isActive }: WaveformProps) {
  return (
    <div className="flex items-center gap-[3px] h-8">
      {Array.from({ length: 20 }).map((_, i) => (
        <div
          key={i}
          className={`w-[3px] rounded-full transition-all ${
            isActive
              ? "bg-blue-500 dark:bg-blue-400"
              : "bg-zinc-300 dark:bg-zinc-600"
          }`}
          style={{
            height: isActive
              ? `${Math.max(8, Math.sin((i * Math.PI) / 5) * 28 + 12)}px`
              : "4px",
            animationName: isActive ? "waveform" : "none",
            animationDuration: `${0.5 + Math.random() * 0.5}s`,
            animationTimingFunction: "ease-in-out",
            animationIterationCount: "infinite",
            animationDirection: "alternate",
            animationDelay: `${i * 0.05}s`,
          }}
        />
      ))}
    </div>
  );
}
