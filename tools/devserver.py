#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Локальный сервер для превью: отдаёт файлы с запретом кэширования,
чтобы правки в CSS/JS/HTML были видны сразу после обновления страницы.
Запуск: python3 tools/devserver.py [порт] [папка]
"""
import os
import sys
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
ROOT = sys.argv[2] if len(sys.argv) > 2 else os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


class NoCacheHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()

    def log_message(self, fmt, *args):
        sys.stderr.write("%s - %s\n" % (self.address_string(), fmt % args))


if __name__ == "__main__":
    handler = partial(NoCacheHandler, directory=ROOT)
    with ThreadingHTTPServer(("0.0.0.0", PORT), handler) as httpd:
        print("LEDNIQUE dev server: http://0.0.0.0:%d  (root: %s)" % (PORT, ROOT), flush=True)
        httpd.serve_forever()
