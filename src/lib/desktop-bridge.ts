"use client";

// Client for the local Desktop Bridge (desktop-bridge/bridge.mjs running on
// the user's machine). Degrades gracefully when the bridge isn't running.

const BRIDGE_URL = "http://127.0.0.1:8377";
const TOKEN_KEY = "jarvis-bridge-token";

export function getBridgeToken(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(TOKEN_KEY) ?? "";
}

export function setBridgeToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token.trim());
}

export async function bridgeOnline(): Promise<boolean> {
  try {
    const res = await fetch(`${BRIDGE_URL}/status`, { signal: AbortSignal.timeout(1500) });
    const data = await res.json();
    return data?.ok === true;
  } catch {
    return false;
  }
}

export async function bridgeCmd(
  cmd: string,
  args: Record<string, unknown> = {}
): Promise<Record<string, unknown>> {
  try {
    const res = await fetch(`${BRIDGE_URL}/cmd`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-bridge-token": getBridgeToken() },
      body: JSON.stringify({ cmd, args }),
      signal: AbortSignal.timeout(20000),
    });
    const data = await res.json();
    if (res.status === 401) {
      return { ok: false, error: "Bridge rejected the token — paste the pairing token from the bridge window into Settings → Desktop bridge." };
    }
    return data;
  } catch {
    return {
      ok: false,
      error: "Desktop bridge not reachable. Run `node desktop-bridge/bridge.mjs` on your PC (see Settings → Desktop bridge).",
    };
  }
}
