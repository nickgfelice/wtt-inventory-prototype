"""Unit tests for api/locations.py — Locations CRUD endpoint."""

import json
import io

from unittest.mock import MagicMock, patch
import pytest

from locations import (
    _handle_get,
    _handle_post,
    _handle_put,
    _handle_delete,
    _ensure_headers,
    _get_locations_sheet_id,
    _read_locations,
    _read_items,
    _cors_headers,
    _send_json,
    handler,
)
from sheets_helpers import LOCATIONS_HEADERS, ITEMS_HEADERS


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture
def mock_service():
    """Create a mock Google Sheets service."""
    service = MagicMock()
    return service


@pytest.fixture
def sheet_id():
    return "test-sheet-id"


def _make_handler(body=None):
    """Create a mock BaseHTTPRequestHandler-like object."""
    h = MagicMock()
    h.headers = {}
    h.wfile = io.BytesIO()
    if body is not None:
        encoded = json.dumps(body).encode()
        h.headers["Content-Length"] = str(len(encoded))
        h.rfile = io.BytesIO(encoded)
    else:
        h.headers["Content-Length"] = "0"
        h.rfile = io.BytesIO(b"")
    return h


SAMPLE_ITEM_ROW = [
    "WTT-000001",
    "Typewriter",
    "Props",
    "Warehouse A",
    "https://drive.google.com/uc?id=abc",
    "TRUE",
    "FALSE",
    "",
    "",
    "1700000000000",
]


# ---------------------------------------------------------------------------
# _ensure_headers tests
# ---------------------------------------------------------------------------

class TestEnsureHeaders:
    def test_creates_headers_when_empty(self, mock_service, sheet_id):
        mock_service.spreadsheets().values().get().execute.return_value = {"values": []}
        _ensure_headers(mock_service, sheet_id)
        mock_service.spreadsheets().values().update.assert_called()

    def test_creates_headers_when_no_values_key(self, mock_service, sheet_id):
        mock_service.spreadsheets().values().get().execute.return_value = {}
        _ensure_headers(mock_service, sheet_id)
        mock_service.spreadsheets().values().update.assert_called()

    def test_skips_when_headers_exist(self, mock_service, sheet_id):
        mock_service.spreadsheets().values().get().execute.return_value = {
            "values": [LOCATIONS_HEADERS]
        }
        _ensure_headers(mock_service, sheet_id)
        mock_service.spreadsheets().values().update.assert_not_called()


# ---------------------------------------------------------------------------
# _get_locations_sheet_id tests
# ---------------------------------------------------------------------------

class TestGetLocationsSheetId:
    def test_finds_locations_sheet(self, mock_service, sheet_id):
        mock_service.spreadsheets().get().execute.return_value = {
            "sheets": [
                {"properties": {"title": "Items", "sheetId": 0}},
                {"properties": {"title": "Locations", "sheetId": 2}},
            ]
        }
        result = _get_locations_sheet_id(mock_service, sheet_id)
        assert result == 2

    def test_returns_none_when_not_found(self, mock_service, sheet_id):
        mock_service.spreadsheets().get().execute.return_value = {
            "sheets": [{"properties": {"title": "Items", "sheetId": 0}}]
        }
        result = _get_locations_sheet_id(mock_service, sheet_id)
        assert result is None


# ---------------------------------------------------------------------------
# GET tests
# ---------------------------------------------------------------------------

class TestHandleGet:
    def test_returns_locations(self, mock_service, sheet_id):
        mock_service.spreadsheets().values().get().execute.return_value = {
            "values": [["Name"], ["Warehouse A"], ["Warehouse B"], ["Office"]]
        }
        status, body = _handle_get(mock_service, sheet_id)
        assert status == 200
        assert body == ["Warehouse A", "Warehouse B", "Office"]

    def test_returns_empty_list_when_no_data(self, mock_service, sheet_id):
        mock_service.spreadsheets().values().get().execute.return_value = {
            "values": [["Name"]]
        }
        status, body = _handle_get(mock_service, sheet_id)
        assert status == 200
        assert body == []

    def test_returns_empty_list_when_only_headers(self, mock_service, sheet_id):
        mock_service.spreadsheets().values().get().execute.return_value = {
            "values": [LOCATIONS_HEADERS]
        }
        status, body = _handle_get(mock_service, sheet_id)
        assert status == 200
        assert body == []


# ---------------------------------------------------------------------------
# POST tests
# ---------------------------------------------------------------------------

