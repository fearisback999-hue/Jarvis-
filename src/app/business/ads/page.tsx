"use client";

import { useState } from "react";
import Link from "next/link";
import { useJarvis, financeSummary } from "@/lib/store";
import { fmtMoney, todayKey, cn } from "@/lib/utils";
import { useMounted } from "@/hooks/use-mounted";
import { Card, StatCard, SectionHeader, Button, Input, Select, ProgressBar, EmptyState } from "@/components/ui";
import { Megaphone, ArrowRight } from "lucide-react";

export default function AdsPage() {
  const mounted = useMounted();
  const s = useJarvis();
  const [channelId, setChannelId] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");

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
