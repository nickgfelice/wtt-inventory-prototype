"""Items CRUD endpoint — Vercel Python serverless function.

Handles GET / POST / PUT / DELETE for the "Items" worksheet in Google Sheets.
"""

import json
import sys
import os
import time

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "_shared"))

from http.server import BaseHTTPRequestHandler
from auth import AuthError, require_request_user
from google_auth import get_sheets_service, get_sheet_id, ConfigError
from sheets_helpers import ITEMS_HEADERS, item_to_row, row_to_item, next_item_id

try:
    from googleapiclient.errors import HttpError
except ImportError:  # pragma: no cover
    HttpError = Exception

ITEMS_RANGE = "Items!A:L"

# ---------------------------------------------------------------------------
# CORS helpers
# ---------------------------------------------------------------------------

def _cors_headers():
    return {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
    }


def _send_json(handler, status, body):
    """Write a JSON response with CORS headers."""
    handler.send_response(status)
    handler.send_header("Content-Type", "application/json")
    for key, value in _cors_headers().items():
        handler.send_header(key, value)
    handler.end_headers()
    handler.wfile.write(json.dumps(body).encode())


# ---------------------------------------------------------------------------
# Sheet helpers
# ---------------------------------------------------------------------------

def _ensure_headers(service, sheet_id):
    """Create the header row in the Items worksheet if it is missing."""
    result = (
        service.spreadsheets()
        .values()
        .get(spreadsheetId=sheet_id, range=ITEMS_RANGE)
        .execute()
    )
    values = result.get("values", [])
    if not values or all(cell == "" for cell in values[0]):
        service.spreadsheets().values().update(
            spreadsheetId=sheet_id,
            range="Items!A1:L1",
            valueInputOption="RAW",
            body={"values": [ITEMS_HEADERS]},
        ).execute()


def _get_items_sheet_id(service, sheet_id):
    """Return the numeric sheetId for the 'Items' worksheet (needed for deleteDimension)."""
    spreadsheet = service.spreadsheets().get(spreadsheetId=sheet_id).execute()
    for sheet in spreadsheet.get("sheets", []):
        props = sheet.get("properties", {})
        if props.get("title") == "Items":
            return props["sheetId"]
    return None


# ---------------------------------------------------------------------------
# HTTP method handlers
# ---------------------------------------------------------------------------

def _handle_get(service, sheet_id):
    """Return all items from the Items worksheet."""
    _ensure_headers(service, sheet_id)
    result = (
        service.spreadsheets()
        .values()
        .get(spreadsheetId=sheet_id, range=ITEMS_RANGE)
        .execute()
    )
    rows = result.get("values", [])
    # Skip header row (row index 0)
    items = [row_to_item(row) for row in rows[1:]] if len(rows) > 1 else []
    return 200, items


def _handle_post(handler, service, sheet_id):
    """Create a new item and append it to the Items worksheet."""
    content_length = int(handler.headers.get("Content-Length", 0))
    if not content_length:
        return 400, {"error": "Request body is required"}

    body = json.loads(handler.rfile.read(content_length))

    # Validate required fields
    if not body.get("name"):
        return 400, {"error": "name is required"}
    if not body.get("category"):
        return 400, {"error": "category is required"}

    _ensure_headers(service, sheet_id)

    # Read existing IDs to generate the next one
    result = (
        service.spreadsheets()
        .values()
        .get(spreadsheetId=sheet_id, range="Items!A:A")
        .execute()
    )
    id_rows = result.get("values", [])
    existing_ids = [row[0] for row in id_rows[1:] if row] if len(id_rows) > 1 else []
    new_id = next_item_id(existing_ids)

    now = int(time.time() * 1000)

    item = {
        "id": new_id,
        "name": body["name"],
        "category": body["category"],
        "location": body.get("location", ""),
        "photoUrl": body.get("photoUrl", ""),
        "requiresTracking": bool(body.get("requiresTracking", False)),
        "checkedOut": bool(body.get("checkedOut", False)),
        "checkedOutAt": body.get("checkedOutAt", ""),
        "estimatedReturnDate": body.get("estimatedReturnDate", ""),
        "updatedAt": now,
        "description": body.get("description", ""),
        "organizationName": body.get("organizationName", ""),
    }

    row = item_to_row(item)
    service.spreadsheets().values().append(
        spreadsheetId=sheet_id,
        range=ITEMS_RANGE,
        valueInputOption="RAW",
        body={"values": [row]},
    ).execute()

    return 200, item


