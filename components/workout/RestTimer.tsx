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
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-md dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span
            className={`font-mono text-2xl font-bold tabular-nums transition-colors ${
              isLowTime ? "text-amber-600 dark:text-amber-400" : "text-slate-900 dark:text-slate-100"
            }`}
            role="timer"
            aria-live="off"
          >
            {display}
          </span>
          <span className="text-xs text-slate-500 dark:text-slate-400">Rest timer</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {presets.map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => handlePreset(preset)}
              className={`rounded-full border px-2.5 py-1 text-xs font-medium transition active:scale-95 ${
                preset === defaultSeconds
                  ? "border-teal-300 bg-teal-50 text-teal-700 dark:border-teal-700 dark:bg-teal-950/50 dark:text-teal-300"
                  : "border-slate-200 text-slate-600 hover:border-teal-300 hover:bg-teal-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              }`}
            >
              {preset}s
            </button>
          ))}
        </div>
      </div>

      {totalSeconds > 0 && (
        <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
          <div
            className={`h-full rounded-full motion-safe:transition-all motion-safe:duration-1000 motion-safe:ease-linear ${
              isLowTime ? "bg-amber-500" : "bg-teal-500"
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
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 transition active:scale-95 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Pause
            </button>
          )}
          {status === "paused" && (
            <button
              type="button"
              onClick={handleResume}
              className="rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-semibold text-white transition active:scale-95 hover:bg-teal-700"
            >
              Resume
            </button>
          )}
          <button
            type="button"
            onClick={handleReset}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 transition active:scale-95 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            Reset
          </button>
        </div>

        <label className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
          <input
            type="checkbox"
            checked={autoStartEnabled}
            onChange={(e) => onToggleAutoStart(e.target.checked)}
            className="h-3.5 w-3.5 rounded border-slate-300 accent-teal-600"
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
