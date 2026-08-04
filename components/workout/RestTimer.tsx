"use client";

import { useEffect, useRef, useState } from "react";

const OTHER_PRESETS = [60, 90, 120, 180];
const LOW_TIME_THRESHOLD_SECONDS = 10;

export interface RestTimerTrigger {
  seconds: number;
  nonce: number;
}

interface RestTimerProps {
  autoStartTrigger: RestTimerTrigger | null;
  autoStartEnabled: boolean;
  onToggleAutoStart: (enabled: boolean) => void;
  defaultSeconds?: number;
  soundEnabled?: boolean;
}

// Short, dependency-free beep via the Web Audio API — no audio asset to
// ship or load, gated entirely by the user's Timer sound setting.
function playChime() {
  try {
    const AudioContextCtor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextCtor) return;
    const ctx = new AudioContextCtor();
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.type = "sine";
    oscillator.frequency.value = 880;
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
    oscillator.connect(gain);
    gain.connect(ctx.destination);
    oscillator.start();
    oscillator.stop(ctx.currentTime + 0.4);
    oscillator.onended = () => ctx.close();
  } catch {
    // Web Audio unsupported/blocked — silently skip, never breaks logging.
  }
}

// Rendered inside ActiveWorkout's sticky header block (Phase 6.1), so it
// stays visible while scrolling through a focused exercise without ever
// overlapping the content below it — no sticky positioning of its own here,
// since nesting a second sticky element inside an already-sticky parent
// would just be redundant.
export default function RestTimer({
  autoStartTrigger,
  autoStartEnabled,
  onToggleAutoStart,
  defaultSeconds = 90,
  soundEnabled = true,
}: RestTimerProps) {
  const [totalSeconds, setTotalSeconds] = useState(0);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [status, setStatus] = useState<"idle" | "running" | "paused">("idle");
  const [announcement, setAnnouncement] = useState("");

  useEffect(() => {
    if (status !== "running") return;

    const interval = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          setStatus("idle");
          if (soundEnabled) playChime();
          setAnnouncement("Rest complete");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [status, soundEnabled]);

  const lastNonceRef = useRef<number | null>(null);
  useEffect(() => {
    if (!autoStartTrigger || autoStartTrigger.nonce === lastNonceRef.current) return;
    lastNonceRef.current = autoStartTrigger.nonce;
    setTotalSeconds(autoStartTrigger.seconds);
    setRemainingSeconds(autoStartTrigger.seconds);
    setStatus("running");
    setAnnouncement("");
  }, [autoStartTrigger]);

  function handlePreset(seconds: number) {
    setTotalSeconds(seconds);
    setRemainingSeconds(seconds);
    setStatus("running");
    setAnnouncement("");
  }

  function handlePause() {
    setStatus("paused");
  }

  function handleResume() {
    if (remainingSeconds > 0) setStatus("running");
  }

  function handleReset() {
    setStatus("idle");
    setRemainingSeconds(0);
    setTotalSeconds(0);
    setAnnouncement("");
  }

  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;
  const display = `${minutes}:${String(seconds).padStart(2, "0")}`;
  const progress = totalSeconds > 0 ? (totalSeconds - remainingSeconds) / totalSeconds : 0;
  const isLowTime = status === "running" && remainingSeconds > 0 && remainingSeconds <= LOW_TIME_THRESHOLD_SECONDS;
  const presets = Array.from(new Set([defaultSeconds, ...OTHER_PRESETS]));

  return (
    <div className="rounded-[var(--card-radius)] border border-border bg-surface p-4 shadow-md">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span
            className={`font-mono text-2xl font-bold tabular-nums transition-colors ${
              isLowTime ? "text-warning" : "text-text-primary"
            }`}
            role="timer"
            aria-live="off"
          >
            {display}
          </span>
          <span className="text-xs text-text-muted">Rest timer</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {presets.map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => handlePreset(preset)}
              className={`rounded-full border px-2.5 py-1 text-xs font-medium transition active:scale-95 ${
                preset === defaultSeconds
                  ? "border-accent/40 bg-accent-soft text-accent"
                  : "border-border text-text-secondary hover:border-accent/40 hover:bg-accent-soft"
              }`}
            >
              {preset}s
            </button>
          ))}
        </div>
      </div>

      {totalSeconds > 0 && (
        <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-surface-muted">
          <div
            className={`h-full rounded-full motion-safe:transition-all motion-safe:duration-1000 motion-safe:ease-linear ${
              isLowTime ? "bg-warning" : "bg-accent"
            }`}
            style={{ width: `${progress * 100}%` }}
          />
        </div>
      )}

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2">
          {status === "running" && (
            <button
              type="button"
              onClick={handlePause}
              className="rounded-[var(--control-radius)] border border-border px-3 py-1.5 text-xs font-medium text-text-secondary transition active:scale-95 hover:bg-surface-muted"
            >
              Pause
            </button>
          )}
          {status === "paused" && (
            <button
              type="button"
              onClick={handleResume}
              className="rounded-[var(--control-radius)] bg-accent px-3 py-1.5 text-xs font-semibold text-accent-foreground transition active:scale-95 hover:bg-accent-hover"
            >
              Resume
            </button>
          )}
          <button
            type="button"
            onClick={handleReset}
            className="rounded-[var(--control-radius)] border border-border px-3 py-1.5 text-xs font-medium text-text-secondary transition active:scale-95 hover:bg-surface-muted"
          >
            Reset
          </button>
        </div>

        <label className="flex items-center gap-1.5 text-xs text-text-muted">
          <input
            type="checkbox"
            checked={autoStartEnabled}
            onChange={(e) => onToggleAutoStart(e.target.checked)}
            className="h-3.5 w-3.5 rounded border-border accent-accent"
          />
          Auto-start after each set
        </label>
      </div>

      <div aria-live="polite" className="sr-only">
        {announcement}
      </div>
    </div>
  );
}
