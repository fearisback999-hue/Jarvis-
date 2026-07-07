#!/usr/bin/env python3
"""Serve ONLY the viewer/ folder on http://localhost:4700 — stdlib only."""

import http.server
import os

PORT = 4700
VIEWER = os.path.join(os.path.dirname(os.path.abspath(__file__)), "viewer")


class ViewerHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=VIEWER, **kwargs)

    def log_message(self, fmt, *args):
        print(f"[galaxy] {self.address_string()} {fmt % args}")


def main():
    with http.server.ThreadingHTTPServer(("127.0.0.1", PORT), ViewerHandler) as httpd:
        print(f"JARVIS Knowledge Galaxy → http://localhost:{PORT}")
        print(f"serving only: {VIEWER}")
        httpd.serve_forever()


if __name__ == "__main__":
    main()