class TestHandlePost:
    def test_creates_location(self, mock_service, sheet_id):
        mock_service.spreadsheets().values().get().execute.return_value = {
            "values": [["Name"]]
        }
        mock_service.spreadsheets().values().append().execute.return_value = {}

        h = _make_handler(body={"name": "Warehouse A"})
        status, body = _handle_post(h, mock_service, sheet_id)

        assert status == 200
        assert body == {"name": "Warehouse A"}

    def test_rejects_empty_name(self, mock_service, sheet_id):
        mock_service.spreadsheets().values().get().execute.return_value = {"values": []}
        h = _make_handler(body={"name": ""})
        status, body = _handle_post(h, mock_service, sheet_id)
        assert status == 400
        assert "name" in body["error"].lower()

    def test_rejects_missing_name(self, mock_service, sheet_id):
        mock_service.spreadsheets().values().get().execute.return_value = {"values": []}
        h = _make_handler(body={})
        status, body = _handle_post(h, mock_service, sheet_id)
        assert status == 400
        assert "name" in body["error"].lower()

    def test_rejects_empty_body(self, mock_service, sheet_id):
        h = _make_handler()
        status, body = _handle_post(h, mock_service, sheet_id)
        assert status == 400
        assert "required" in body["error"].lower()

    def test_rejects_duplicate_name_case_insensitive(self, mock_service, sheet_id):
        mock_service.spreadsheets().values().get().execute.return_value = {
            "values": [["Name"], ["Warehouse A"]]
        }

        h = _make_handler(body={"name": "warehouse a"})
        status, body = _handle_post(h, mock_service, sheet_id)
        assert status == 400
        assert "already exists" in body["error"].lower()

    def test_strips_whitespace_from_name(self, mock_service, sheet_id):
        mock_service.spreadsheets().values().get().execute.return_value = {
            "values": [["Name"]]
        }
        mock_service.spreadsheets().values().append().execute.return_value = {}

        h = _make_handler(body={"name": "  Warehouse A  "})
        status, body = _handle_post(h, mock_service, sheet_id)
        assert status == 200
        assert body == {"name": "Warehouse A"}


# ---------------------------------------------------------------------------
# PUT tests
# ---------------------------------------------------------------------------

class TestHandlePut:
    def test_renames_location(self, mock_service, sheet_id):
        mock_service.spreadsheets().values().get().execute.side_effect = [
            {"values": [["Name"], ["Warehouse A"]]},
            {"values": [["Name"], ["Warehouse A"]]},
            {"values": [ITEMS_HEADERS, SAMPLE_ITEM_ROW]},
        ]
        mock_service.spreadsheets().values().update().execute.return_value = {}

        h = _make_handler(body={"currentName": "Warehouse A", "newName": "Main Warehouse"})
        status, body = _handle_put(h, mock_service, sheet_id)

        assert status == 200
        assert body == {"name": "Main Warehouse"}

    def test_renames_location_case_insensitive(self, mock_service, sheet_id):
        mock_service.spreadsheets().values().get().execute.side_effect = [
            {"values": [["Name"], ["Warehouse A"]]},
            {"values": [["Name"], ["Warehouse A"]]},
            {"values": [ITEMS_HEADERS]},
        ]
        mock_service.spreadsheets().values().update().execute.return_value = {}

        h = _make_handler(body={"currentName": "warehouse a", "newName": "Main Warehouse"})
        status, body = _handle_put(h, mock_service, sheet_id)

        assert status == 200
        assert body == {"name": "Main Warehouse"}

    def test_returns_404_for_missing_location(self, mock_service, sheet_id):
        mock_service.spreadsheets().values().get().execute.side_effect = [
            {"values": [["Name"], ["Warehouse A"]]},
            {"values": [["Name"], ["Warehouse A"]]},
        ]

        h = _make_handler(body={"currentName": "NonExistent", "newName": "New"})
        status, body = _handle_put(h, mock_service, sheet_id)

        assert status == 404
        assert "NonExistent" in body["error"]

    def test_rejects_empty_current_name(self, mock_service, sheet_id):
        h = _make_handler(body={"currentName": "", "newName": "New"})
        status, body = _handle_put(h, mock_service, sheet_id)
        assert status == 400
        assert "currentName" in body["error"]

    def test_rejects_empty_new_name(self, mock_service, sheet_id):
        h = _make_handler(body={"currentName": "Warehouse A", "newName": ""})
        status, body = _handle_put(h, mock_service, sheet_id)
        assert status == 400
        assert "newName" in body["error"]

    def test_rejects_empty_body(self, mock_service, sheet_id):
        h = _make_handler()
        status, body = _handle_put(h, mock_service, sheet_id)
        assert status == 400

    def test_rejects_duplicate_new_name(self, mock_service, sheet_id):
        mock_service.spreadsheets().values().get().execute.side_effect = [
            {"values": [["Name"], ["Warehouse A"], ["Warehouse B"]]},
            {"values": [["Name"], ["Warehouse A"], ["Warehouse B"]]},
        ]

        h = _make_handler(body={"currentName": "Warehouse A", "newName": "Warehouse B"})
        status, body = _handle_put(h, mock_service, sheet_id)

        assert status == 400
        assert "already exists" in body["error"].lower()

    def test_allows_case_change_of_same_name(self, mock_service, sheet_id):
        mock_service.spreadsheets().values().get().execute.side_effect = [
            {"values": [["Name"], ["warehouse a"]]},
            {"values": [["Name"], ["warehouse a"]]},
            {"values": [ITEMS_HEADERS]},
        ]
        mock_service.spreadsheets().values().update().execute.return_value = {}

        h = _make_handler(body={"currentName": "warehouse a", "newName": "Warehouse A"})
        status, body = _handle_put(h, mock_service, sheet_id)

        assert status == 200
        assert body == {"name": "Warehouse A"}

    def test_cascades_rename_to_items(self, mock_service, sheet_id):
        item_row = list(SAMPLE_ITEM_ROW)
        mock_service.spreadsheets().values().get().execute.side_effect = [
            {"values": [["Name"], ["Warehouse A"]]},
            {"values": [["Name"], ["Warehouse A"]]},
            {"values": [ITEMS_HEADERS, item_row]},
        ]
        mock_service.spreadsheets().values().update().execute.return_value = {}

        h = _make_handler(body={"currentName": "Warehouse A", "newName": "Main Warehouse"})
        status, body = _handle_put(h, mock_service, sheet_id)

        assert status == 200
        update_calls = mock_service.spreadsheets().values().update.call_args_list
        assert len(update_calls) >= 2


