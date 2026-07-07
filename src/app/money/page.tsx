"use client";

import { useState } from "react";
import { useJarvis, financeSummary } from "@/lib/store";
import { todayKey, fmtMoney, lastNDays } from "@/lib/utils";
import { useMounted } from "@/hooks/use-mounted";
import { Card, StatCard, SectionHeader, Button, Input, Select, ProgressBar, EmptyState } from "@/components/ui";
import { TrendArea, Donut } from "@/components/charts";
import { Trash2 } from "lucide-react";

export default function MoneyPage() {
  const mounted = useMounted();
  const s = useJarvis();
  const [amount, setAmount] = useState("");
  const [direction, setDirection] = useState<"income" | "expense">("income");
  const [category, setCategory] = useState("");
  const [source, setSource] = useState<"tiktok" | "etsy" | "other">("tiktok");

  if (!mounted) return null;

  const fin = financeSummary(s.transactions);
  const netWorth = s.accounts.reduce((a, acc) => a + acc.balance, 0);
  const goal = s.goals.find((g) => g.horizon === "monthly");

  // 30-day cumulative cash flow
  const days = lastNDays(30);
  const flow = days.map((d) => {
    const dayNet = s.transactions
      .filter((t) => t.date === d)
      .reduce((a, t) => a + (t.direction === "income" ? t.amount : -t.amount), 0);
    return { day: d.slice(5), net: dayNet };
  });
  let running = 0;
  const cumulative = flow.map((f) => ({ day: f.day, cashflow: (running += f.net) }));

  const donutData = [
    { name: "TikTok", value: fin.bySource.tiktok },
    { name: "Etsy", value: fin.bySource.etsy },
    { name: "Other", value: fin.bySource.other },
  ];

  const addTx = () => {
    const amt = parseFloat(amount);
    if (!amt || !category.trim()) return;
    s.addTransaction({ amount: amt, direction, category: category.trim(), source, date: todayKey() });
    setAmount(""); setCategory("");
  };

  return (
    <div className="fade-up flex flex-col gap-4">
      <SectionHeader title="Money OS" subtitle="Revenue, profit, cash flow, and goals — the primary mission." />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Revenue (month)" value={fmtMoney(fin.revenue)} accent="#10b981" />
        <StatCard label="Expenses (month)" value={fmtMoney(fin.expenses)} />
        <StatCard label="Profit (month)" value={fmtMoney(fin.profit)} accent={fin.profit >= 0 ? "#10b981" : "#f43f5e"} />
        <StatCard label="Net worth" value={fmtMoney(netWorth)} sub={`${s.accounts.length} accounts`} />
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <h2 className="mb-2 text-[14px] font-semibold">Cumulative cash flow — 30 days</h2>
          <TrendArea data={cumulative} dataKey="cashflow" xKey="day" valueFormatter={(v) => fmtMoney(v)} />
        </Card>
        <Card className="lg:col-span-2">
          <h2 className="mb-2 text-[14px] font-semibold">Income by source (month)</h2>
          {fin.revenue === 0 ? <EmptyState>No income recorded this month yet.</EmptyState> : <Donut data={donutData} />}
        </Card>
      </div>

      {goal && (
        <Card>
          <div className="mb-2 flex items-center justify-between text-[13px]">
            <span className="font-semibold">{goal.title} goal</span>
            <span className="tabular text-zinc-400">{fmtMoney(fin.revenue)} / {fmtMoney(goal.target)}</span>
          </div>
          <ProgressBar value={(fin.revenue / goal.target) * 100} />
        </Card>
      )}

      <Card>
        <h2 className="mb-3 text-[14px] font-semibold">Add transaction</h2>
        <div className="flex flex-wrap gap-2">
          <Input className="w-28" type="number" placeholder="Amount $" value={amount} onChange={(e) => setAmount(e.target.value)} />
          <Select value={direction} onChange={(e) => setDirection(e.target.value as "income")}>
            <option value="income">Income</option>
            <option value="expense">Expense</option>
          </Select>
          <Input className="w-52 flex-1" placeholder="Category (e.g. TikTok Shop sale)" value={category} onChange={(e) => setCategory(e.target.value)} />
          <Select value={source} onChange={(e) => setSource(e.target.value as "tiktok")}>
            <option value="tiktok">TikTok</option>
            <option value="etsy">Etsy</option>
            <option value="other">Other</option>
          </Select>
          <Button onClick={addTx}>Add</Button>
        </div>
      </Card>

      <Card>
        <h2 className="mb-3 text-[14px] font-semibold">Transactions</h2>
        {s.transactions.length === 0 ? (
          <EmptyState>Log your first sale or expense above — every dollar gets tracked.</EmptyState>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-white/[0.06] text-left text-[11px] uppercase tracking-wide text-zinc-500">
                  <th className="pb-2 pr-4 font-medium">Date</th>
                  <th className="pb-2 pr-4 font-medium">Category</th>
                  <th className="pb-2 pr-4 font-medium">Source</th>
                  <th className="pb-2 pr-4 text-right font-medium">Amount</th>
                  <th className="pb-2" />
                </tr>
              </thead>
              <tbody>
                {s.transactions.slice(0, 25).map((t) => (
                  <tr key={t.id} className="border-b border-white/[0.04]">
                    <td className="tabular py-2 pr-4 text-zinc-500">{t.date}</td>
                    <td className="py-2 pr-4">{t.category}</td>
                    <td className="py-2 pr-4 capitalize text-zinc-500">{t.source}</td>
                    <td className={`tabular py-2 pr-4 text-right font-medium ${t.direction === "income" ? "text-emerald-400" : "text-zinc-300"}`}>
                      {t.direction === "income" ? "+" : "−"}{fmtMoney(t.amount)}
                    </td>
                    <td className="py-2 text-right">
                      <button onClick={() => s.deleteTransaction(t.id)} className="text-zinc-700 hover:text-rose-400" aria-label="Delete transaction">
                        <Trash2 size={13} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card>
        <h2 className="mb-3 text-[14px] font-semibold">Accounts</h2>
        <div className="flex flex-col gap-2">
          {s.accounts.map((a) => (
            <div key={a.id} className="flex items-center justify-between gap-3 text-[13px]">
              <span>{a.name} <span className="text-zinc-600">· {a.kind}</span></span>
              <Input
                className="tabular w-32 text-right"
                type="number"
                value={a.balance}
                onChange={(e) => s.updateAccount(a.id, parseFloat(e.target.value) || 0)}
              />
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
