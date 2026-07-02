"""Categories CRUD endpoint — Vercel Python serverless function.

Handles GET / POST / PUT / DELETE for the "Categories" worksheet in Google Sheets.
"""

import json
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "_shared"))

from http.server import BaseHTTPRequestHandler
from auth import AuthError, require_request_user
from google_auth import get_sheets_service, get_sheet_id, ConfigError
from sheets_helpers import CATEGORIES_HEADERS, ITEMS_HEADERS, item_to_row, row_to_item, apply_option_rename

try:
    from googleapiclient.errors import HttpError
except ImportError:  # pragma: no cover
    HttpError = Exception

CATEGORIES_RANGE = "Categories!A:A"
ITEMS_RANGE = "Items!A:J"

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
    """Create the header row in the Categories worksheet if it is missing."""
    result = (
        service.spreadsheets()
        .values()
        .get(spreadsheetId=sheet_id, range=CATEGORIES_RANGE)
        .execute()
    )
    values = result.get("values", [])
    if not values or all(cell == "" for cell in values[0]):
        service.spreadsheets().values().update(
            spreadsheetId=sheet_id,
            range="Categories!A1",
            valueInputOption="RAW",
            body={"values": [CATEGORIES_HEADERS]},
        ).execute()


def _get_categories_sheet_id(service, sheet_id):
    """Return the numeric sheetId for the 'Categories' worksheet (needed for deleteDimension)."""
    spreadsheet = service.spreadsheets().get(spreadsheetId=sheet_id).execute()
    for sheet in spreadsheet.get("sheets", []):
        props = sheet.get("properties", {})
        if props.get("title") == "Categories":
            return props["sheetId"]
    return None


def _read_categories(service, sheet_id):
    """Read all category names from the Categories worksheet. Returns list of strings."""
    result = (
        service.spreadsheets()
        .values()
        .get(spreadsheetId=sheet_id, range=CATEGORIES_RANGE)
        .execute()
    )
    rows = result.get("values", [])
    # Skip header row (row index 0), extract the name from each row
    if len(rows) > 1:
        return [row[0] for row in rows[1:] if row and row[0].strip()]
    return []


def _read_items(service, sheet_id):
    """Read all items from the Items worksheet. Returns list of item dicts."""
    result = (
        service.spreadsheets()
        .values()
        .get(spreadsheetId=sheet_id, range=ITEMS_RANGE)
        .execute()
    )
    rows = result.get("values", [])
    if len(rows) > 1:
        return [row_to_item(row) for row in rows[1:]]
    return []


# ---------------------------------------------------------------------------
# HTTP method handlers
# ---------------------------------------------------------------------------

def _handle_get(service, sheet_id):
    """Return all categories from the Categories worksheet."""
    _ensure_headers(service, sheet_id)
    categories = _read_categories(service, sheet_id)
    return 200, categories


def _handle_post(handler, service, sheet_id):
    """Add a new category to the Categories worksheet."""
    content_length = int(handler.headers.get("Content-Length", 0))
    if not content_length:
        return 400, {"error": "Request body is required"}

    body = json.loads(handler.rfile.read(content_length))

    name = body.get("name", "").strip() if isinstance(body.get("name"), str) else ""
    if not name:
        return 400, {"error": "name is required"}

    _ensure_headers(service, sheet_id)

    # Check for duplicate (case-insensitive)
    existing = _read_categories(service, sheet_id)
    if any(cat.lower() == name.lower() for cat in existing):
        return 400, {"error": f"Category already exists: {name}"}

    service.spreadsheets().values().append(
        spreadsheetId=sheet_id,
        range=CATEGORIES_RANGE,
        valueInputOption="RAW",
        body={"values": [[name]]},
    ).execute()

    return 200, {"name": name}


