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
        className="fixed bottom-4 right-4 z-40 flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-lg transition active:scale-95 hover:border-teal-300 hover:text-teal-700 sm:bottom-6 sm:right-6 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-teal-700"
      >
        <span aria-hidden="true">💬</span>
        Feedback
      </button>

      {open && <FeedbackDialog currentPage={currentPage} onClose={() => setOpen(false)} />}
    </>
  );
}
