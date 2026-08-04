"use client";

import { useEffect, useId, useRef, useState } from "react";

const LOW_TIME_THRESHOLD_SECONDS = 10;
const AUTO_COLLAPSE_MS = 3000;
const AUTO_HIDE_AFTER_COMPLETE_MS = 2500;
const ADD_SECONDS = 30;

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
// UNCHANGED from Phase 6/10C — Phase 10D does not touch timer calculations.
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

// Phase 10D: rendered as a fixed-position floating overlay (pill when
// collapsed, small panel when expanded) instead of a persistent card in the
// sticky header — it no longer occupies document flow at all, so it can
// never push or shift the exercise-logging layout beneath it, and set
// logging never has to compete with it for screen space. `autoStartEnabled`
// / `onToggleAutoStart` / `defaultSeconds` are accepted (and still passed by
// ActiveWorkout, unchanged) for backward-compatible wiring with the
// Settings-page "Automatic rest timer" toggle, which already governs
// whether a trigger ever arrives here in the first place (see
// ActiveWorkout#handleSetCompleted) — this component no longer needs to
// render its own copy of that switch or the old manual duration-preset
// buttons, since the new design is purely reactive to completed sets, with
// pause/resume/extend/skip on whatever rest period is already running.
export default function RestTimer({ autoStartTrigger, soundEnabled = true }: RestTimerProps) {
  const [totalSeconds, setTotalSeconds] = useState(0);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [status, setStatus] = useState<"idle" | "running" | "paused">("idle");
  const [announcement, setAnnouncement] = useState("");
  const [dismissed, setDismissed] = useState(true);
  const [expanded, setExpanded] = useState(false);

  const panelId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const autoCollapseRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // --------------------------------------------------------------------
  // Timer calculations — byte-for-byte unchanged from the pre-10D version.
  // --------------------------------------------------------------------
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
    // A newly-completed set always surfaces as a fresh collapsed pill, even
    // if a previous rest period's expanded panel happened to still be open.
    setDismissed(false);
    setExpanded(false);
  }, [autoStartTrigger]);

  // --------------------------------------------------------------------
  // New in 10D: presentation/visibility lifecycle only — never touches how
  // remainingSeconds is computed above.
  // --------------------------------------------------------------------

  // Auto-hide the pill a couple of seconds after the countdown reaches
  // zero on its own (as opposed to being explicitly skipped, which hides
  // immediately) — gives "Rest complete" a brief beat to register.
  useEffect(() => {
    if (status !== "idle" || remainingSeconds !== 0 || totalSeconds === 0 || dismissed) return;
    const timeout = setTimeout(() => {
      setDismissed(true);
      setExpanded(false);
    }, AUTO_HIDE_AFTER_COMPLETE_MS);
    return () => clearTimeout(timeout);
  }, [status, remainingSeconds, totalSeconds, dismissed]);

  function scheduleAutoCollapse() {
    if (autoCollapseRef.current) clearTimeout(autoCollapseRef.current);
    autoCollapseRef.current = setTimeout(() => setExpanded(false), AUTO_COLLAPSE_MS);
  }

  // Auto-collapse the expanded panel back to a pill after ~3s of no
  // interaction; reset by scheduleAutoCollapse() on every click inside the
  // panel (see the panel's onClick below). The countdown itself is
  // completely unaffected — only the panel/pill presentation collapses.
  useEffect(() => {
    if (!expanded) return;
    scheduleAutoCollapse();
    return () => {
      if (autoCollapseRef.current) clearTimeout(autoCollapseRef.current);
    };
  }, [expanded]);

  // Dismiss the expanded panel on outside click or Escape — never a
  // full-screen backdrop (nothing should ever block tapping a weight/reps
  // field elsewhere on the screen), just a document-level listener scoped
  // to while the panel is open.
  useEffect(() => {
    if (!expanded) return;
    function handlePointerDown(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setExpanded(false);
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setExpanded(false);
    }
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [expanded]);

  function handlePause() {
    setStatus("paused");
  }

  function handleResume() {
    if (remainingSeconds > 0) setStatus("running");
  }

  // New in 10D — extends the current rest period without touching the
  // decrement mechanics; if the countdown had already finished, adding
  // time resumes it.
  function handleAddThirty() {
    setTotalSeconds((prev) => prev + ADD_SECONDS);
    setRemainingSeconds((prev) => prev + ADD_SECONDS);
    setStatus((prev) => (prev === "idle" ? "running" : prev));
  }

  // Ends the rest period early and fully hides the floating timer (equivalent
  // to the pre-10D "Reset" action, relabeled to match this screen's
  // "Skip Rest" language).
  function handleSkip() {
    setStatus("idle");
    setRemainingSeconds(0);
    setTotalSeconds(0);
    setAnnouncement("");
    setDismissed(true);
    setExpanded(false);
  }

  // Collapses the panel back to the pill only — the countdown keeps running
  // uninterrupted in the background.
  function handleClose() {
    setExpanded(false);
  }

  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;
  const display = `${minutes}:${String(seconds).padStart(2, "0")}`;
  const progress = totalSeconds > 0 ? (totalSeconds - remainingSeconds) / totalSeconds : 0;
  const isLowTime = status === "running" && remainingSeconds > 0 && remainingSeconds <= LOW_TIME_THRESHOLD_SECONDS;
  const visible = totalSeconds > 0 && !dismissed;

  return (
    <>
      {/* Always mounted regardless of pill/panel visibility so "Rest
          complete" is announced even if the auto-hide timeout has already
          cleared the pill from the screen. */}
      <div aria-live="polite" className="sr-only">
        {announcement}
      </div>

      {visible && (
        <div className="fixed bottom-[calc(5rem+env(safe-area-inset-bottom))] right-4 z-30 sm:bottom-6 sm:right-6">
          {expanded ? (
            <div
              ref={panelRef}
              id={panelId}
              role="group"
              aria-label="Rest timer controls"
              onClick={scheduleAutoCollapse}
              className="motion-safe:animate-scale-in flex w-60 flex-col gap-3 rounded-[var(--card-radius)] border border-border bg-surface-elevated p-4 shadow-lg"
            >
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-label">Rest Timer</h2>
                <button
                  type="button"
                  onClick={handleClose}
                  aria-label="Close rest timer panel"
                  className="rounded-md p-1 text-text-muted transition hover:bg-surface-muted hover:text-text-secondary focus:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
                >
                  ✕
                </button>
              </div>

              <span
                className={`text-center font-mono text-3xl font-bold tabular-nums transition-colors ${
                  isLowTime ? "text-warning" : "text-text-primary"
                }`}
                role="timer"
                aria-live="off"
              >
                {display}
              </span>

              {totalSeconds > 0 && (
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-muted">
                  <div
                    className={`h-full rounded-full motion-safe:transition-all motion-safe:duration-1000 motion-safe:ease-linear ${
                      isLowTime ? "bg-warning" : "bg-accent"
                    }`}
                    style={{ width: `${progress * 100}%` }}
                  />
                </div>
              )}

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleAddThirty}
                  className="flex-1 rounded-[var(--control-radius)] border border-border px-3 py-2 text-xs font-medium text-text-secondary transition active:scale-95 hover:bg-surface-muted"
                >
                  +30 sec
                </button>
                {status === "running" ? (
                  <button
                    type="button"
                    onClick={handlePause}
                    className="flex-1 rounded-[var(--control-radius)] border border-border px-3 py-2 text-xs font-medium text-text-secondary transition active:scale-95 hover:bg-surface-muted"
                  >
                    Pause
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleResume}
                    disabled={remainingSeconds <= 0}
                    className="flex-1 rounded-[var(--control-radius)] bg-accent px-3 py-2 text-xs font-semibold text-accent-foreground transition active:scale-95 hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Resume
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={handleSkip}
                className="rounded-[var(--control-radius)] border border-border px-3 py-2 text-xs font-medium text-text-secondary transition active:scale-95 hover:bg-surface-muted"
              >
                Skip Rest
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setExpanded(true)}
              aria-expanded={expanded}
              aria-controls={panelId}
              aria-label={`Rest timer, ${display} remaining${status === "paused" ? ", paused" : ""} — tap to expand`}
              className={`motion-safe:animate-scale-in flex items-center gap-1.5 rounded-full border px-4 py-2.5 text-sm font-semibold shadow-lg transition motion-safe:active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
                status === "paused"
                  ? "border-border bg-surface-elevated text-text-secondary hover:bg-surface-muted"
                  : "border-accent/30 bg-surface-elevated text-accent hover:bg-accent-soft"
              }`}
            >
              <span aria-hidden="true">⏱</span>
              Rest {display}
              {status === "paused" && <span className="text-xs font-normal text-text-muted">(paused)</span>}
            </button>
          )}
        </div>
      )}
    </>
  );
}
