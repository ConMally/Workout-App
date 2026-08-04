import type { ReactNode } from "react";

interface PageHeaderProps {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

// Page-level heading (h1) — see SectionHeader for the section-level (h2)
// equivalent used inside a page.
export default function PageHeader({ eyebrow, title, description, action, className = "" }: PageHeaderProps) {
  return (
    <div className={`flex flex-wrap items-start justify-between gap-4 ${className}`}>
      <div className="min-w-0">
        {eyebrow && <p className="text-eyebrow">{eyebrow}</p>}
        <h1 className="text-page-title text-text-primary">{title}</h1>
        {description && <p className="mt-1 text-supporting">{description}</p>}
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  );
}
