interface DividerProps {
  className?: string;
  label?: string;
}

// Plain rule, or (with a label) the "── or ──" pattern already hand-rolled
// in the auth forms.
export default function Divider({ className = "", label }: DividerProps) {
  if (!label) {
    return <hr className={`border-border ${className}`} />;
  }

  return (
    <div className={`flex items-center gap-3 text-xs text-text-muted ${className}`}>
      <span className="h-px flex-1 bg-border" />
      {label}
      <span className="h-px flex-1 bg-border" />
    </div>
  );
}
