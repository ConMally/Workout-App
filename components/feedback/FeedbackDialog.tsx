"use client";

import { useState } from "react";
import type { FeedbackType } from "@/types/beta";
import { useRepositories } from "@/lib/repositories/useRepositories";
import { getFriendlyDataErrorMessage } from "@/lib/supabase/data-errors";
import { APP_VERSION } from "@/lib/version";
import Dialog from "@/components/ui/Dialog";
import Button from "@/components/ui/Button";

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
  const reposState = useRepositories();

  const [type, setType] = useState<FeedbackType>("bug");
  const [message, setMessage] = useState("");
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "submitting" | "done">("idle");
  const [error, setError] = useState<string | null>(null);

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
    <Dialog onClose={onClose} titleId="feedback-dialog-title" className="max-h-[85vh] max-w-md">
      {status === "done" ? (
        <div className="flex flex-col items-center gap-3 p-8 text-center">
          <span aria-hidden="true" className="text-3xl">
            🙏
          </span>
          <h2 id="feedback-dialog-title" className="text-section-heading text-text-primary">
            Thanks for the feedback!
          </h2>
          <p className="text-sm text-text-muted">We read every submission.</p>
          <Button type="button" variant="primary" onClick={onClose} className="mt-2">
            Close
          </Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-1 flex-col overflow-hidden">
          <div className="border-b border-border p-5">
            <h2 id="feedback-dialog-title" className="text-section-heading text-text-primary">
              Send feedback
            </h2>
            <p className="mt-1 text-supporting">
              Bugs, ideas, or anything else — it goes straight to the team building this.
            </p>
          </div>

          <div className="flex-1 overflow-y-auto p-5">
            <fieldset className="flex flex-col gap-2">
              <legend className="text-xs font-medium text-text-secondary">Type</legend>
              <div className="flex flex-wrap gap-2">
                {TYPE_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setType(option.value)}
                    aria-pressed={type === option.value}
                    className={`rounded-[var(--control-radius)] border px-3 py-1.5 text-xs font-semibold transition motion-safe:active:scale-95 ${
                      type === option.value
                        ? "border-accent bg-accent text-accent-foreground"
                        : "border-border text-text-secondary hover:bg-surface-muted"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </fieldset>

            <label htmlFor="feedback-message" className="mt-4 block text-xs font-medium text-text-secondary">
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
                className="mt-1 w-full rounded-[var(--control-radius)] border border-border bg-surface px-3 py-2 text-sm text-text-primary focus:border-accent focus:outline-none focus:ring-2 focus:ring-focus-ring/30"
              />
            </label>

            <label htmlFor="feedback-screenshot" className="mt-4 block text-xs font-medium text-text-secondary">
              Screenshot (optional)
              <input
                id="feedback-screenshot"
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="mt-1 block w-full text-xs text-text-secondary file:mr-3 file:rounded-[var(--control-radius)] file:border-0 file:bg-surface-muted file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-text-secondary hover:file:bg-border"
              />
            </label>
            {screenshot && <p className="mt-1 text-xs text-text-muted">Attached: {screenshot.name}</p>}
            {fileError && <p className="mt-1 text-xs text-danger">{fileError}</p>}

            {error && (
              <p role="alert" className="mt-3 rounded-[var(--control-radius)] bg-danger-soft px-3 py-2 text-xs text-danger">
                {error}
              </p>
            )}
          </div>

          <div className="flex flex-wrap justify-end gap-2 border-t border-border p-4">
            <Button type="button" variant="secondary" onClick={onClose} disabled={status === "submitting"}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={!message.trim()} loading={status === "submitting"}>
              {status === "submitting" ? "Sending…" : "Send feedback"}
            </Button>
          </div>
        </form>
      )}
    </Dialog>
  );
}
