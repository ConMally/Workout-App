import Link from "next/link";
import BrandLogo from "@/components/brand/BrandLogo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center gap-6 px-4 py-12">
      <div className="flex flex-col items-center gap-3 text-center">
        <Link href="/" className="rounded-lg transition hover:opacity-80">
          <BrandLogo wordmark="full" markSize={40} />
        </Link>
        <Link href="/" className="text-sm font-medium text-text-secondary hover:text-accent">
          ← Back to LiftWise
        </Link>
      </div>
      <div className="motion-safe:animate-step-in rounded-[var(--card-radius)] border border-border bg-surface p-6 shadow-sm sm:p-8">
        {children}
      </div>
    </main>
  );
}
