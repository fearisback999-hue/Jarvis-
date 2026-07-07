"use client";

import { cn } from "@/lib/utils";
import type { ReactNode, InputHTMLAttributes, SelectHTMLAttributes, ButtonHTMLAttributes } from "react";

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div className={cn("rounded-xl border border-white/[0.08] bg-[#111113] p-4", className)}>
      {children}
    </div>
  );
}

export function SectionHeader({ title, subtitle, right }: { title: string; subtitle?: string; right?: ReactNode }) {
  return (
    <div className="mb-4 flex items-end justify-between gap-4">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-0.5 text-[13px] text-zinc-500">{subtitle}</p>}
      </div>
      {right}
    </div>
  );
}

export function StatCard({ label, value, sub, accent }: { label: string; value: ReactNode; sub?: ReactNode; accent?: string }) {
  return (
    <Card className="flex flex-col gap-1">
      <span className="text-[12px] font-medium uppercase tracking-wide text-zinc-500">{label}</span>
      <span className="tabular text-2xl font-semibold" style={accent ? { color: accent } : undefined}>{value}</span>
      {sub && <span className="text-[12px] text-zinc-500">{sub}</span>}
    </Card>
  );
}

export function Badge({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span className={cn("inline-flex items-center rounded-md px-1.5 py-0.5 text-[11px] font-medium", className ?? "bg-zinc-800 text-zinc-300")}>
      {children}
    </span>
  );
}

export function ProgressBar({ value, color = "#10b981" }: { value: number; color?: string }) {
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-800">
      <div
        className="h-full rounded-full transition-all duration-300"
        style={{ width: `${Math.min(100, Math.max(0, value))}%`, background: color }}
      />
    </div>
  );
}

export function Button({ className, variant = "primary", ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "ghost" | "danger" }) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] font-medium transition-colors disabled:opacity-40",
        variant === "primary" && "bg-emerald-600 text-white hover:bg-emerald-500",
        variant === "ghost" && "border border-white/[0.08] bg-transparent text-zinc-300 hover:bg-white/[0.04]",
        variant === "danger" && "bg-transparent text-rose-400 hover:bg-rose-500/10",
        className
      )}
      {...props}
    />
  );
}

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "w-full rounded-lg border border-white/[0.08] bg-[#0d0d0f] px-3 py-1.5 text-[13px] text-zinc-100 placeholder:text-zinc-600 outline-none focus:border-emerald-600/60",
        className
      )}
      {...props}
    />
  );
}

export function Select({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "rounded-lg border border-white/[0.08] bg-[#0d0d0f] px-2.5 py-1.5 text-[13px] text-zinc-100 outline-none focus:border-emerald-600/60",
        className
      )}
      {...props}
    />
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-white/[0.08] py-10 text-center text-[13px] text-zinc-600">
      {children}
    </div>
  );
}
