"use client";

import { useState } from "react";
import Link from "next/link";
import { useJarvis, financeSummary } from "@/lib/store";
import type { Creator, CreatorStatus } from "@/lib/store";
import { fmtMoney, todayKey, cn } from "@/lib/utils";
import { useMounted } from "@/hooks/use-mounted";
import { Card, StatCard, SectionHeader, Button, Input, Select, ProgressBar, EmptyState, Badge } from "@/components/ui";
import { Megaphone, ArrowRight, Clapperboard, ExternalLink, Trash2, Users } from "lucide-react";

const CREATOR_STATUS: { id: CreatorStatus; label: string; cls: string }[] = [
  { id: "prospect", label: "prospect", cls: "bg-zinc-800 text-zinc-400" },
  { id: "contacted", label: "contacted", cls: "bg-sky-500/15 text-sky-400" },
  { id: "negotiating", label: "negotiating", cls: "bg-amber-500/15 text-amber-400" },
  { id: "active", label: "active", cls: "bg-emerald-500/15 text-emerald-400" },
  { id: "dropped", label: "dropped", cls: "bg-rose-500/15 text-rose-400" },
];

function buildUgcBrief(product: string, angle: string) {
  const a = angle.trim() || "problem → reveal → proof";
  return {
    hook: `POV: you finally found ${product} that actually works (${a})`,
    script:
      `[UGC BRIEF — ${product}]\n` +
      `Angle: ${a}\n` +
      `0-3s HOOK: cold open on the problem, face to camera, no branding.\n` +
      `3-10s REVEAL: show ${product} in hand, one-line benefit ("this fixed it").\n` +
      `10-20s PROOF: demo in real setting, 2 quick cuts, text overlays with the key claim.\n` +
      `20-27s CTA: "it's in my showcase / link below" + price anchor.\n` +
      `Deliverables: 3 hook variants, 9:16, native captions, raw + edited.`,
    caption: `this ${product} is different 😳 #tiktokshop #tiktokmademebuyit #${product.replace(/[^a-z0-9]/gi, "").toLowerCase()}`,
  };
}

