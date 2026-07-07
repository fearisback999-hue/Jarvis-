// TikTok Shop Affiliate API (Open Platform) — real creator-marketplace access.
//
// Requires a TikTok Shop Partner app with Affiliate API access
// (partner.tiktokshop.com — access is granted to approved partners):
//   TTS_APP_KEY, TTS_APP_SECRET   — your app credentials
//   TTS_ACCESS_TOKEN              — shop access token (OAuth)
//   TTS_SHOP_CIPHER               — the shop's cipher
//   TTS_AFFILIATE_SEARCH_PATH     — optional override of the creator-search
//                                   endpoint path if your app's version differs
//
// Implements TikTok Shop's request signing: HMAC-SHA256 over
// secret + path + sorted(query params) + body + secret.

import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";

const HOST = "https://open-api.tiktokglobalshop.com";
const DEFAULT_SEARCH_PATH = "/affiliate_seller/202405/marketplace_creators/search";

function config() {
  const { TTS_APP_KEY, TTS_APP_SECRET, TTS_ACCESS_TOKEN, TTS_SHOP_CIPHER } = process.env;
  if (!TTS_APP_KEY || !TTS_APP_SECRET || !TTS_ACCESS_TOKEN) return null;
  return {
    appKey: TTS_APP_KEY,
    appSecret: TTS_APP_SECRET,
    accessToken: TTS_ACCESS_TOKEN,
    shopCipher: TTS_SHOP_CIPHER ?? "",
    searchPath: process.env.TTS_AFFILIATE_SEARCH_PATH ?? DEFAULT_SEARCH_PATH,
  };
}

function sign(path: string, params: Record<string, string>, body: string, secret: string) {
  const sorted = Object.keys(params)
    .filter((k) => k !== "sign" && k !== "access_token")
    .sort()
    .map((k) => k + params[k])
    .join("");
  return crypto.createHmac("sha256", secret).update(secret + path + sorted + body + secret).digest("hex");
}

async function ttsRequest(path: string, query: Record<string, string>, bodyObj: unknown) {
  const cfg = config()!;
  const params: Record<string, string> = {
    app_key: cfg.appKey,
    timestamp: String(Math.floor(Date.now() / 1000)),
    ...(cfg.shopCipher && { shop_cipher: cfg.shopCipher }),
    ...query,
  };
  const body = bodyObj ? JSON.stringify(bodyObj) : "";
  params.sign = sign(path, params, body, cfg.appSecret);
  const qs = new URLSearchParams(params).toString();
  const res = await fetch(`${HOST}${path}?${qs}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-tts-access-token": cfg.accessToken },
    body: body || undefined,
    signal: AbortSignal.timeout(20000),
  });
  return { status: res.status, data: await res.json().catch(() => ({})) };
}

export async function GET() {
  return NextResponse.json({ configured: config() !== null });
}

export async function POST(req: NextRequest) {
  if (!config()) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "TikTok Affiliate API not configured — add TTS_APP_KEY, TTS_APP_SECRET, TTS_ACCESS_TOKEN (and TTS_SHOP_CIPHER) to .env.local. Requires an approved TikTok Shop Partner app with Affiliate API access.",
      },
      { status: 400 }
    );
  }
  const { action, keyword, pageSize } = (await req.json()) as {
    action: string; keyword?: string; pageSize?: number;
  };

  try {
    if (action === "search_creators") {
      const { status, data } = await ttsRequest(
        config()!.searchPath,
        { page_size: String(Math.min(pageSize ?? 12, 50)) },
        keyword ? { keyword } : {}
      );
      // defensive mapping — field names vary slightly across API versions
      const list =
        data?.data?.creators ?? data?.data?.creator_list ?? data?.data?.list ?? [];
      const creators = (list as Record<string, unknown>[]).map((c) => ({
        handle: String(c.handle ?? c.username ?? c.creator_username ?? c.nickname ?? "unknown"),
        nickname: String(c.nickname ?? c.creator_nickname ?? ""),
        followers: Number(
          (c.follower_count as number) ??
          ((c.selection_region_follower_count as { count?: number })?.count ?? 0)
        ),
        gmv: Number((c.gmv as { amount?: number })?.amount ?? c.gmv ?? 0),
        categories: c.categories ?? c.product_categories ?? [],
      }));
      return NextResponse.json({
        ok: status === 200 && !data?.code,
        status,
        creators,
        apiMessage: data?.message,
        raw: creators.length === 0 ? data : undefined,
      });
    }
    return NextResponse.json({ ok: false, error: `Unknown action: ${action}` }, { status: 400 });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e).slice(0, 200) }, { status: 502 });
  }
}
