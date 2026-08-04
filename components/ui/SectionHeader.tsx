import type { ReactNode } from "react";

interface SectionHeaderProps {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

// Section-level heading (h2) — see PageHeader for the page-level (h1)
// equivalent. Kept as two separate components rather than a `level` prop
// so each renders the semantically correct heading tag without a caller
// having to remember to pass it.
export default function SectionHeader({ eyebrow, title, description, action, className = "" }: SectionHeaderProps) {
  return (
    <div className={`flex flex-wrap items-start justify-between gap-3 ${className}`}>
      <div className="min-w-0">
        {eyebrow && <p className="text-eyebrow">{eyebrow}</p>}
        <h2 className="text-section-heading text-text-primary">{title}</h2>
        {description && <p className="mt-0.5 text-supporting">{description}</p>}
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  );
}
