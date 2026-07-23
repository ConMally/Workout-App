import type { ReactNode } from "react";

interface OptionCardProps {
  label: string;
  description?: string;
  icon?: ReactNode;
  selected: boolean;
  onToggle: () => void;
  inputType: "radio" | "checkbox";
  name?: string;
}

// A reusable selectable card used for goal, experience level, and equipment.
// Uses a real (visually hidden) native input for accessible checkbox/radio
// semantics and keyboard support, with a JS-driven checked/selected style so
// the visual state never depends on CSS pseudo-class quirks.
export default function OptionCard({
  label,
  description,
  icon,
  selected,
  onToggle,
  inputType,
  name,
}: OptionCardProps) {
  return (
    <label
      className={`relative flex cursor-pointer flex-col items-center gap-1.5 rounded-xl border-2 px-3 py-4 text-center transition-colors duration-150 ${
        selected
          ? "border-teal-600 bg-teal-50"
          : "border-slate-200 bg-white hover:border-teal-300 hover:bg-teal-50/50"
      }`}
    >
      <input
        type={inputType}
        name={name}
        checked={selected}
        onChange={onToggle}
        className="peer sr-only"
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 rounded-xl ring-teal-500 ring-offset-2 peer-focus-visible:ring-2"
      />
      {icon && (
        <span className={selected ? "text-teal-700" : "text-slate-400"} aria-hidden="true">
          {icon}
        </span>
      )}
      <span className={`text-sm font-semibold ${selected ? "text-teal-900" : "text-slate-800"}`}>
        {label}
      </span>
      {description && (
        <span className={`text-xs leading-snug ${selected ? "text-teal-700" : "text-slate-500"}`}>
          {description}
        </span>
      )}
      {selected && (
        <span className="absolute right-2 top-2 flex h-4 w-4 items-center justify-center rounded-full bg-teal-600 text-white">
          <svg
            viewBox="0 0 12 12"
            className="h-2.5 w-2.5"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M2.5 6.5l2.2 2.2 4.8-5" />
          </svg>
        </span>
      )}
    </label>
  );
}
