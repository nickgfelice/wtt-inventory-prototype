"""Auth endpoint for login, logout, and current user session."""

import json
import os
import sys
from http.server import BaseHTTPRequestHandler

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "_shared"))

from auth import (  # noqa: E402
    AuthConfigError,
    AuthError,
    clear_session_cookie,
    create_session_cookie,
    get_request_user,
    verify_google_credential,
)


def _cors_headers():
    return {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
    }


def _send_json(handler, status, body, extra_headers=None):
    handler.send_response(status)
    handler.send_header("Content-Type", "application/json")
    for key, value in _cors_headers().items():
        handler.send_header(key, value)
    for key, value in (extra_headers or {}).items():
        handler.send_header(key, value)
    handler.end_headers()
    handler.wfile.write(json.dumps(body).encode())


def _read_json(handler):
    content_length = int(handler.headers.get("Content-Length", 0))
    if not content_length:
        return {}
    return json.loads(handler.rfile.read(content_length))


def _handle_get(handler):
    user = get_request_user(handler)
    return 200, {"user": user}


def _handle_login(body):
    user = verify_google_credential(str(body.get("credential", "")))
    return 200, {"user": user}, {"Set-Cookie": create_session_cookie(user)}


def _handle_logout():
    return 200, {"ok": True}, {"Set-Cookie": clear_session_cookie()}


def _handle_post(handler):
    body = _read_json(handler)
    if body.get("action") == "logout":
        return _handle_logout()
    return _handle_login(body)


class handler(BaseHTTPRequestHandler):
    def _route(self, method):
        try:
            if method == "GET":
                status, body = _handle_get(self)
                headers = None
            elif method == "POST":
                status, body, headers = _handle_post(self)
            else:
                status, body, headers = 405, {"error": "Method not allowed"}, None

            _send_json(self, status, body, headers)
        except AuthConfigError as exc:
            _send_json(self, 500, {"error": str(exc)})
        except AuthError as exc:
            _send_json(self, exc.status, {"error": str(exc)})
        except json.JSONDecodeError:
            _send_json(self, 400, {"error": "Invalid JSON in request body"})
        except Exception:
            _send_json(self, 500, {"error": "Internal server error"})

    def do_OPTIONS(self):
        self.send_response(204)
        for key, value in _cors_headers().items():
            self.send_header(key, value)
        self.end_headers()

    def do_GET(self):
        self._route("GET")

    def do_POST(self):
        self._route("POST")
