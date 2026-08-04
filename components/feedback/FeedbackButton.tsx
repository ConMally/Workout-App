"use client";

import { useState } from "react";
import dynamic from "next/dynamic";

const FeedbackDialog = dynamic(() => import("./FeedbackDialog"));

interface FeedbackButtonProps {
  currentPage: string;
}

// PART 2 — a persistent, unobtrusive entry point available from anywhere
// in the signed-in app (rendered once in app/page.tsx's shell), rather than
// a nav tab that would compete with the app's actual features for space.
export default function FeedbackButton({ currentPage }: FeedbackButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-4 right-4 z-40 flex items-center gap-1.5 rounded-full border border-border bg-surface px-4 py-2.5 text-sm font-medium text-text-secondary shadow-lg transition motion-safe:active:scale-95 hover:border-accent/40 hover:text-accent sm:bottom-6 sm:right-6"
      >
        <span aria-hidden="true">💬</span>
        Feedback
      </button>

      {open && <FeedbackDialog currentPage={currentPage} onClose={() => setOpen(false)} />}
    </>
  );
}
