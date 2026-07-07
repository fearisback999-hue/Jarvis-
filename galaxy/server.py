#!/usr/bin/env python3
"""JARVIS Knowledge Galaxy server — stdlib only.

Serves ONLY the viewer/ folder on http://localhost:4700, plus a POST /chat
endpoint that answers questions from the notes:

  1. Scores every note against the question by keyword overlap
     (title-word matches weigh extra), takes the top 6.
  2. Calls the Anthropic Messages API with the model from ../config.json —
     or, if no API key is configured, shells out to `claude -p` so it runs
     on a Claude Code subscription instead.
  3. Returns {"answer": "...", "nodes": [note indexes used]}.

config.json lives in the project root (NOT inside viewer/) — the browser
can never fetch it, and the API key never appears in anything served.
Short per-session conversation history is kept in memory (cookie `gsid`).
"""

import http.server
import json
import os
import re
import subprocess
import urllib.request
import uuid

PORT = 4700
ROOT = os.path.dirname(os.path.abspath(__file__))
VIEWER = os.path.join(ROOT, "viewer")
NOTES_DIR = os.path.join(ROOT, "notes")
CONFIG_PATH = os.path.join(ROOT, "config.json")

WORD = re.compile(r"[a-z0-9']+")
STOP = set("the a an and or of to in on for with is are was be it this that my i you what how when where why which do does".split())

SESSIONS: dict[str, list[dict]] = {}  # gsid -> [{role, content}, ...]
MAX_HISTORY = 10


def load_config():
    try:
        with open(CONFIG_PATH, encoding="utf-8") as f:
            cfg = json.load(f)
    except (OSError, json.JSONDecodeError):
        cfg = {}
    key = (cfg.get("api_key") or "").strip()
    if key.upper().startswith("PUT-YOUR"):
        key = ""
    return key, cfg.get("model", "claude-opus-4-8")


def load_notes():
    """Same traversal as build.py — index i here IS node id i in the graph."""
    notes = []
    for dirpath, dirs, files in os.walk(NOTES_DIR):
        dirs.sort()
        for fname in sorted(files):
            if not fname.endswith(".md"):
                continue
            with open(os.path.join(dirpath, fname), encoding="utf-8", errors="replace") as f:
                text = f.read()
            title = os.path.splitext(fname)[0]
            notes.append({"title": title, "text": text.replace("[[", "").replace("]]", "")})
    return notes


NOTES = load_notes()


def tokens(s):
    return [w for w in WORD.findall(s.lower()) if w not in STOP]


def top_notes(question, k=6):
    q = set(tokens(question))
    if not q:
        return []
    scored = []
    for i, n in enumerate(NOTES):
        title_words = set(tokens(n["title"]))
        body = n["text"].lower()
        score = 3.0 * len(q & title_words) + sum(min(body.count(w), 4) for w in q)
        if score > 0:
            scored.append((score, i))
    scored.sort(reverse=True)
    return [i for _score, i in scored[:k]]


SYSTEM = (
    "You are JARVIS, answering questions about the user's personal notes. "
    "Answer ONLY from the notes provided below — do not use outside knowledge. "
    "Reply in 2-3 sentences, plain text. If the notes don't cover the question, "
    "say so plainly instead of guessing.\n\nNOTES:\n{notes}"
)


def notes_block(idxs):
    parts = []
    for i in idxs:
        n = NOTES[i]
        parts.append(f"[{i}] {n['title']}\n{n['text'][:1500]}")
    return "\n\n".join(parts) if parts else "(no matching notes)"


def ask_anthropic(api_key, model, system, messages):
    body = json.dumps({
        "model": model,
        "max_tokens": 400,
        "system": system,
        "messages": messages,
    }).encode()
    req = urllib.request.Request(
        "https://api.anthropic.com/v1/messages",
        data=body,
        headers={
            "Content-Type": "application/json",
            "x-api-key": api_key,
            "anthropic-version": "2023-06-01",
        },
    )
    with urllib.request.urlopen(req, timeout=120) as res:
        data = json.load(res)
    if data.get("stop_reason") == "refusal" or not data.get("content"):
        return "I can't answer that one, sir."
    return "".join(b.get("text", "") for b in data["content"] if b.get("type") == "text").strip()


def ask_claude_cli(system, messages):
    """Fallback: run on a Claude Code subscription via `claude -p`."""
    convo = "\n".join(f"{m['role'].upper()}: {m['content']}" for m in messages)
    prompt = f"{system}\n\nCONVERSATION SO FAR:\n{convo}\n\nReply with the assistant's next answer only."
    try:
        out = subprocess.run(
            ["claude", "-p", prompt],
            capture_output=True, text=True, timeout=180,
        )
        answer = out.stdout.strip()
        return answer or f"claude CLI returned nothing ({out.stderr.strip()[:120]})"
    except FileNotFoundError:
        return ("No API key in config.json and the `claude` CLI isn't installed — "
                "paste your Anthropic key into config.json, or install Claude Code.")
    except subprocess.TimeoutExpired:
        return "The claude CLI timed out, sir. Try again."


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=VIEWER, **kwargs)

    def log_message(self, fmt, *args):
        print(f"[galaxy] {fmt % args}")

    def _session(self):
        cookie = self.headers.get("Cookie", "")
        m = re.search(r"gsid=([a-f0-9-]+)", cookie)
        gsid = m.group(1) if m and m.group(1) in SESSIONS else None
        if not gsid:
            gsid = str(uuid.uuid4())
            SESSIONS[gsid] = []
        return gsid

    def do_POST(self):
        if self.path != "/chat":
            self.send_error(404)
            return
        try:
            length = int(self.headers.get("Content-Length", 0))
            payload = json.loads(self.rfile.read(min(length, 20_000)) or b"{}")
            question = str(payload.get("q", "")).strip()[:1000]
        except (ValueError, json.JSONDecodeError):
            self.send_error(400)
            return
        if not question:
            self.send_error(400)
            return

        gsid = self._session()
        history = SESSIONS[gsid]
        idxs = top_notes(question)
        system = SYSTEM.format(notes=notes_block(idxs))
        messages = history + [{"role": "user", "content": question}]

        api_key, model = load_config()
        try:
            if api_key:
                answer = ask_anthropic(api_key, model, system, messages)
            else:
                answer = ask_claude_cli(system, messages)
        except Exception as e:  # noqa: BLE001 — surface any API failure as text
            answer = f"Brain hiccup: {str(e)[:160]}"

        history.append({"role": "user", "content": question})
        history.append({"role": "assistant", "content": answer})
        del history[:-MAX_HISTORY]

        body = json.dumps({"answer": answer, "nodes": idxs}).encode()
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Set-Cookie", f"gsid={gsid}; Path=/; SameSite=Lax")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)


def main():
    key, model = load_config()
    brain = f"Anthropic API ({model})" if key else "`claude -p` CLI fallback (no API key in config.json)"
    with http.server.ThreadingHTTPServer(("127.0.0.1", PORT), Handler) as httpd:
        print(f"JARVIS Knowledge Galaxy → http://localhost:{PORT}")
        print(f"notes: {len(NOTES)} · brain: {brain}")
        print(f"serving only: {VIEWER}")
        httpd.serve_forever()


if __name__ == "__main__":
    main()