# ---------------------------------------------------------------------------
# DELETE tests
# ---------------------------------------------------------------------------

class TestHandleDelete:
    def test_deletes_location(self, mock_service, sheet_id):
        mock_service.spreadsheets().values().get().execute.side_effect = [
            {"values": [["Name"], ["Warehouse A"]]},
            {"values": [ITEMS_HEADERS]},
            {"values": [["Name"], ["Warehouse A"]]},
        ]
        mock_service.spreadsheets().get().execute.return_value = {
            "sheets": [{"properties": {"title": "Locations", "sheetId": 2}}]
        }
        mock_service.spreadsheets().batchUpdate().execute.return_value = {}

        h = _make_handler(body={"name": "Warehouse A"})
        status, body = _handle_delete(h, mock_service, sheet_id)

        assert status == 200
        assert body["ok"] is True

    def test_returns_404_for_missing_location(self, mock_service, sheet_id):
        mock_service.spreadsheets().values().get().execute.side_effect = [
            {"values": [["Name"], ["Warehouse A"]]},
            {"values": [ITEMS_HEADERS]},
            {"values": [["Name"], ["Warehouse A"]]},
        ]

        h = _make_handler(body={"name": "NonExistent"})
        status, body = _handle_delete(h, mock_service, sheet_id)

        assert status == 404
        assert "NonExistent" in body["error"]

    def test_rejects_empty_name(self, mock_service, sheet_id):
        h = _make_handler(body={"name": ""})
        status, body = _handle_delete(h, mock_service, sheet_id)
        assert status == 400
        assert "name" in body["error"].lower()

    def test_rejects_missing_name(self, mock_service, sheet_id):
        h = _make_handler(body={})
        status, body = _handle_delete(h, mock_service, sheet_id)
        assert status == 400
        assert "name" in body["error"].lower()

    def test_rejects_empty_body(self, mock_service, sheet_id):
        h = _make_handler()
        status, body = _handle_delete(h, mock_service, sheet_id)
        assert status == 400

    def test_rejects_delete_when_location_in_use(self, mock_service, sheet_id):
        mock_service.spreadsheets().values().get().execute.side_effect = [
            {"values": [["Name"], ["Warehouse A"]]},
            {"values": [ITEMS_HEADERS, SAMPLE_ITEM_ROW]},
        ]

        h = _make_handler(body={"name": "Warehouse A"})
        status, body = _handle_delete(h, mock_service, sheet_id)

        assert status == 400
        assert "used by" in body["error"].lower()
        assert "1" in body["error"]

    def test_returns_502_when_sheet_not_found(self, mock_service, sheet_id):
        mock_service.spreadsheets().values().get().execute.side_effect = [
            {"values": [["Name"], ["Warehouse A"]]},
            {"values": [ITEMS_HEADERS]},
            {"values": [["Name"], ["Warehouse A"]]},
        ]
        mock_service.spreadsheets().get().execute.return_value = {
            "sheets": [{"properties": {"title": "Items", "sheetId": 0}}]
        }

        h = _make_handler(body={"name": "Warehouse A"})
        status, body = _handle_delete(h, mock_service, sheet_id)

        assert status == 502
        assert "Locations worksheet not found" in body["error"]


# ---------------------------------------------------------------------------
# CORS tests
# ---------------------------------------------------------------------------

class TestCors:
    def test_cors_headers_present(self):
        headers = _cors_headers()
        assert headers["Access-Control-Allow-Origin"] == "*"
        assert "GET" in headers["Access-Control-Allow-Methods"]
        assert "POST" in headers["Access-Control-Allow-Methods"]
        assert "PUT" in headers["Access-Control-Allow-Methods"]
        assert "DELETE" in headers["Access-Control-Allow-Methods"]
        assert "OPTIONS" in headers["Access-Control-Allow-Methods"]
