#!/usr/bin/env node
// JARVIS Desktop Bridge — run this on YOUR computer:
//
//   node desktop-bridge/bridge.mjs
//
// It opens a small command server on 127.0.0.1:8377 (localhost only —
// nothing is exposed to the network). The JARVIS web app talks to it so
// voice commands like "Hey Jarvis, open Chrome" control this machine.
//
// On first run it prints a pairing token. Paste that token into
// JARVIS → Settings → Desktop bridge.
//
// Zero dependencies. Works on Windows, macOS, and Linux.

import http from "node:http";
import { exec } from "node:child_process";
import { randomBytes } from "node:crypto";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { homedir, platform } from "node:os";
import { join } from "node:path";

const PORT = 8377;
const OS = platform(); // "win32" | "darwin" | "linux"
const TOKEN_FILE = join(homedir(), ".jarvis-bridge-token");

let token;
if (existsSync(TOKEN_FILE)) {
  token = readFileSync(TOKEN_FILE, "utf8").trim();
} else {
  token = randomBytes(16).toString("hex");
  writeFileSync(TOKEN_FILE, token, { mode: 0o600 });
}

const run = (cmd) =>
  new Promise((resolve) => {
    exec(cmd, { timeout: 15000, windowsHide: true }, (err, stdout, stderr) => {
      resolve({ ok: !err, out: (stdout || stderr || "").trim().slice(0, 500), err: err?.message });
    });
  });

// Friendly names → what the OS actually launches
const APPS = {
  win32: {
    chrome: 'start "" chrome', browser: 'start "" chrome',
    edge: 'start "" msedge', firefox: 'start "" firefox',
    "vs code": 'start "" code', vscode: 'start "" code', code: 'start "" code',
    notepad: 'start "" notepad', calculator: 'start "" calc',
    terminal: 'start "" wt || start "" cmd', cmd: 'start "" cmd',
    explorer: 'start "" explorer', spotify: 'start "" spotify:',
    word: 'start "" winword', excel: 'start "" excel',
    "task manager": 'start "" taskmgr', settings: 'start "" ms-settings:',
  },
  darwin: {
    chrome: 'open -a "Google Chrome"', browser: 'open -a "Google Chrome"',
    safari: 'open -a Safari', firefox: 'open -a Firefox',
    "vs code": 'open -a "Visual Studio Code"', vscode: 'open -a "Visual Studio Code"', code: 'open -a "Visual Studio Code"',
    notes: 'open -a Notes', calculator: 'open -a Calculator',
    terminal: 'open -a Terminal', finder: 'open ~',
    spotify: 'open -a Spotify', music: 'open -a Music',
  },
  linux: {
    chrome: "google-chrome >/dev/null 2>&1 & disown || chromium >/dev/null 2>&1 & disown",
    browser: "xdg-open https://google.com",
    firefox: "firefox >/dev/null 2>&1 & disown",
    "vs code": "code", vscode: "code", code: "code",
    terminal: "x-terminal-emulator >/dev/null 2>&1 & disown",
    files: "xdg-open ~", spotify: "spotify >/dev/null 2>&1 & disown",
  },
}[OS] ?? {};

const openUrl = (url) =>
  OS === "win32" ? run(`start "" "${url.replace(/[&^]/g, "^$&")}"`)
  : OS === "darwin" ? run(`open "${url}"`)
  : run(`xdg-open "${url}"`);

// SendKeys codes: 173 mute, 174 vol-down, 175 vol-up, 176 next, 177 prev, 179 play/pause
const winKey = (code, times = 1) =>
  run(`powershell -NoProfile -Command "$w=New-Object -ComObject WScript.Shell; 1..${times} | ForEach-Object { $w.SendKeys([char]${code}) }"`);

async function volume(action, level) {
  if (OS === "win32") {
    if (action === "mute") return winKey(173);
    if (action === "up") return winKey(175, 5);
    if (action === "down") return winKey(174, 5);
    if (action === "set" && level != null) {
      // approximate: mute-independent absolute set via 50 downs then N ups
      await winKey(174, 50);
      return winKey(175, Math.round(level / 2));
    }
  }
  if (OS === "darwin") {
    if (action === "mute") return run(`osascript -e "set volume with output muted"`);
    if (action === "set" && level != null) return run(`osascript -e "set volume output volume ${Math.round(level)}"`);
    const delta = action === "up" ? 10 : -10;
    return run(`osascript -e "set volume output volume ((output volume of (get volume settings)) + ${delta})"`);
  }
  if (action === "mute") return run("amixer -q sset Master toggle");
  if (action === "set" && level != null) return run(`amixer -q sset Master ${Math.round(level)}%`);
  return run(`amixer -q sset Master 10%${action === "up" ? "+" : "-"}`);
}

async function media(action) {
  if (OS === "win32") {
    if (action === "playpause") return winKey(179);
    if (action === "next") return winKey(176);
    if (action === "prev") return winKey(177);
  }
  if (OS === "darwin") {
    const map = { playpause: "playpause", next: "next track", prev: "previous track" };
    return run(`osascript -e 'tell application "Spotify" to ${map[action]}' 2>/dev/null || osascript -e 'tell application "Music" to ${map[action]}'`);
  }
  const map = { playpause: "play-pause", next: "next", prev: "previous" };
  return run(`playerctl ${map[action]}`);
}

