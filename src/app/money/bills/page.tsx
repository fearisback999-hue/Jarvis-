"use client";

import { useEffect, useState } from "react";
import { useJarvis } from "@/lib/store";
import type { Bill } from "@/lib/store";
import { checkPayment, billsSummary } from "@/lib/spending-guard";
import { fmtMoney, cn } from "@/lib/utils";
import { todayKey } from "@/lib/utils";
import { useMounted } from "@/hooks/use-mounted";
import { Card, StatCard, SectionHeader, Button, Input, Badge, EmptyState } from "@/components/ui";
import { Landmark, Lock, Plus, RefreshCcw, ShieldCheck, Trash2 } from "lucide-react";

interface PlaidHandler { open: () => void }
declare global {
  interface Window {
    Plaid?: { create: (opts: { token: string; onSuccess: (public_token: string) => void }) => PlaidHandler };
  }
}

function loadPlaidScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (window.Plaid) return resolve(true);
    const s = document.createElement("script");
    s.src = "https://cdn.plaid.com/link/v2/stable/link-initialize.js";
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.head.appendChild(s);
  });
}

export default function BillsPage() {
  const mounted = useMounted();
  const s = useJarvis();
  const [plaidConfigured, setPlaidConfigured] = useState<boolean | null>(null);
  const [linking, setLinking] = useState(false);
  const [manualBalance, setManualBalance] = useState("");
  const [form, setForm] = useState({ name: "", amount: "", dueDay: "1", category: "software" });

  useEffect(() => {
    if (!mounted) return;
    fetch("/api/bank").then((r) => r.json()).then((d) => setPlaidConfigured(d.configured)).catch(() => setPlaidConfigured(false));
  }, [mounted]);

  if (!mounted) return null;

  const month = todayKey().slice(0, 7);
  const sum = billsSummary(s);
  const adBudgetTotal = s.adChannels.reduce((a, c) => a + c.monthlyBudget, 0);

  const refreshBalance = async () => {
    if (!s.bank.accessToken) return;
    const res = await fetch("/api/bank", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "balance", access_token: s.bank.accessToken }),
    });
    const data = await res.json();
    if (data.ok && data.accounts?.[0]) {
      const a = data.accounts[0];
      s.setBank({ balance: a.available, name: a.name, mask: a.mask, updatedAt: new Date().toISOString() });
    }
  };

  const linkBank = async () => {
    setLinking(true);
    try {
      const tokRes = await fetch("/api/bank", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "create_link_token" }),
      });
      const tok = await tokRes.json();
      if (!tok.ok) { alert(tok.error); return; }
      if (!(await loadPlaidScript()) || !window.Plaid) { alert("Couldn't load the Plaid Link widget."); return; }
      window.Plaid.create({
        token: tok.link_token,
        onSuccess: async (public_token: string) => {
          const exRes = await fetch("/api/bank", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "exchange", public_token }),
          });
          const ex = await exRes.json();
          if (ex.ok) {
            s.setBank({ linked: true, accessToken: ex.access_token, updatedAt: new Date().toISOString() });
            const balRes = await fetch("/api/bank", {
              method: "POST", headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ action: "balance", access_token: ex.access_token }),
            });
            const bal = await balRes.json();
            if (bal.ok && bal.accounts?.[0]) {
              s.setBank({ balance: bal.accounts[0].available, name: bal.accounts[0].name, mask: bal.accounts[0].mask });
            }
          }
        },
      }).open();
    } finally {
      setLinking(false);
    }
  };

  const addBill = () => {
    const amount = parseFloat(form.amount);
    const dueDay = Math.min(28, Math.max(1, parseInt(form.dueDay) || 1));
    if (!form.name.trim() || !amount || amount <= 0) return;
    s.addBill({ name: form.name.trim(), amount, dueDay, category: form.category, autopay: false });
    setForm({ name: "", amount: "", dueDay: "1", category: form.category });
  };

  const pay = (bill: Bill) => {
    const result = checkPayment(s, bill);
    if (!result.allowed) {
      alert(
        "Payment BLOCKED by the Spending Guard:\n\n" +
        result.checks.filter((c) => !c.pass).map((c) => `✗ ${c.rule}\n   ${c.detail}`).join("\n")
      );
      return;
    }
    const ok = window.confirm(
      `Approve payment?\n\n${bill.name} — ${fmtMoney(bill.amount, 2)}\n\nAll guard checks passed:\n` +
      result.checks.map((c) => `✓ ${c.rule}`).join("\n") +
      `\n\nThis records the payment, logs the expense, and updates the balance.`
    );
    if (!ok) return;
    s.recordPayment(bill);
  };

  const day = new Date().getDate();

  return (
    <div className="fade-up flex flex-col gap-4">
      <SectionHeader
        title="Business Bills & Autopay"
        subtitle="Exactly what the business needs each month — paid under hard rules, never over."
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Needed / month" value={fmtMoney(sum.needed, 2)} accent="#059669" sub={`${s.bills.length} recurring bills`} />
        <StatCard label={`Paid in ${month}`} value={fmtMoney(sum.paid, 2)} />
        <StatCard label="Still due" value={fmtMoney(sum.remaining, 2)} accent={sum.overdue.length ? "#f43f5e" : undefined}
          sub={sum.overdue.length ? `${sum.overdue.length} overdue` : sum.dueSoon.length ? `${sum.dueSoon.length} due within a week` : "on track"} />
        <StatCard
          label="Bank balance"
          value={sum.balance != null ? fmtMoney(sum.balance, 2) : "—"}
          accent={sum.funded == null ? undefined : sum.funded ? "#10b981" : "#f43f5e"}
          sub={sum.funded == null ? "link a bank below" : sum.funded ? "fully funded incl. buffer" : "NOT enough to cover remaining bills + buffer"}
        />
      </div>

      <Card className="flex flex-wrap items-center justify-between gap-2 text-[13px]">
        <div>
          <span className="font-semibold">Full monthly operating cost:</span>{" "}
          <span className="tabular text-emerald-400">{fmtMoney(sum.needed + adBudgetTotal)}</span>
          <span className="text-zinc-500"> = {fmtMoney(sum.needed)} fixed bills + {fmtMoney(adBudgetTotal)} advertising & variable budgets</span>
        </div>
        <a href="/business/ads" className="text-[12px] text-zinc-500 hover:text-zinc-300">Manage ad budgets →</a>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="mb-2 flex items-center gap-2 text-[14px] font-semibold">
            <Landmark size={15} className="text-emerald-400" /> Bank account
          </h2>
          {s.bank.linked ? (
            <div className="flex items-center justify-between gap-3 text-[13px]">
              <div>
                <div className="font-medium">{s.bank.name ?? "Linked account"} {s.bank.mask && <span className="text-zinc-500">••{s.bank.mask}</span>}</div>
                <div className="text-[12px] text-zinc-500">
                  balance synced {s.bank.updatedAt ? new Date(s.bank.updatedAt).toLocaleString() : "—"} · read-only access
                </div>
              </div>
              <Button variant="ghost" onClick={() => void refreshBalance()}><RefreshCcw size={13} /> Sync</Button>
            </div>
          ) : plaidConfigured ? (
            <div className="flex flex-col gap-2">
              <p className="text-[13px] text-zinc-500">
                Link via Plaid with <span className="text-zinc-300">read-only</span> access — JARVIS sees the balance so the
                guard can enforce the buffer. It cannot move money through this link.
              </p>
              <Button onClick={() => void linkBank()} disabled={linking}>{linking ? "Opening…" : "Link bank account"}</Button>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <p className="text-[13px] text-zinc-500">
                To link a real bank, add <code className="text-zinc-300">PLAID_CLIENT_ID</code> and{" "}
                <code className="text-zinc-300">PLAID_SECRET</code> to <code className="text-zinc-300">.env.local</code>{" "}
                (free at plaid.com). Until then, set the working balance manually — the guard still enforces every rule against it.
              </p>
              <div className="flex gap-2">
                <Input className="w-40" type="number" placeholder="Balance $" value={manualBalance} onChange={(e) => setManualBalance(e.target.value)} />
                <Button variant="ghost" onClick={() => {
                  const v = parseFloat(manualBalance);
                  if (!isNaN(v)) { s.setBank({ linked: false, balance: v, name: "Manual balance", updatedAt: new Date().toISOString() }); setManualBalance(""); }
                }}>Set</Button>
              </div>
            </div>
          )}
        </Card>

        <Card>
          <h2 className="mb-2 flex items-center gap-2 text-[14px] font-semibold">
            <ShieldCheck size={15} className="text-emerald-400" /> Spending Guard
          </h2>
          <ul className="mb-3 flex flex-col gap-1 text-[12px] text-zinc-500">
            <li className="flex items-center gap-1.5"><Lock size={11} className="text-zinc-600" /> Whitelist only — pays registered bills, exact registered amount</li>
            <li className="flex items-center gap-1.5"><Lock size={11} className="text-zinc-600" /> One payment per bill per month — duplicates blocked</li>
            <li className="flex items-center gap-1.5"><Lock size={11} className="text-zinc-600" /> The AI can never execute a payment — final approval is always your tap</li>
          </ul>
          <div className="grid grid-cols-3 gap-2">
            {([
              ["Monthly cap $", "monthlyCapUSD"],
              ["Per-payment cap $", "perPaymentCapUSD"],
              ["Balance buffer $", "minBalanceBufferUSD"],
            ] as const).map(([label, key]) => (
              <label key={key} className="flex flex-col gap-1 text-[11px] text-zinc-500">
                {label}
                <Input
                  type="number"
                  value={s.spendingRules[key]}
                  onChange={(e) => s.setSpendingRules({ [key]: Math.max(0, parseFloat(e.target.value) || 0) })}
                />
              </label>
            ))}
          </div>
        </Card>
      </div>

      <Card>
        <h2 className="mb-3 text-[14px] font-semibold">Add a recurring business expense</h2>
        <div className="flex flex-wrap gap-2">
          <Input className="min-w-44 flex-1" placeholder="Name (e.g. Printify subscription)" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Input className="w-28" type="number" placeholder="Amount $" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
          <Input className="w-24" type="number" min={1} max={28} title="Due day of month" placeholder="Due day" value={form.dueDay} onChange={(e) => setForm({ ...form, dueDay: e.target.value })} />
          <Input className="w-32" placeholder="Category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
          <Button onClick={addBill}><Plus size={13} /> Add</Button>
        </div>
      </Card>

      <Card>
        <h2 className="mb-3 text-[14px] font-semibold">Monthly bills</h2>
        {s.bills.length === 0 ? (
          <EmptyState>
            Add every recurring business cost — Printify, Etsy fees, software, filming gear budget — and the total you
            need each month shows at the top.
          </EmptyState>
        ) : (
          <ul className="flex flex-col gap-2">
            {[...s.bills].sort((a, b) => a.dueDay - b.dueDay).map((bill) => {
              const paidThisMonth = bill.lastPaidMonth === month;
              const overdue = !paidThisMonth && bill.dueDay < day;
              const guard = checkPayment(s, bill);
              return (
                <li key={bill.id} className="rounded-lg border border-white/[0.05] bg-white/[0.02] px-3 py-2.5">
                  <div className="flex items-center gap-3">
                    <span className={cn("tabular w-14 shrink-0 text-[12px]", overdue ? "text-rose-400" : "text-zinc-500")}>
                      day {bill.dueDay}
                    </span>
                    <div className="min-w-0 flex-1">
                      <span className="text-[13px] font-medium">{bill.name}</span>
                      <span className="ml-2 text-[11px] text-zinc-600">{bill.category}</span>
                    </div>
                    <span className="tabular text-[13px] font-semibold">{fmtMoney(bill.amount, 2)}</span>
                    {paidThisMonth ? (
                      <Badge className="bg-emerald-500/15 text-emerald-400">paid {month}</Badge>
                    ) : overdue ? (
                      <Badge className="bg-rose-500/15 text-rose-400">overdue</Badge>
                    ) : (
                      <Badge className="bg-zinc-800 text-zinc-400">due</Badge>
                    )}
                    {!paidThisMonth && (
                      <Button
                        variant={guard.allowed ? "primary" : "ghost"}
                        className="px-2.5 py-1 text-[12px]"
                        onClick={() => pay(bill)}
                        title={guard.allowed ? "All guard checks pass — approve payment" : "Blocked: " + guard.checks.filter((c) => !c.pass).map((c) => c.rule).join(", ")}
                      >
                        {guard.allowed ? "Approve & pay" : "Blocked"}
                      </Button>
                    )}
                    <button onClick={() => { if (window.confirm(`Remove "${bill.name}" from the bill list?`)) s.deleteBill(bill.id); }} className="text-zinc-700 hover:text-rose-400" aria-label="Delete bill">
                      <Trash2 size={13} />
                    </button>
                  </div>
                  {!paidThisMonth && !guard.allowed && (
                    <div className="mt-1.5 flex flex-wrap gap-1.5 pl-[68px]">
                      {guard.checks.filter((c) => !c.pass).map((c, i) => (
                        <span key={i} className="rounded bg-rose-500/10 px-1.5 py-0.5 text-[10px] text-rose-300">✗ {c.rule}</span>
                      ))}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      {s.payments.length > 0 && (
        <Card>
          <h2 className="mb-2 text-[14px] font-semibold">Payment history</h2>
          <ul className="flex flex-col gap-1 text-[12.5px] text-zinc-500">
            {s.payments.slice(0, 12).map((p) => (
              <li key={p.id} className="flex justify-between">
                <span>{p.name}</span>
                <span className="tabular">{p.date} · {fmtMoney(p.amount, 2)}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card className="border-amber-500/20 bg-amber-500/[0.04] text-[13px] text-zinc-400">
        <span className="font-medium text-amber-300">Straight talk on auto-paying:</span> the bank link is read-only, so
        approving a payment here enforces every rule, records it, and adjusts the balance — but the money itself still moves
        through your bank's own autopay/bill-pay (set each biller up there once). Actual money movement from JARVIS requires a
        payment-rail provider (Plaid Transfer / Melio) with business verification — I'd wire it behind this same guard, and
        even then every single payment would still require your explicit approval. That rule is permanent by design.
      </Card>
    </div>
  );
}
