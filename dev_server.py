"""Local development server — runs the Python API endpoints with Flask.

Usage:
    pip install flask python-dotenv google-api-python-client google-auth
    python dev_server.py

This reads your .env file and serves the API on http://localhost:5001.
Run alongside `npm run dev` (Vite proxies /api/* to this server).
"""

import json
import sys
import os
import io

# Add api directories to path so we can import the handler modules
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "api"))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "api", "_shared"))

# Load .env file
from dotenv import load_dotenv
load_dotenv()

from flask import Flask, request, Response

# Import the handler functions from each API module
import items as items_module
import categories as categories_module
import locations as locations_module

app = Flask(__name__)


class FakeHandler:
    """Mimics BaseHTTPRequestHandler enough for our API functions."""

    def __init__(self, flask_request):
        self.headers = dict(flask_request.headers)
        self.headers["Content-Length"] = str(len(flask_request.data))
        self.rfile = io.BytesIO(flask_request.data)
        self.path = flask_request.full_path.rstrip("?")
        self.wfile = io.BytesIO()

    def send_response(self, code):
        self._status = code

    def send_header(self, key, value):
        pass

    def end_headers(self):
        pass


def _route_module(module, method):
    """Route a request to the appropriate handler in an API module."""
    from google_auth import ConfigError
    try:
        from googleapiclient.errors import HttpError
    except ImportError:
        HttpError = Exception

    fake = FakeHandler(request)
    service = None
    sheet_id = None

    try:
        if module in (items_module, categories_module, locations_module):
            from google_auth import get_sheets_service, get_sheet_id
            service = get_sheets_service()
            sheet_id = get_sheet_id()

            if method == "GET":
                status, body = module._handle_get(service, sheet_id)
            elif method == "POST":
                status, body = module._handle_post(fake, service, sheet_id)
            elif method == "PUT":
                status, body = module._handle_put(fake, service, sheet_id)
            elif method == "DELETE":
                status, body = module._handle_delete(fake, service, sheet_id)
            else:
                status, body = 405, {"error": "Method not allowed"}

        else:
            status, body = 404, {"error": "Not found"}

        return Response(
            json.dumps(body),
            status=status,
            content_type="application/json",
            headers={"Access-Control-Allow-Origin": "*"},
        )

    except ConfigError as exc:
        return Response(
            json.dumps({"error": str(exc)}),
            status=500,
            content_type="application/json",
        )
    except HttpError as exc:
        code = getattr(getattr(exc, "resp", None), "status", "unknown")
        return Response(
            json.dumps({"error": f"Google API error: {code}"}),
            status=502,
            content_type="application/json",
        )
    except json.JSONDecodeError:
        return Response(
            json.dumps({"error": "Invalid JSON in request body"}),
            status=400,
            content_type="application/json",
        )
    except Exception:
        return Response(
            json.dumps({"error": "Internal server error"}),
            status=500,
            content_type="application/json",
        )


# --- Routes ---

@app.route("/api/items", methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"])
def api_items():
    if request.method == "OPTIONS":
        return Response("", 204, headers={"Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS", "Access-Control-Allow-Headers": "Content-Type"})
    return _route_module(items_module, request.method)


@app.route("/api/categories", methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"])
def api_categories():
    if request.method == "OPTIONS":
        return Response("", 204, headers={"Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS", "Access-Control-Allow-Headers": "Content-Type"})
    return _route_module(categories_module, request.method)


@app.route("/api/locations", methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"])
def api_locations():
    if request.method == "OPTIONS":
        return Response("", 204, headers={"Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS", "Access-Control-Allow-Headers": "Content-Type"})
    return _route_module(locations_module, request.method)


if __name__ == "__main__":
    print("Starting dev API server on http://localhost:5001")
    print("Make sure Vite is running with: npm run dev")
    app.run(port=5001, debug=True)
