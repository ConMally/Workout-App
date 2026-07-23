import Link from "next/link";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center gap-6 px-4 py-12">
      <div className="text-center">
        <Link href="/" className="text-sm font-medium text-slate-500 hover:text-teal-700">
          ← Back to AI Workout Plan Generator
        </Link>
      </div>
      <div className="motion-safe:animate-step-in rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        {children}
      </div>
    </main>
  );
}
