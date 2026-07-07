"use client";

import { useEffect, useState } from "react";
import { useJarvis } from "@/lib/store";
import { CALC_METHODS, type CalcMethodId, type AsrMethod } from "@/lib/prayer-times";
import { bridgeOnline, getBridgeToken, setBridgeToken } from "@/lib/desktop-bridge";
import { useMounted } from "@/hooks/use-mounted";
import { Card, SectionHeader, Button, Input, Select, Badge } from "@/components/ui";
import { Download, MapPin, MonitorSmartphone, RefreshCcw } from "lucide-react";

export default function SettingsPage() {
  const mounted = useMounted();
  const s = useJarvis();
  const [online, setOnline] = useState<boolean | null>(null);
  const [token, setToken] = useState("");

  useEffect(() => {
    if (!mounted) return;
    setToken(getBridgeToken());
    void bridgeOnline().then(setOnline);
  }, [mounted]);

  if (!mounted) return null;

  const useMyLocation = () => {
    navigator.geolocation?.getCurrentPosition(
      (pos) => s.setProfile({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
      () => alert("Location permission denied — set coordinates manually.")
    );
  };

  const exportData = () => {
    const raw = localStorage.getItem("jarvis-os") ?? "{}";
    const blob = new Blob([raw], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `jarvis-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fade-up flex flex-col gap-4">
      <SectionHeader title="Settings" subtitle="Profile, location, prayer calculation, and your data." />

      <Card>
        <h2 className="mb-3 text-[14px] font-semibold">Profile</h2>
        <label className="flex max-w-sm flex-col gap-1 text-[12px] text-zinc-500">
          What should JARVIS call you?
          <Input value={s.profile.name} onChange={(e) => s.setProfile({ name: e.target.value })} />
        </label>
      </Card>

      <Card>
        <h2 className="mb-3 text-[14px] font-semibold">Location & prayer times</h2>
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1 text-[12px] text-zinc-500">
            Latitude
            <Input className="w-32" type="number" step="0.0001" value={s.profile.latitude}
              onChange={(e) => s.setProfile({ latitude: parseFloat(e.target.value) || 0 })} />
          </label>
          <label className="flex flex-col gap-1 text-[12px] text-zinc-500">
            Longitude
            <Input className="w-32" type="number" step="0.0001" value={s.profile.longitude}
              onChange={(e) => s.setProfile({ longitude: parseFloat(e.target.value) || 0 })} />
          </label>
          <Button variant="ghost" onClick={useMyLocation}><MapPin size={13} /> Use my location</Button>
        </div>
        <div className="mt-3 flex flex-wrap gap-3">
          <label className="flex flex-col gap-1 text-[12px] text-zinc-500">
            Calculation method
            <Select value={s.profile.method} onChange={(e) => s.setProfile({ method: e.target.value as CalcMethodId })}>
              {Object.entries(CALC_METHODS).map(([id, m]) => <option key={id} value={id}>{m.label}</option>)}
            </Select>
          </label>
          <label className="flex flex-col gap-1 text-[12px] text-zinc-500">
            Asr method
            <Select value={s.profile.asrMethod} onChange={(e) => s.setProfile({ asrMethod: e.target.value as AsrMethod })}>
              <option value="standard">Standard (Shafi&apos;i/Maliki/Hanbali)</option>
              <option value="hanafi">Hanafi</option>
            </Select>
          </label>
        </div>
      </Card>

      <Card>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-[14px] font-semibold">
            <MonitorSmartphone size={15} className="text-emerald-400" /> Desktop bridge
          </h2>
          <span className="flex items-center gap-2">
            <Badge className={online ? "bg-emerald-500/15 text-emerald-400" : "bg-zinc-800 text-zinc-500"}>
              {online == null ? "checking…" : online ? "online" : "offline"}
            </Badge>
            <button onClick={() => { setOnline(null); void bridgeOnline().then(setOnline); }} className="text-zinc-600 hover:text-zinc-300" aria-label="Recheck bridge">
              <RefreshCcw size={13} />
            </button>
          </span>
        </div>
        <p className="mb-3 text-[13px] text-zinc-500">
          The bridge lets JARVIS control this computer — open apps, search, volume, media, screenshots, lock —
          including by voice (&quot;Hey Jarvis, open Chrome&quot;). Run it on your PC:
        </p>
        <pre className="mb-3 overflow-x-auto rounded-lg bg-[#0d0d0f] px-3 py-2 font-mono text-[12px] text-emerald-300">node desktop-bridge/bridge.mjs</pre>
        <div className="flex flex-wrap items-end gap-2">
          <label className="flex min-w-64 flex-1 flex-col gap-1 text-[12px] text-zinc-500">
            Pairing token (printed by the bridge on startup)
            <Input value={token} onChange={(e) => setToken(e.target.value)} placeholder="paste token…" />
          </label>
          <Button onClick={() => { setBridgeToken(token); void bridgeOnline().then(setOnline); }}>Save</Button>
        </div>
      </Card>

      <Card>
        <h2 className="mb-3 text-[14px] font-semibold">AI brain</h2>
        <p className="text-[13px] text-zinc-500">
          The agentic chat uses an Anthropic API key set server-side in <code className="text-zinc-300">.env.local</code>{" "}
          (<code className="text-zinc-300">ANTHROPIC_API_KEY</code>). Without it, JARVIS runs the offline planner —
          scheduling, prayers, tasks and money summaries still work. Your data never leaves this device either way;
          tools execute locally in your browser.
        </p>
      </Card>

      <Card>
        <h2 className="mb-3 text-[14px] font-semibold">Your data</h2>
        <div className="flex items-center justify-between gap-4">
          <p className="text-[13px] text-zinc-500">
            Everything is stored locally in your browser (localStorage). Export a JSON backup anytime.
            Cloud sync (Supabase + Prisma) is Phase 1 of the roadmap.
          </p>
          <Button variant="ghost" onClick={exportData}><Download size={13} /> Export backup</Button>
        </div>
      </Card>

      <Card>
        <h2 className="mb-2 text-[14px] font-semibold">Agent activity log</h2>
        {s.agentLog.length === 0 ? (
          <p className="text-[13px] text-zinc-600">Tool calls made by JARVIS will be audited here.</p>
        ) : (
          <ul className="flex max-h-64 flex-col gap-1 overflow-y-auto font-mono text-[11.5px] text-zinc-500">
            {s.agentLog.map((e) => (
              <li key={e.id}>
                <span className="text-zinc-700">{e.time.slice(11, 19)}</span>{" "}
                <span className="text-emerald-500">{e.agent}</span> {e.summary}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
