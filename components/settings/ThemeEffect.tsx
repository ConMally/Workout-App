"use client";

import { useEffect } from "react";
import type { AppSettings } from "@/types/workout-log";

interface ThemeEffectProps {
  settings: AppSettings;
}

// Applies the Appearance settings (PART 4 of Phase 7) to <html> as classes —
// dark mode and larger text are picked up globally via app/globals.css's
// `.dark`/`.larger-text` rules and the `@custom-variant dark` selector so
// every `dark:` utility in the app responds to this class instead of the OS
// color-scheme. Renders nothing; mount this once per authenticated shell
// (app/page.tsx, app/account/page.tsx) once settings have loaded.
export default function ThemeEffect({ settings }: ThemeEffectProps) {
  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", settings.darkMode);
    root.classList.toggle("larger-text", settings.largerText);
    root.classList.toggle("compact", settings.compactMode);
  }, [settings.darkMode, settings.largerText, settings.compactMode]);

  return null;
}
