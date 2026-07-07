#!/usr/bin/env python3
"""Build the knowledge-galaxy graph from markdown notes.

Scans every .md under ./notes, writes viewer/graph-data.js with
  const GRAPH = {nodes: [...], links: [...]}
Nodes: label from filename, group from folder, ~700-char excerpt.
Links: note A mentions note B's title, or they share [[wikilinks]].
Node ids are numeric array indexes — later phases depend on that.

Standard library only. Run: python3 build.py
"""

import json
import os
import re

ROOT = os.path.dirname(os.path.abspath(__file__))
NOTES_DIR = os.path.join(ROOT, "notes")
OUT = os.path.join(ROOT, "viewer", "graph-data.js")

WIKILINK = re.compile(r"\[\[([^\]|#]+)")


def collect():
    notes = []
    for dirpath, dirs, files in os.walk(NOTES_DIR):
        dirs.sort()  # deterministic order — node ids must match server.py
        for fname in sorted(files):
            if not fname.endswith(".md"):
                continue
            path = os.path.join(dirpath, fname)
            with open(path, encoding="utf-8", errors="replace") as f:
                text = f.read()
            title = os.path.splitext(fname)[0]
            group = os.path.relpath(dirpath, NOTES_DIR).split(os.sep)[0]
            if group == ".":
                group = "notes"
            # excerpt: strip heading + wikilink brackets, ~700 chars
            body = re.sub(r"^#.*$", "", text, flags=re.M)
            body = body.replace("[[", "").replace("]]", "").strip()
            notes.append({
                "title": title,
                "group": group,
                "excerpt": body[:700],
                "text_lower": text.lower(),
                "wikilinks": {w.strip().lower() for w in WIKILINK.findall(text)},
            })
    return notes


def build_links(notes):
    links = []
    seen = set()
    titles = [n["title"].lower() for n in notes]
    for i, a in enumerate(notes):
        for j, b in enumerate(notes):
            if i >= j:
                continue
            linked = (
                titles[j] in a["wikilinks"]
                or titles[i] in b["wikilinks"]
                or titles[j] in a["text_lower"]
                or titles[i] in b["text_lower"]
                or (a["wikilinks"] and a["wikilinks"] & b["wikilinks"])
            )
            if linked and (i, j) not in seen:
                seen.add((i, j))
                links.append({"source": i, "target": j})
    return links


def main():
    notes = collect()
    if not notes:
        raise SystemExit(f"No .md files found under {NOTES_DIR}")
    nodes = [
        {"id": i, "label": n["title"], "group": n["group"], "excerpt": n["excerpt"]}
        for i, n in enumerate(notes)
    ]
    links = build_links(notes)
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, "w", encoding="utf-8") as f:
        f.write("const GRAPH = ")
        json.dump({"nodes": nodes, "links": links}, f, indent=1)
        f.write(";\n")
    groups = sorted({n["group"] for n in nodes})
    print(f"{len(nodes)} nodes, {len(links)} links, groups: {', '.join(groups)}")
    print(f"wrote {os.path.relpath(OUT, ROOT)}")


if __name__ == "__main__":
    main()
