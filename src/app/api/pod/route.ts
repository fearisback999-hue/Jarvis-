// Proxy to the NEO POD automation engine (fearisback999-hue/Alsaduquon).
// Configure in .env.local:
//   POD_ENGINE_URL=https://your-pod-engine.vercel.app
//   POD_CRON_SECRET=<the engine's CRON_SECRET>
// The secret stays server-side; the browser never sees it.

import { NextRequest, NextResponse } from "next/server";

const ACTIONS: Record<string, { path: string; label: string }> = {
  run_pipeline: { path: "/api/cron/pipeline", label: "POD pipeline run" },
  sync_orders: { path: "/api/cron/sync-orders", label: "Order sync" },
  sync_analytics: { path: "/api/cron/sync-analytics", label: "Analytics sync" },
  optimize: { path: "/api/cron/optimize", label: "Listing optimization" },
};

function config() {
  const url = process.env.POD_ENGINE_URL?.replace(/\/$/, "");
  const secret = process.env.POD_CRON_SECRET;
  return { url, secret };
}

export async function GET() {
  const { url } = config();
  if (!url) return NextResponse.json({ configured: false });
  try {
    const res = await fetch(`${url}/api/health`, { signal: AbortSignal.timeout(8000), cache: "no-store" });
    const body = await res.json().catch(() => ({}));
    return NextResponse.json({ configured: true, online: res.ok, engine: url, health: body });
  } catch {
    return NextResponse.json({ configured: true, online: false, engine: url });
  }
}

export async function POST(req: NextRequest) {
  const { url, secret } = config();
  if (!url || !secret) {
    return NextResponse.json(
      { ok: false, error: "POD engine not configured — set POD_ENGINE_URL and POD_CRON_SECRET in .env.local" },
      { status: 400 }
    );
  }
  const { action } = (await req.json()) as { action: string };
  const target = ACTIONS[action];
  if (!target) return NextResponse.json({ ok: false, error: `Unknown action: ${action}` }, { status: 400 });

  try {
    const res = await fetch(`${url}${target.path}`, {
      method: "GET",
      headers: { Authorization: `Bearer ${secret}` },
      signal: AbortSignal.timeout(55000),
      cache: "no-store",
    });
    const body = await res.json().catch(() => ({}));
    return NextResponse.json({ ok: res.ok, action: target.label, status: res.status, result: body });
  } catch (e) {
    return NextResponse.json({ ok: false, error: `Engine unreachable: ${String(e).slice(0, 120)}` }, { status: 502 });
  }
}
