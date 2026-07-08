"use client";

// Global error boundary — if anything ever throws at runtime, you get a
// recoverable card instead of a broken page. Local data is untouched.

export default function ErrorBoundary({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
      <div className="text-4xl">🛠️</div>
      <h1 className="text-lg font-semibold">Something glitched, sir.</h1>
      <p className="max-w-md text-[13px] text-zinc-500">
        {error.message?.slice(0, 200) || "An unexpected error occurred."} Your data is safe — it lives on this
        device, not in the page.
      </p>
      <button
        onClick={reset}
        className="rounded-lg bg-emerald-600 px-4 py-2 text-[13px] font-medium text-white hover:bg-emerald-500"
      >
        Reload this page
      </button>
    </div>
  );
}
