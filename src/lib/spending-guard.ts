// Spending Guard — every payment must pass EVERY check. Fail-closed:
// if anything is off, the payment is blocked and the reasons are shown.
//
// Hard rules (not configurable, by design):
//   1. Whitelist only — money can only go to a bill on the registered list.
//   2. Exact amount only — pays the registered amount, never a custom one.
//   3. One payment per bill per month — duplicates are blocked.
//   4. The AI can never execute a payment — there is no payment tool in the
//      LLM registry. JARVIS prepares; the final tap is always yours.
//
// Configurable limits (Settings on the Bills page):
//   5. Per-payment cap
//   6. Monthly total cap across all payments
//   7. Minimum balance buffer that must remain after paying

import type { Bill, JarvisState } from "./store";
import { todayKey } from "./utils";

export interface GuardResult {
  allowed: boolean;
  checks: { rule: string; pass: boolean; detail: string }[];
}

export function checkPayment(
  state: Pick<JarvisState, "bills" | "payments" | "spendingRules" | "bank">,
  bill: Bill
): GuardResult {
  const { spendingRules: rules, bank } = state;
  const month = todayKey().slice(0, 7);
  const paidThisMonth = state.payments
    .filter((p) => p.month === month)
    .reduce((a, p) => a + p.amount, 0);

  const registered = state.bills.find((b) => b.id === bill.id);
  const balance = bank.balance;

  const checks = [
    {
      rule: "Whitelisted payee",
      pass: !!registered,
      detail: registered ? `"${bill.name}" is on the registered bill list` : "Not on the registered bill list",
    },
    {
      rule: "Exact registered amount",
      pass: !!registered && registered.amount === bill.amount && bill.amount > 0,
      detail: registered ? `$${bill.amount.toFixed(2)} matches the registered amount` : "Amount mismatch",
    },
    {
      rule: "No duplicate this month",
      pass: registered?.lastPaidMonth !== month,
      detail: registered?.lastPaidMonth === month ? `Already paid in ${month}` : "Not yet paid this month",
    },
    {
      rule: `Per-payment cap ($${rules.perPaymentCapUSD})`,
      pass: bill.amount <= rules.perPaymentCapUSD,
      detail: `$${bill.amount.toFixed(2)} vs cap $${rules.perPaymentCapUSD}`,
    },
    {
      rule: `Monthly cap ($${rules.monthlyCapUSD})`,
      pass: paidThisMonth + bill.amount <= rules.monthlyCapUSD,
      detail: `$${paidThisMonth.toFixed(2)} paid so far + $${bill.amount.toFixed(2)} = $${(paidThisMonth + bill.amount).toFixed(2)}`,
    },
    {
      rule: `Balance buffer ($${rules.minBalanceBufferUSD} must remain)`,
      pass: balance != null && balance - bill.amount >= rules.minBalanceBufferUSD,
      detail:
        balance == null
          ? "No bank balance available — link a bank or set the balance first"
          : `$${balance.toFixed(2)} − $${bill.amount.toFixed(2)} = $${(balance - bill.amount).toFixed(2)} remaining`,
    },
  ];

  return { allowed: checks.every((c) => c.pass), checks };
}

export function billsSummary(state: Pick<JarvisState, "bills" | "payments" | "bank" | "spendingRules">) {
  const month = todayKey().slice(0, 7);
  const day = new Date().getDate();
  const needed = state.bills.reduce((a, b) => a + b.amount, 0);
  const paid = state.payments.filter((p) => p.month === month).reduce((a, p) => a + p.amount, 0);
  const remainingBills = state.bills.filter((b) => b.lastPaidMonth !== month);
  const remaining = remainingBills.reduce((a, b) => a + b.amount, 0);
  const overdue = remainingBills.filter((b) => b.dueDay < day);
  const dueSoon = remainingBills.filter((b) => b.dueDay >= day && b.dueDay <= day + 7);
  const balance = state.bank.balance;
  const funded = balance != null ? balance - state.spendingRules.minBalanceBufferUSD >= remaining : null;
  return { month, needed, paid, remaining, overdue, dueSoon, balance, funded };
}
