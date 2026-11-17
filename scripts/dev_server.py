"""Local server for the app that tells the browser never to cache files,
so every reload shows your latest edits.  Run:  python3 scripts/dev_server.py
then open http://localhost:5173"""
import functools
import http.server
from pathlib import Path

APP = Path(__file__).resolve().parent.parent / "app"


class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()


if __name__ == "__main__":
    handler = functools.partial(NoCacheHandler, directory=str(APP))
    print("Serving app/ at http://localhost:5173")
    http.server.ThreadingHTTPServer(("", 5173), handler).serve_forever()
