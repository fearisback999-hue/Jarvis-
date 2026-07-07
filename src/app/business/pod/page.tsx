"use client";

import { useEffect, useState } from "react";
import { useMounted } from "@/hooks/use-mounted";
import { Card, SectionHeader, Button, Badge, StatCard } from "@/components/ui";
import { Factory, RefreshCcw, TrendingUp, PackageCheck, ExternalLink } from "lucide-react";

interface PodStatus {
  configured: boolean;
  online?: boolean;
  engine?: string;
}

const ACTIONS = [
  { id: "run_pipeline", label: "Run pipeline", desc: "Generate + validate + list new products", icon: Factory, confirm: true },
  { id: "sync_orders", label: "Sync orders", desc: "Pull latest orders from platforms", icon: PackageCheck, confirm: false },
  { id: "sync_analytics", label: "Sync analytics", desc: "Refresh views, favorites, sales data", icon: TrendingUp, confirm: false },
  { id: "optimize", label: "Optimize listings", desc: "Reprice + improve underperformers", icon: RefreshCcw, confirm: false },
];

export default function PodPage() {
  const mounted = useMounted();
  const [status, setStatus] = useState<PodStatus | null>(null);
  const [running, setRunning] = useState<string | null>(null);
  const [log, setLog] = useState<string[]>([]);

  const refresh = async () => {
    try {
      const res = await fetch("/api/pod");
      setStatus(await res.json());
    } catch {
      setStatus({ configured: false });
    }
  };

  useEffect(() => { void refresh(); }, []);

  const trigger = async (id: string, label: string, needsConfirm: boolean) => {
    if (needsConfirm && !window.confirm(`Run the POD pipeline now? This generates and lists real products and spends API credits.`)) return;
    setRunning(id);
    try {
      const res = await fetch("/api/pod", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: id }),
      });
      const data = await res.json();
      setLog((l) => [`${new Date().toLocaleTimeString()} — ${label}: ${data.ok ? "OK" : data.error ?? `HTTP ${data.status}`}`, ...l].slice(0, 20));
    } catch (e) {
      setLog((l) => [`${new Date().toLocaleTimeString()} — ${label}: failed (${String(e).slice(0, 80)})`, ...l]);
    } finally {
      setRunning(null);
    }
  };

  if (!mounted) return null;

  return (
    <div className="fade-up flex flex-col gap-4">
      <SectionHeader
        title="POD Automation"
        subtitle="Your NEO POD engine (Alsaduquon) — trigger it from here or by voice: “Hey Jarvis, run the pod pipeline.”"
        right={
          status?.engine ? (
            <a href={status.engine} target="_blank" rel="noopener" className="flex items-center gap-1 text-[12px] text-zinc-500 hover:text-zinc-300">
              Open engine dashboard <ExternalLink size={12} />
            </a>
          ) : undefined
        }
      />

      <div className="grid grid-cols-2 gap-3">
        <StatCard
          label="Engine status"
          value={
            status == null ? "…" :
            !status.configured ? "Not linked" :
            status.online ? "Online" : "Offline"
          }
          accent={status?.online ? "#10b981" : status?.configured ? "#f43f5e" : undefined}
          sub={status?.engine?.replace(/^https?:\/\//, "") ?? "set POD_ENGINE_URL in .env.local"}
        />
        <Card className="flex flex-col justify-center gap-1.5 text-[12.5px] text-zinc-500">
          <span><Badge className="bg-emerald-500/15 text-emerald-400">voice</Badge> &quot;run the pod pipeline&quot;</span>
          <span><Badge className="bg-emerald-500/15 text-emerald-400">voice</Badge> &quot;sync pod orders&quot; · &quot;optimize pod listings&quot;</span>
        </Card>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {ACTIONS.map(({ id, label, desc, icon: Icon, confirm }) => (
          <Card key={id} className="flex items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sky-500/10 text-sky-400">
              <Icon size={17} />
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-[13px] font-medium">{label}</div>
              <div className="text-[12px] text-zinc-500">{desc}</div>
            </div>
            <Button
              variant={confirm ? "primary" : "ghost"}
              disabled={running !== null || !status?.configured}
              onClick={() => void trigger(id, label, confirm)}
            >
              {running === id ? "Running…" : "Run"}
            </Button>
          </Card>
        ))}
      </div>

      {log.length > 0 && (
        <Card>
          <h2 className="mb-2 text-[14px] font-semibold">Run log</h2>
          <ul className="flex flex-col gap-1 font-mono text-[11.5px] text-zinc-500">
            {log.map((line, i) => <li key={i}>{line}</li>)}
          </ul>
        </Card>
      )}

      {!status?.configured && status != null && (
        <Card className="border-sky-500/20 bg-sky-500/[0.04] text-[13px] text-zinc-400">
          <span className="font-medium text-sky-300">Link your engine:</span> the full engine source is in{" "}
          <code className="text-zinc-300">engines/pod-neo</code> — run it locally or deploy it (Vercel), then add{" "}
          <code className="text-zinc-300">POD_ENGINE_URL</code> and <code className="text-zinc-300">POD_CRON_SECRET</code>{" "}
          (the engine&apos;s CRON_SECRET) to this app&apos;s <code className="text-zinc-300">.env.local</code>. The secret stays
          server-side — JARVIS calls the engine&apos;s pipeline, order-sync, analytics-sync and optimize endpoints for you.
        </Card>
      )}
    </div>
  );
}