async function screenshot() {
  const file = join(homedir(), "Desktop", `jarvis-shot-${Date.now()}.png`);
  if (OS === "win32")
    return { ...(await run(
      `powershell -NoProfile -Command "Add-Type -AssemblyName System.Windows.Forms,System.Drawing; $b=[System.Windows.Forms.Screen]::PrimaryScreen.Bounds; $bmp=New-Object Drawing.Bitmap $b.Width,$b.Height; $g=[Drawing.Graphics]::FromImage($bmp); $g.CopyFromScreen($b.Location,[Drawing.Point]::Empty,$b.Size); $bmp.Save('${file.replace(/\\/g, "\\\\")}')"`
    )), file };
  if (OS === "darwin") return { ...(await run(`screencapture -x "${file}"`)), file };
  return { ...(await run(`import -window root "${file}" 2>/dev/null || gnome-screenshot -f "${file}"`)), file };
}

const lock = () =>
  OS === "win32" ? run("rundll32.exe user32.dll,LockWorkStation")
  : OS === "darwin" ? run(`osascript -e 'tell application "System Events" to keystroke "q" using {command down, control down}'`)
  : run("loginctl lock-session || xdg-screensaver lock");

function typeText(text) {
  const safe = String(text).slice(0, 500);
  if (OS === "win32") {
    const esc = safe.replace(/([+^%~(){}\[\]])/g, "{$1}").replace(/"/g, '""');
    return run(`powershell -NoProfile -Command "$w=New-Object -ComObject WScript.Shell; Start-Sleep -Milliseconds 300; $w.SendKeys(\\"${esc}\\")"`);
  }
  if (OS === "darwin") {
    const esc = safe.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
    return run(`osascript -e 'delay 0.3' -e 'tell application "System Events" to keystroke "${esc}"'`);
  }
  return run(`xdotool type --delay 20 "${safe.replace(/"/g, '\\"')}"`);
}

async function handle(cmd, args = {}) {
  switch (cmd) {
    case "ping": return { ok: true, platform: OS };
    case "open_app": {
      const name = String(args.app ?? "").toLowerCase().trim();
      const launcher = APPS[name];
      if (launcher) return run(launcher);
      // fall back to launching the raw name (letters/digits/space/dash only)
      if (!/^[\w .-]{1,40}$/.test(name)) return { ok: false, err: "Unknown app" };
      return OS === "win32" ? run(`start "" "${name}"`) : OS === "darwin" ? run(`open -a "${name}"`) : run(`${name} >/dev/null 2>&1 & disown`);
    }
    case "open_url": {
      const url = String(args.url ?? "");
      if (!/^https?:\/\//.test(url)) return { ok: false, err: "http(s) URLs only" };
      return openUrl(url);
    }
    case "search": return openUrl(`https://www.google.com/search?q=${encodeURIComponent(String(args.query ?? ""))}`);
    case "volume": return volume(String(args.action), args.level == null ? undefined : Number(args.level));
    case "media": return media(String(args.action));
    case "type": return typeText(args.text);
    case "screenshot": return screenshot();
    case "lock": return lock();
    case "run": {
      // Arbitrary shell — irreversible-capable, so it requires the client to
      // have shown the user the exact command and pass confirm:true.
      if (args.confirm !== true) return { ok: false, err: "Confirmation required" };
      return run(String(args.command ?? ""));
    }
    default: return { ok: false, err: `Unknown command: ${cmd}` };
  }
}

const ALLOWED_ORIGINS = ["http://localhost:3000", "http://127.0.0.1:3000"];

const server = http.createServer(async (req, res) => {
  const origin = req.headers.origin ?? "";
  const headers = {
    "Content-Type": "application/json",
    ...(ALLOWED_ORIGINS.includes(origin) && {
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Headers": "content-type, x-bridge-token",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    }),
  };
  if (req.method === "OPTIONS") { res.writeHead(204, headers); return res.end(); }

  if (req.method === "GET" && req.url === "/status") {
    res.writeHead(200, headers);
    return res.end(JSON.stringify({ ok: true, platform: OS, name: "jarvis-bridge", v: 1 }));
  }

  if (req.method === "POST" && req.url === "/cmd") {
    if (req.headers["x-bridge-token"] !== token) {
      res.writeHead(401, headers);
      return res.end(JSON.stringify({ ok: false, err: "Bad token" }));
    }
    let body = "";
    req.on("data", (c) => { body += c; if (body.length > 10_000) req.destroy(); });
    req.on("end", async () => {
      try {
        const { cmd, args } = JSON.parse(body || "{}");
        const result = await handle(cmd, args);
        console.log(`[bridge] ${cmd}`, args ?? "", "→", result.ok ? "ok" : result.err);
        res.writeHead(200, headers);
        res.end(JSON.stringify(result));
      } catch (e) {
        res.writeHead(400, headers);
        res.end(JSON.stringify({ ok: false, err: String(e) }));
      }
    });
    return;
  }

  res.writeHead(404, headers);
  res.end(JSON.stringify({ ok: false, err: "Not found" }));
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`
  ╔══════════════════════════════════════════════════╗
  ║  JARVIS Desktop Bridge — online                   ║
  ╚══════════════════════════════════════════════════╝

  Listening on http://127.0.0.1:${PORT} (this machine only)
  Platform: ${OS}

  Pairing token (paste into JARVIS → Settings → Desktop bridge):

    ${token}

  Keep this window open. Ctrl+C to stop.
`);
});
