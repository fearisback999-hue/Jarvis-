import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
      <div className="text-4xl">🧭</div>
      <h1 className="text-lg font-semibold">That page doesn&apos;t exist.</h1>
      <Link
        href="/"
        className="rounded-lg bg-emerald-600 px-4 py-2 text-[13px] font-medium text-white hover:bg-emerald-500"
      >
        Back to Command Center
      </Link>
    </div>
  );
}
