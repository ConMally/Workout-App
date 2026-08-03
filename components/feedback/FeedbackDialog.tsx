"use client";

import { useRef, useState } from "react";
import type { FeedbackType } from "@/types/beta";
import { useRepositories } from "@/lib/repositories/useRepositories";
import { useFocusTrap } from "@/lib/useFocusTrap";
import { getFriendlyDataErrorMessage } from "@/lib/supabase/data-errors";
import { APP_VERSION } from "@/lib/version";

interface FeedbackDialogProps {
  currentPage: string;
  onClose: () => void;
}

const TYPE_OPTIONS: { value: FeedbackType; label: string }[] = [
  { value: "bug", label: "Report a bug" },
  { value: "feature", label: "Request a feature" },
  { value: "general", label: "General feedback" },
];

const MAX_SCREENSHOT_BYTES = 5 * 1024 * 1024;

// PART 2: bug/feature/general feedback, captured alongside the context
// that makes it actionable later (current page, app version, browser/device
// info) without asking the user to type any of that themselves. Screenshot
// upload is real (not a stub) — see
// lib/repositories/supabase/feedback-repository.ts#uploadScreenshot and
// migration 0011's private feedback-screenshots bucket.
export default function FeedbackDialog({ currentPage, onClose }: FeedbackDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  useFocusTrap(dialogRef, true);
  const reposState = useRepositories();

  const [type, setType] = useState<FeedbackType>("bug");
  const [message, setMessage] = useState("");
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "submitting" | "done">("idle");
  const [error, setError] = useState<string | null>(null);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") onClose();
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    if (file && file.size > MAX_SCREENSHOT_BYTES) {
      setFileError("Screenshot must be under 5 MB.");
      setScreenshot(null);
      return;
    }
    setFileError(null);
    setScreenshot(file);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (reposState.status !== "ready" || !message.trim()) return;
    const { repositories, userId } = reposState;

    setStatus("submitting");
    setError(null);

    try {
      const screenshotPath = screenshot ? await repositories.feedback.uploadScreenshot(userId, screenshot) : null;
      await repositories.feedback.submitFeedback(userId, {
        type,
        message: message.trim(),
        rating: null,
        page: currentPage,
        appVersion: APP_VERSION,
        userAgent: navigator.userAgent,
        screenshotPath,
      });
      setStatus("done");
    } catch (err) {
      setStatus("idle");
      setError(getFriendlyDataErrorMessage(err));
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 px-4 sm:items-center"
      role="presentation"
      onClick={onClose}
      onKeyDown={handleKeyDown}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="feedback-dialog-title"
        onClick={(e) => e.stopPropagation()}
        className="motion-safe:animate-scale-in flex max-h-[85vh] w-full max-w-md flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg dark:border-slate-800 dark:bg-slate-900"
      >
        {status === "done" ? (
          <div className="flex flex-col items-center gap-3 p-8 text-center">
            <span aria-hidden="true" className="text-3xl">
              🙏
            </span>
            <h2 id="feedback-dialog-title" className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              Thanks for the feedback!
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">We read every submission.</p>
            <button
              type="button"
              onClick={onClose}
              className="mt-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-teal-700"
            >
              Close
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-1 flex-col overflow-hidden">
            <div className="border-b border-slate-100 p-5 dark:border-slate-800">
              <h2 id="feedback-dialog-title" className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                Send feedback
              </h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Bugs, ideas, or anything else — it goes straight to the team building this.
              </p>
            </div>

            <div className="flex-1 overflow-y-auto p-5">
              <fieldset className="flex flex-col gap-2">
                <legend className="text-xs font-medium text-slate-600 dark:text-slate-300">Type</legend>
                <div className="flex flex-wrap gap-2">
                  {TYPE_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setType(option.value)}
                      aria-pressed={type === option.value}
                      className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition active:scale-95 ${
                        type === option.value
                          ? "border-teal-600 bg-teal-600 text-white"
                          : "border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </fieldset>

              <label htmlFor="feedback-message" className="mt-4 block text-xs font-medium text-slate-600 dark:text-slate-300">
                What&apos;s on your mind?
                <textarea
                  id="feedback-message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  required
                  rows={4}
                  maxLength={4000}
                  placeholder={
                    type === "bug"
                      ? "What happened, and what did you expect instead?"
                      : type === "feature"
                        ? "What would you like to be able to do?"
                        : "Anything you'd like us to know."
                  }
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/30 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                />
              </label>

              <label htmlFor="feedback-screenshot" className="mt-4 block text-xs font-medium text-slate-600 dark:text-slate-300">
                Screenshot (optional)
                <input
                  id="feedback-screenshot"
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="mt-1 block w-full text-xs text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-slate-700 hover:file:bg-slate-200 dark:text-slate-400 dark:file:bg-slate-800 dark:file:text-slate-300"
                />
              </label>
              {screenshot && <p className="mt-1 text-xs text-slate-400">Attached: {screenshot.name}</p>}
              {fileError && <p className="mt-1 text-xs text-red-600">{fileError}</p>}

              {error && (
                <p role="alert" className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700 dark:bg-red-950/40 dark:text-red-300">
                  {error}
                </p>
              )}
            </div>

            <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 p-4 dark:border-slate-800">
              <button
                type="button"
                onClick={onClose}
                disabled={status === "submitting"}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={status === "submitting" || !message.trim()}
                className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition active:scale-95 hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {status === "submitting" ? "Sending…" : "Send feedback"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
