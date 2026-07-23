"use client";

import { useEffect, useRef, useState } from "react";

const PRESETS = [60, 90, 120, 180];

export interface RestTimerTrigger {
  seconds: number;
  nonce: number;
}

interface RestTimerProps {
  autoStartTrigger: RestTimerTrigger | null;
  autoStartEnabled: boolean;
  onToggleAutoStart: (enabled: boolean) => void;
}

// Sticky at the top of the active workout so it stays visible while
// scrolling through exercises, without ever overlapping the exercise
// content below it — it occupies its own space in the layout, it doesn't
// float on top of anything.
export default function RestTimer({ autoStartTrigger, autoStartEnabled, onToggleAutoStart }: RestTimerProps) {
  const [totalSeconds, setTotalSeconds] = useState(0);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [status, setStatus] = useState<"idle" | "running" | "paused">("idle");

  useEffect(() => {
    if (status !== "running") return;

    const interval = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          setStatus("idle");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [status]);

  const lastNonceRef = useRef<number | null>(null);
  useEffect(() => {
    if (!autoStartTrigger || autoStartTrigger.nonce === lastNonceRef.current) return;
    lastNonceRef.current = autoStartTrigger.nonce;
    setTotalSeconds(autoStartTrigger.seconds);
    setRemainingSeconds(autoStartTrigger.seconds);
    setStatus("running");
  }, [autoStartTrigger]);

  function handlePreset(seconds: number) {
    setTotalSeconds(seconds);
    setRemainingSeconds(seconds);
    setStatus("running");
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
  }

  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;
  const display = `${minutes}:${String(seconds).padStart(2, "0")}`;
  const progress = totalSeconds > 0 ? (totalSeconds - remainingSeconds) / totalSeconds : 0;

  return (
    <div className="sticky top-2 z-10 rounded-2xl border border-slate-200 bg-white p-4 shadow-md">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span
            className="font-mono text-2xl font-bold tabular-nums text-slate-900"
            role="timer"
            aria-live="off"
          >
            {display}
          </span>
          <span className="text-xs text-slate-500">Rest timer</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {PRESETS.map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => handlePreset(preset)}
              className="rounded-full border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600 transition hover:border-teal-300 hover:bg-teal-50"
            >
              {preset}s
            </button>
          ))}
        </div>
      </div>

      {totalSeconds > 0 && (
        <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-teal-500 motion-safe:transition-all motion-safe:duration-1000 motion-safe:ease-linear"
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
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              Pause
            </button>
          )}
          {status === "paused" && (
            <button
              type="button"
              onClick={handleResume}
              className="rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-teal-700"
            >
              Resume
            </button>
          )}
          <button
            type="button"
            onClick={handleReset}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            Reset
          </button>
        </div>

        <label className="flex items-center gap-1.5 text-xs text-slate-500">
          <input
            type="checkbox"
            checked={autoStartEnabled}
            onChange={(e) => onToggleAutoStart(e.target.checked)}
            className="h-3.5 w-3.5 rounded border-slate-300 accent-teal-600"
          />
          Auto-start after each set
        </label>
      </div>
    </div>
  );
}