export default function AdsPage() {
  const mounted = useMounted();
  const s = useJarvis();
  const [channelId, setChannelId] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [ugcProduct, setUgcProduct] = useState("");
  const [ugcAngle, setUgcAngle] = useState("");
  const [ugcDone, setUgcDone] = useState(false);
  const [creatorForm, setCreatorForm] = useState({ handle: "", platform: "tiktok" as Creator["platform"], commission: "15" });

  if (!mounted) return null;

  const month = todayKey().slice(0, 7);
  const monthSpends = s.adSpends.filter((x) => x.date.startsWith(month));
  const totalBudget = s.adChannels.reduce((a, c) => a + c.monthlyBudget, 0);
  const totalSpent = monthSpends.reduce((a, x) => a + x.amount, 0);
  const spentFor = (id: string) => monthSpends.filter((x) => x.channelId === id).reduce((a, x) => a + x.amount, 0);

  const fin = financeSummary(s.transactions);
  const roas = totalSpent > 0 ? fin.revenue / totalSpent : null;

  const billsFixed = s.bills.reduce((a, b) => a + b.amount, 0);
  const opsTotal = billsFixed + totalBudget;

  const logSpend = () => {
    const amt = parseFloat(amount);
    const channel = s.adChannels.find((c) => c.id === (channelId || s.adChannels[0]?.id));
    if (!amt || amt <= 0 || !channel) return;
    const remaining = channel.monthlyBudget - spentFor(channel.id);
    if (amt > remaining) {
      alert(
        `BLOCKED — this would put "${channel.name}" over budget.\n\n` +
        `Budget: ${fmtMoney(channel.monthlyBudget, 2)}\nSpent: ${fmtMoney(spentFor(channel.id), 2)}\nRemaining: ${fmtMoney(Math.max(0, remaining), 2)}\n\n` +
        `Raise the channel budget deliberately if you mean it — no silent overspending.`
      );
      return;
    }
    s.addAdSpend(channel.id, amt, note.trim() || undefined);
    setAmount(""); setNote("");
  };

  return (
    <div className="fade-up flex flex-col gap-4">
      <SectionHeader
        title="Advertising"
        subtitle="Every ad dollar budgeted per channel, logged, and blocked from overspending."
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Ad budget / month" value={fmtMoney(totalBudget)} accent="#059669" sub={`${s.adChannels.length} channels`} />
        <StatCard label={`Spent in ${month}`} value={fmtMoney(totalSpent, 2)} accent={totalSpent > totalBudget ? "#f43f5e" : undefined} />
        <StatCard label="Remaining" value={fmtMoney(Math.max(0, totalBudget - totalSpent), 2)} />
        <StatCard label="ROAS (month)" value={roas == null ? "—" : `${roas.toFixed(2)}×`} sub={roas == null ? "revenue ÷ ad spend" : roas >= 2 ? "healthy — scale winners" : roas >= 1 ? "breakeven zone" : "losing money on ads"} />
      </div>

      <Card className="flex items-center justify-between">
        <div className="text-[13px]">
          <span className="font-semibold">Full monthly operating cost:</span>{" "}
          <span className="tabular text-emerald-400">{fmtMoney(opsTotal)}</span>
          <span className="text-zinc-500"> = {fmtMoney(billsFixed)} fixed bills + {fmtMoney(totalBudget)} ad & variable budgets</span>
        </div>
        <Link href="/money/bills" className="flex items-center gap-1 text-[12px] text-zinc-500 hover:text-zinc-300">
          Bills & funding <ArrowRight size={12} />
        </Link>
      </Card>

      <Card>
        <h2 className="mb-3 flex items-center gap-2 text-[14px] font-semibold">
          <Megaphone size={15} className="text-emerald-400" /> Channel budgets
        </h2>
        <div className="flex flex-col gap-3">
          {s.adChannels.map((c) => {
            const spent = spentFor(c.id);
            const pct = c.monthlyBudget > 0 ? (spent / c.monthlyBudget) * 100 : 0;
            return (
              <div key={c.id}>
                <div className="mb-1 flex items-center justify-between gap-3 text-[13px]">
                  <span className="font-medium">{c.name}</span>
                  <span className="flex items-center gap-2">
                    <span className={cn("tabular text-[12px]", pct >= 100 ? "text-rose-400" : "text-zinc-400")}>
                      {fmtMoney(spent, 2)} / </span>
                    <Input
                      className="tabular w-24 py-1 text-right text-[12px]"
                      type="number"
                      value={c.monthlyBudget}
                      onChange={(e) => s.setAdBudget(c.id, parseFloat(e.target.value) || 0)}
                    />
                  </span>
                </div>
                <ProgressBar value={pct} color={pct >= 100 ? "#f43f5e" : pct >= 80 ? "#d97706" : "#059669"} />
              </div>
            );
          })}
        </div>
      </Card>

      <Card>
        <h2 className="mb-3 text-[14px] font-semibold">Log ad spend</h2>
        <div className="flex flex-wrap gap-2">
          <Select value={channelId || s.adChannels[0]?.id} onChange={(e) => setChannelId(e.target.value)}>
            {s.adChannels.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
          <Input className="w-28" type="number" placeholder="Amount $" value={amount} onChange={(e) => setAmount(e.target.value)} />
          <Input className="min-w-40 flex-1" placeholder="Note (campaign, product…)" value={note} onChange={(e) => setNote(e.target.value)} />
          <Button onClick={logSpend}>Log spend</Button>
        </div>
        <p className="mt-2 text-[12px] text-zinc-600">
          Over-budget spends are blocked. Every logged spend also lands in the Money ledger as an expense.
        </p>
      </Card>

      <Card className="bg-gradient-to-r from-violet-500/[0.06] to-transparent">
        <h2 className="mb-1 flex items-center gap-2 text-[14px] font-semibold">
          <Clapperboard size={15} className="text-violet-400" /> AI Creative Studio — Higgsfield
        </h2>
        <p className="mb-3 text-[12px] text-zinc-500">
          Draft a structured UGC ad brief (hook / 30s script / caption), save it to the content calendar, and open
          Higgsfield to generate the AI UGC video. The brief is copied to your clipboard for pasting straight in.
        </p>
        <div className="flex flex-wrap gap-2">
          <Input className="min-w-40 flex-1" placeholder="Product (e.g. LED ring light)" value={ugcProduct} onChange={(e) => setUgcProduct(e.target.value)} />
          <Input className="min-w-40 flex-1" placeholder="Angle (optional — e.g. before/after)" value={ugcAngle} onChange={(e) => setUgcAngle(e.target.value)} />
          <Button
            onClick={async () => {
              if (!ugcProduct.trim()) return;
              const brief = buildUgcBrief(ugcProduct.trim(), ugcAngle);
              s.addContent({ ...brief, posted: false, views: 0, sales: 0 });
              try { await navigator.clipboard.writeText(brief.script); } catch { /* clipboard may be blocked */ }
              window.open("https://higgsfield.ai", "_blank", "noopener");
              setUgcDone(true);
              setTimeout(() => setUgcDone(false), 4000);
            }}
          >
            <Clapperboard size={13} /> {ugcDone ? "Brief saved + copied ✓" : "Draft brief + open Higgsfield"}
          </Button>
        </div>
        <p className="mt-2 text-[11.5px] text-zinc-600">
          Voice: &quot;Hey Jarvis, draft a UGC ad for [product]&quot; — with the API key set, JARVIS writes a sharper custom
          script and saves it the same way. Briefs land in TikTok Shop → Content calendar.
        </p>
      </Card>

      <Card>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-[14px] font-semibold">
            <Users size={15} className="text-emerald-400" /> UGC Creator Affiliate Program
          </h2>
          <div className="flex gap-3 text-[12px] text-zinc-500">
            <span><span className="tabular font-semibold text-emerald-400">{s.creators.filter((c) => c.status === "active").length}</span> active</span>
            <span><span className="tabular font-semibold text-zinc-300">{s.creators.filter((c) => ["prospect", "contacted", "negotiating"].includes(c.status)).length}</span> in pipeline</span>
            <span><span className="tabular font-semibold text-zinc-300">{fmtMoney(s.creators.reduce((a, c) => a + c.gmv, 0))}</span> GMV attributed</span>
          </div>
        </div>
        <div className="mb-3 flex flex-wrap gap-2">
          <Input className="min-w-40 flex-1" placeholder="@handle" value={creatorForm.handle} onChange={(e) => setCreatorForm({ ...creatorForm, handle: e.target.value })} />
          <Select value={creatorForm.platform} onChange={(e) => setCreatorForm({ ...creatorForm, platform: e.target.value as Creator["platform"] })}>
            <option value="tiktok">TikTok</option>
            <option value="instagram">Instagram</option>
            <option value="youtube">YouTube</option>
          </Select>
          <Input className="w-28" type="number" title="Commission %" placeholder="Commission %" value={creatorForm.commission} onChange={(e) => setCreatorForm({ ...creatorForm, commission: e.target.value })} />
          <Button onClick={() => {
            if (!creatorForm.handle.trim()) return;
            s.addCreator({
              handle: creatorForm.handle.trim().replace(/^@?/, "@"),
              platform: creatorForm.platform,
              status: "prospect",
              commissionPct: Math.min(50, Math.max(0, parseFloat(creatorForm.commission) || 15)),
              gmv: 0,
            });
            setCreatorForm({ ...creatorForm, handle: "" });
          }}>Add creator</Button>
        </div>
        {s.creators.length === 0 ? (
          <EmptyState>
            Build the affiliate roster: add creators from TikTok Shop&apos;s affiliate marketplace, track outreach →
            negotiation → active, and log the GMV each one drives.
          </EmptyState>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {s.creators.map((c) => {
              const st = CREATOR_STATUS.find((x) => x.id === c.status)!;
              return (
                <li key={c.id} className="flex items-center gap-2 rounded-lg border border-white/[0.05] bg-white/[0.02] px-3 py-2 text-[13px]">
                  <a
                    href={c.platform === "tiktok" ? `https://www.tiktok.com/${c.handle}` : c.platform === "instagram" ? `https://instagram.com/${c.handle.slice(1)}` : `https://youtube.com/${c.handle}`}
                    target="_blank" rel="noopener"
                    className="flex min-w-0 flex-1 items-center gap-1.5 truncate font-medium hover:text-emerald-300"
                  >
                    {c.handle} <ExternalLink size={10} className="shrink-0 text-zinc-600" />
                  </a>
                  <span className="text-[11px] capitalize text-zinc-600">{c.platform}</span>
                  <span className="tabular text-[12px] text-zinc-400">{c.commissionPct}%</span>
                  <label className="flex items-center gap-1 text-[11px] text-zinc-600">
                    GMV $
                    <input
                      type="number"
                      value={c.gmv}
                      onChange={(e) => s.updateCreator(c.id, { gmv: Math.max(0, parseFloat(e.target.value) || 0) })}
                      className="tabular w-20 rounded border border-white/[0.08] bg-[#0d0d0f] px-1.5 py-0.5 text-right text-[12px] text-zinc-200"
                    />
                  </label>
                  <Select value={c.status} onChange={(e) => s.updateCreator(c.id, { status: e.target.value as CreatorStatus })} className="py-1 text-[12px]">
                    {CREATOR_STATUS.map((x) => <option key={x.id} value={x.id}>{x.label}</option>)}
                  </Select>
                  <Badge className={st.cls}>{st.label}</Badge>
                  <button onClick={() => s.deleteCreator(c.id)} className="text-zinc-700 hover:text-rose-400" aria-label="Remove creator">
                    <Trash2 size={13} />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <Card>
        <h2 className="mb-3 text-[14px] font-semibold">Spend log — {month}</h2>
        {monthSpends.length === 0 ? (
          <EmptyState>No ad spend logged this month.</EmptyState>
        ) : (
          <ul className="flex flex-col gap-1 text-[12.5px]">
            {monthSpends.map((x) => {
              const c = s.adChannels.find((ch) => ch.id === x.channelId);
              return (
                <li key={x.id} className="flex justify-between gap-3 text-zinc-400">
                  <span>{c?.name ?? "?"}{x.note ? ` — ${x.note}` : ""}</span>
                  <span className="tabular shrink-0">{x.date.slice(5)} · {fmtMoney(x.amount, 2)}</span>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}
