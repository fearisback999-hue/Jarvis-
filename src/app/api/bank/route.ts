// Bank linking via Plaid. Read-only by design: JARVIS uses it to see the
// available balance so the Spending Guard can enforce the buffer rule —
// it can NOT move money through this route.
//
// .env.local:
//   PLAID_CLIENT_ID=...
//   PLAID_SECRET=...
//   PLAID_ENV=sandbox | development | production   (default sandbox)

import { NextRequest, NextResponse } from "next/server";

function plaidBase() {
  const env = process.env.PLAID_ENV || "sandbox";
  return `https://${env}.plaid.com`;
}

function creds() {
  const client_id = process.env.PLAID_CLIENT_ID;
  const secret = process.env.PLAID_SECRET;
  return client_id && secret ? { client_id, secret } : null;
}

async function plaid(path: string, body: Record<string, unknown>) {
  const res = await fetch(`${plaidBase()}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...creds(), ...body }),
    signal: AbortSignal.timeout(15000),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error_message || `Plaid ${path} failed`);
  return data;
}

export async function GET() {
  return NextResponse.json({ configured: creds() !== null, env: process.env.PLAID_ENV || "sandbox" });
}

export async function POST(req: NextRequest) {
  if (!creds()) {
    return NextResponse.json(
      { ok: false, error: "Bank linking not configured — set PLAID_CLIENT_ID and PLAID_SECRET in .env.local" },
      { status: 400 }
    );
  }
  const body = (await req.json()) as { action: string; public_token?: string; access_token?: string };

  try {
    switch (body.action) {
      case "create_link_token": {
        const data = await plaid("/link/token/create", {
          user: { client_user_id: "jarvis-owner" },
          client_name: "JARVIS",
          products: ["auth"],
          country_codes: ["US"],
          language: "en",
        });
        return NextResponse.json({ ok: true, link_token: data.link_token });
      }
      case "exchange": {
        const data = await plaid("/item/public_token/exchange", { public_token: body.public_token });
        return NextResponse.json({ ok: true, access_token: data.access_token });
      }
      case "balance": {
        const data = await plaid("/accounts/balance/get", { access_token: body.access_token });
        const accounts = (data.accounts as {
          name: string; mask: string; balances: { available: number | null; current: number | null };
        }[]).map((a) => ({
          name: a.name,
          mask: a.mask,
          available: a.balances.available ?? a.balances.current ?? 0,
        }));
        return NextResponse.json({ ok: true, accounts });
      }
      default:
        return NextResponse.json({ ok: false, error: `Unknown action: ${body.action}` }, { status: 400 });
    }
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e).slice(0, 200) }, { status: 502 });
  }
}
