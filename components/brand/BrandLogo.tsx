import BrandMark from "./BrandMark";

interface BrandLogoProps {
  className?: string;
  markSize?: number;
  // "responsive" (default): full "LiftWise" wordmark at sm+ widths, the
  // compact "LW" mark below that — for headers/toolbars where horizontal
  // space is tight on mobile. "full"/"mark" force one or the other for
  // contexts that already know their own width (e.g. a centered auth-page
  // logo, which always has room for the full wordmark).
  wordmark?: "responsive" | "full" | "mark";
  textClassName?: string;
}

// The reusable LiftWise lockup (icon + wordmark) — every branded surface
// (app header, auth pages, loading shell) renders the identity through
// this one component rather than a hand-typed heading string, so the mark
// and the name can never drift out of sync with each other.
export default function BrandLogo({ className = "", markSize = 32, wordmark = "responsive", textClassName = "" }: BrandLogoProps) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <BrandMark size={markSize} />
      {wordmark !== "mark" && (
        <span className={`text-page-title text-text-primary ${textClassName}`}>
          {wordmark === "full" ? (
            "LiftWise"
          ) : (
            <>
              <span className="hidden sm:inline">LiftWise</span>
              <span className="sm:hidden">LW</span>
            </>
          )}
        </span>
      )}
    </span>
  );
}