def _handle_put(handler, service, sheet_id):
    """Rename a category and cascade the rename to all items."""
    content_length = int(handler.headers.get("Content-Length", 0))
    if not content_length:
        return 400, {"error": "Request body is required"}

    body = json.loads(handler.rfile.read(content_length))

    current_name = body.get("currentName", "").strip() if isinstance(body.get("currentName"), str) else ""
    new_name = body.get("newName", "").strip() if isinstance(body.get("newName"), str) else ""

    if not current_name:
        return 400, {"error": "currentName is required"}
    if not new_name:
        return 400, {"error": "newName is required"}

    _ensure_headers(service, sheet_id)

    # Read all categories and find the row with the current name
    result = (
        service.spreadsheets()
        .values()
        .get(spreadsheetId=sheet_id, range=CATEGORIES_RANGE)
        .execute()
    )
    rows = result.get("values", [])

    target_row_num = None
    for idx, row in enumerate(rows):
        if idx == 0:
            continue  # skip header
        if row and row[0].strip().lower() == current_name.lower():
            target_row_num = idx + 1  # 1-based row number in Sheets
            break

    if target_row_num is None:
        return 404, {"error": f"Category not found: {current_name}"}

    # Check if newName already exists (case-insensitive), unless it's the same as currentName
    if current_name.lower() != new_name.lower():
        for idx, row in enumerate(rows):
            if idx == 0:
                continue
            if row and row[0].strip().lower() == new_name.lower():
                return 400, {"error": f"Category already exists: {new_name}"}

    # Step 1: Update the category name in the Categories worksheet
    service.spreadsheets().values().update(
        spreadsheetId=sheet_id,
        range=f"Categories!A{target_row_num}",
        valueInputOption="RAW",
        body={"values": [[new_name]]},
    ).execute()

    # Step 2: Cascade rename to all items in the Items worksheet
    items = _read_items(service, sheet_id)
    if items:
        updated_items = apply_option_rename(items, "category", current_name, new_name)
        # Write back all item rows to the Items worksheet
        updated_rows = [item_to_row(item) for item in updated_items]
        service.spreadsheets().values().update(
            spreadsheetId=sheet_id,
            range=f"Items!A2:J{len(updated_rows) + 1}",
            valueInputOption="RAW",
            body={"values": updated_rows},
        ).execute()

    return 200, {"name": new_name}


def _handle_delete(handler, service, sheet_id):
    """Delete a category by name."""
    content_length = int(handler.headers.get("Content-Length", 0))
    if not content_length:
        return 400, {"error": "Request body is required"}

    body = json.loads(handler.rfile.read(content_length))

    name = body.get("name", "").strip() if isinstance(body.get("name"), str) else ""
    if not name:
        return 400, {"error": "name is required"}

    _ensure_headers(service, sheet_id)

    # Check if category is in use by any items
    items = _read_items(service, sheet_id)
    in_use_count = sum(
        1 for item in items
        if isinstance(item.get("category", ""), str) and item["category"].lower() == name.lower()
    )
    if in_use_count > 0:
        return 400, {"error": f"Cannot delete category '{name}': used by {in_use_count} item(s)"}

    # Find the row with the matching name
    result = (
        service.spreadsheets()
        .values()
        .get(spreadsheetId=sheet_id, range=CATEGORIES_RANGE)
        .execute()
    )
    rows = result.get("values", [])

    target_row_idx = None
    for idx, row in enumerate(rows):
        if idx == 0:
            continue  # skip header
        if row and row[0].strip().lower() == name.lower():
            target_row_idx = idx
            break

    if target_row_idx is None:
        return 404, {"error": f"Category not found: {name}"}

    # Get the numeric sheet ID for the Categories worksheet
    categories_sheet_id = _get_categories_sheet_id(service, sheet_id)
    if categories_sheet_id is None:
        return 502, {"error": "Google Sheets service error: Categories worksheet not found"}

    # Delete the row using batchUpdate with deleteDimension
    service.spreadsheets().batchUpdate(
        spreadsheetId=sheet_id,
        body={
            "requests": [
                {
                    "deleteDimension": {
                        "range": {
                            "sheetId": categories_sheet_id,
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
