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
    "You are JARVIS: a dry, impeccably polite British butler with a razor wit, "
    "serving as the keeper of the user's personal notes. Address him as \"sir\" "
    "occasionally — not every sentence. One genuinely funny line beats three bland ones.\n"
    "Rules:\n"
    "- Questions about his notes: ONE witty sentence plus the facts, drawn ONLY from "
    "the notes below. Never recite a note back — it's already on his screen. "
    "2-3 sentences maximum, plain text.\n"
    "- If the notes don't cover it, admit it with grace instead of guessing.\n"
    "- Small talk, greetings, jokes: reply in character with wit. Do NOT drag the "
    "notes into it.\n"
    "After your reply, on a new final line, write exactly: SOURCES: [i, j] — the "
    "bracketed ids of notes you actually used. For small talk or anything not "
    "answered from the notes, write SOURCES: [] — this stops the camera from "
    "flying around the galaxy needlessly.\n"
    "\nNOTES:\n{notes}"
)

SOURCES_RE = re.compile(r"\n?\s*SOURCES:\s*\[([^\]]*)\]\s*$", re.I)


def split_sources(answer, candidates):
    """Strip the SOURCES footer; return (clean_answer, used_node_ids)."""
    m = SOURCES_RE.search(answer)
    if not m:
        return answer.strip(), candidates
    clean = answer[: m.start()].strip()
    used = [int(x) for x in re.findall(r"\d+", m.group(1))]
    used = [i for i in used if i in candidates]
    # An explicit empty SOURCES: [] means small talk — no camera movement.
    return clean, used


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
    prompt = f"CONVERSATION SO FAR:\n{convo}\n\nReply with JARVIS's next answer only, following your role exactly."
    try:
        out = subprocess.run(
            ["claude", "-p", "--system-prompt", system, prompt],
            capture_output=True, text=True, timeout=180,
        )
        answer = out.stdout.strip()
        return answer or f"claude CLI returned nothing ({out.stderr.strip()[:120]})"
    except FileNotFoundError:
        return ("No API key in config.json and the `claude` CLI isn't installed — "
                "paste your Anthropic key into config.json, or install Claude Code.")
    except subprocess.TimeoutExpired:
        return "The claude CLI timed out, sir. Try again."


WITTY_CONFIRMS = [
    "Committed to memory, sir. I never forget — well, almost never.",
    "Filed under 'things you'll deny saying later', sir.",
    "Noted and immortalized, sir. The galaxy grows another star.",
    "Consider it engraved, sir — somewhat more durable than a sticky note.",
]
_confirm_i = 0


def remember_note(text):
    """Write a real markdown note into notes/captures/, append it to the
    in-memory index AND to viewer/graph-data.js (preserving existing ids),
    and return the new node + its most-related existing node."""
    global _confirm_i
    words = re.findall(r"[A-Za-z0-9']+", text)
    title = " ".join(words[:6]).strip().title() or "Untitled Capture"
    captures = os.path.join(NOTES_DIR, "captures")
    os.makedirs(captures, exist_ok=True)
    fname = re.sub(r"[^\w \-]", "", title)[:60] or "Capture"
    path = os.path.join(captures, f"{fname}.md")
    n = 2
    while os.path.exists(path):
        path = os.path.join(captures, f"{fname} {n}.md")
        title_n = f"{title} {n}"
        n += 1
    if n > 2:
        title = title_n
    with open(path, "w", encoding="utf-8") as f:
        f.write(f"# {title}\n\n{text}\n")

    related = top_notes(text, 1)  # most-related EXISTING note (before append)
    related_id = related[0] if related else None

    new_id = len(NOTES)
    NOTES.append({"title": title, "text": text})

    node = {"id": new_id, "label": title, "group": "captures", "excerpt": text[:700]}

    # keep graph-data.js in sync without renumbering existing ids
    gd_path = os.path.join(VIEWER, "graph-data.js")
    try:
        with open(gd_path, encoding="utf-8") as f:
            raw = f.read()
        graph = json.loads(raw[raw.index("{"): raw.rindex("}") + 1])
        graph["nodes"].append(node)
        if related_id is not None:
            graph["links"].append({"source": related_id, "target": new_id})
        with open(gd_path, "w", encoding="utf-8") as f:
            f.write("const GRAPH = ")
            json.dump(graph, f, indent=1)
            f.write(";\n")
    except (OSError, ValueError) as e:
        print(f"[galaxy] graph-data.js sync failed: {e}")

    say = WITTY_CONFIRMS[_confirm_i % len(WITTY_CONFIRMS)]
    _confirm_i += 1
    return {"node": node, "related": related_id, "say": say}


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

    def _json_response(self, obj, gsid=None):
        body = json.dumps(obj).encode()
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        if gsid:
            self.send_header("Set-Cookie", f"gsid={gsid}; Path=/; SameSite=Lax")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_POST(self):
        if self.path == "/remember":
            try:
                length = int(self.headers.get("Content-Length", 0))
                payload = json.loads(self.rfile.read(min(length, 20_000)) or b"{}")
                text = str(payload.get("text", "")).strip()[:4000]
            except (ValueError, json.JSONDecodeError):
                self.send_error(400)
                return
            if not text:
                self.send_error(400)
                return
            self._json_response(remember_note(text))
            return
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

        answer, used_nodes = split_sources(answer, idxs)

        history.append({"role": "user", "content": question})
        history.append({"role": "assistant", "content": answer})
        del history[:-MAX_HISTORY]

        body = json.dumps({"answer": answer, "nodes": used_nodes}).encode()
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