def _handle_put(handler, service, sheet_id):
    """Update an existing item by ID."""
    content_length = int(handler.headers.get("Content-Length", 0))
    if not content_length:
        return 400, {"error": "Request body is required"}

    body = json.loads(handler.rfile.read(content_length))

    item_id = body.get("id")
    if not item_id:
        return 400, {"error": "id is required"}

    _ensure_headers(service, sheet_id)

    # Find the row with the matching ID
    result = (
        service.spreadsheets()
        .values()
        .get(spreadsheetId=sheet_id, range=ITEMS_RANGE)
        .execute()
    )
    rows = result.get("values", [])

    target_row_num = None
    existing_item = None
    for idx, row in enumerate(rows):
        if idx == 0:
            continue  # skip header
        if row and row[0] == item_id:
            target_row_num = idx + 1  # 1-based row number in Sheets
            existing_item = row_to_item(row)
            break

    if target_row_num is None:
        return 404, {"error": f"Item not found: {item_id}"}

    now = int(time.time() * 1000)

    # Merge existing item with updates
    updated_item = {
        "id": item_id,
        "name": body.get("name", existing_item.get("name", "")),
        "category": body.get("category", existing_item.get("category", "")),
        "location": body.get("location", existing_item.get("location", "")),
        "photoUrl": body.get("photoUrl", existing_item.get("photoUrl", "")),
        "requiresTracking": body.get("requiresTracking", existing_item.get("requiresTracking", False)),
        "checkedOut": body.get("checkedOut", existing_item.get("checkedOut", False)),
        "checkedOutAt": body.get("checkedOutAt", existing_item.get("checkedOutAt", "")),
        "estimatedReturnDate": body.get("estimatedReturnDate", existing_item.get("estimatedReturnDate", "")),
        "updatedAt": now,
        "description": body.get("description", existing_item.get("description", "")),
        "organizationName": body.get("organizationName", existing_item.get("organizationName", "")),
    }

    updated_row = item_to_row(updated_item)
    service.spreadsheets().values().update(
        spreadsheetId=sheet_id,
        range=f"Items!A{target_row_num}:L{target_row_num}",
        valueInputOption="RAW",
        body={"values": [updated_row]},
    ).execute()

    return 200, updated_item


def _handle_delete(handler, service, sheet_id):
    """Delete an item by ID."""
    content_length = int(handler.headers.get("Content-Length", 0))
    if not content_length:
        return 400, {"error": "Request body is required"}

    body = json.loads(handler.rfile.read(content_length))

    item_id = body.get("id")
    if not item_id:
        return 400, {"error": "id is required"}

    _ensure_headers(service, sheet_id)

    # Find the row with the matching ID
    result = (
        service.spreadsheets()
        .values()
        .get(spreadsheetId=sheet_id, range=ITEMS_RANGE)
        .execute()
    )
    rows = result.get("values", [])

    target_row_idx = None
    for idx, row in enumerate(rows):
        if idx == 0:
            continue  # skip header
        if row and row[0] == item_id:
            target_row_idx = idx
            break

    if target_row_idx is None:
        return 404, {"error": f"Item not found: {item_id}"}

    # Get the numeric sheet ID for the Items worksheet
    items_sheet_id = _get_items_sheet_id(service, sheet_id)
    if items_sheet_id is None:
        return 502, {"error": "Google Sheets service error: Items worksheet not found"}

    # Delete the row using batchUpdate with deleteDimension
    service.spreadsheets().batchUpdate(
        spreadsheetId=sheet_id,
        body={
            "requests": [
                {
                    "deleteDimension": {
                        "range": {
                            "sheetId": items_sheet_id,
                            "dimension": "ROWS",
                            "startIndex": target_row_idx,
                            "endIndex": target_row_idx + 1,
                        }
                    }
                }
            ]
        },
    ).execute()

    return 200, {"ok": True}


# ---------------------------------------------------------------------------
# Vercel handler
# ---------------------------------------------------------------------------

class handler(BaseHTTPRequestHandler):
    def _route(self, method):
        try:
            if method in {"POST", "PUT", "DELETE"}:
                require_request_user(self)

            service = get_sheets_service()
            sheet_id = get_sheet_id()

            if method == "GET":
                status, body = _handle_get(service, sheet_id)
            elif method == "POST":
                status, body = _handle_post(self, service, sheet_id)
            elif method == "PUT":
                status, body = _handle_put(self, service, sheet_id)
            elif method == "DELETE":
                status, body = _handle_delete(self, service, sheet_id)
            else:
                status, body = 405, {"error": "Method not allowed"}

            _send_json(self, status, body)

        except ConfigError as exc:
            _send_json(self, 500, {"error": str(exc)})
        except AuthError as exc:
            _send_json(self, exc.status, {"error": str(exc)})
        except HttpError as exc:
            status_code = getattr(getattr(exc, "resp", None), "status", "unknown")
            _send_json(self, 502, {"error": f"Google Sheets service error: {status_code}"})
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

    def do_PUT(self):
        self._route("PUT")

    def do_DELETE(self):
        self._route("DELETE")
