"""Unit tests for api/items.py — Items CRUD endpoint."""

import json
import io

from unittest.mock import MagicMock, patch, PropertyMock
import pytest

# We need to mock googleapiclient before importing items module
import unittest.mock

# Create a mock HttpError class for testing
class MockHttpError(Exception):
    def __init__(self, status=500):
        self.resp = MagicMock()
        self.resp.status = status
        super().__init__(f"HttpError {status}")


# Patch the import so items.py can find it
with patch.dict("sys.modules", {"googleapiclient.errors": MagicMock(HttpError=MockHttpError)}):
    # Now we need to ensure items module uses our MockHttpError
    pass

from items import (
    _handle_get,
    _handle_post,
    _handle_put,
    _handle_delete,
    _ensure_headers,
    _get_items_sheet_id,
    _cors_headers,
    _send_json,
    handler,
)
from sheets_helpers import ITEMS_HEADERS


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


def _make_handler(method="GET", body=None):
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


SAMPLE_ROW = [
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
            "values": [ITEMS_HEADERS]
        }
        _ensure_headers(mock_service, sheet_id)
        mock_service.spreadsheets().values().update.assert_not_called()


# ---------------------------------------------------------------------------
# GET tests
# ---------------------------------------------------------------------------

class TestHandleGet:
    def test_returns_items(self, mock_service, sheet_id):
        mock_service.spreadsheets().values().get().execute.return_value = {
            "values": [ITEMS_HEADERS, SAMPLE_ROW]
        }
        status, body = _handle_get(mock_service, sheet_id)
        assert status == 200
        assert len(body) == 1
        assert body[0]["id"] == "WTT-000001"
        assert body[0]["name"] == "Typewriter"
        assert body[0]["category"] == "Props"

    def test_returns_empty_list_when_no_data(self, mock_service, sheet_id):
        mock_service.spreadsheets().values().get().execute.return_value = {
            "values": [ITEMS_HEADERS]
        }
        status, body = _handle_get(mock_service, sheet_id)
        assert status == 200
        assert body == []

    def test_returns_empty_list_when_only_headers(self, mock_service, sheet_id):
        mock_service.spreadsheets().values().get().execute.return_value = {
            "values": [ITEMS_HEADERS]
        }
        status, body = _handle_get(mock_service, sheet_id)
        assert status == 200
        assert body == []


# ---------------------------------------------------------------------------
# POST tests
# ---------------------------------------------------------------------------

class TestHandlePost:
    def test_creates_item(self, mock_service, sheet_id):
        # Mock reading existing IDs
        mock_service.spreadsheets().values().get().execute.return_value = {
            "values": [["ID"], ["WTT-000001"]]
        }
        mock_service.spreadsheets().values().append().execute.return_value = {}

        h = _make_handler(body={"name": "Camera", "category": "Equipment"})
        status, body = _handle_post(h, mock_service, sheet_id)

        assert status == 200
        assert body["id"] == "WTT-000002"
        assert body["name"] == "Camera"
        assert body["category"] == "Equipment"
        assert body["requiresTracking"] is False
        assert body["checkedOut"] is False
        assert isinstance(body["updatedAt"], int)

    def test_creates_first_item(self, mock_service, sheet_id):
        mock_service.spreadsheets().values().get().execute.return_value = {
            "values": [["ID"]]
        }
        mock_service.spreadsheets().values().append().execute.return_value = {}

        h = _make_handler(body={"name": "Camera", "category": "Equipment"})
        status, body = _handle_post(h, mock_service, sheet_id)

        assert status == 200
        assert body["id"] == "WTT-000001"

    def test_rejects_missing_name(self, mock_service, sheet_id):
        mock_service.spreadsheets().values().get().execute.return_value = {"values": []}
        h = _make_handler(body={"category": "Equipment"})
        status, body = _handle_post(h, mock_service, sheet_id)
        assert status == 400
        assert "name" in body["error"]

    def test_rejects_missing_category(self, mock_service, sheet_id):
        mock_service.spreadsheets().values().get().execute.return_value = {"values": []}
        h = _make_handler(body={"name": "Camera"})
        status, body = _handle_post(h, mock_service, sheet_id)
        assert status == 400
        assert "category" in body["error"]

    def test_rejects_empty_body(self, mock_service, sheet_id):
        h = _make_handler()  # no body
        status, body = _handle_post(h, mock_service, sheet_id)
        assert status == 400
        assert "required" in body["error"].lower()

    def test_includes_optional_fields(self, mock_service, sheet_id):
        mock_service.spreadsheets().values().get().execute.return_value = {
            "values": [["ID"]]
        }
        mock_service.spreadsheets().values().append().execute.return_value = {}

        h = _make_handler(body={
            "name": "Camera",
            "category": "Equipment",
            "location": "Studio B",
            "photoUrl": "https://example.com/photo.jpg",
            "requiresTracking": True,
        })
        status, body = _handle_post(h, mock_service, sheet_id)

        assert status == 200
        assert body["location"] == "Studio B"
        assert body["photoUrl"] == "https://example.com/photo.jpg"
        assert body["requiresTracking"] is True


# ---------------------------------------------------------------------------
# PUT tests
# ---------------------------------------------------------------------------

class TestHandlePut:
    def test_updates_item(self, mock_service, sheet_id):
        mock_service.spreadsheets().values().get().execute.return_value = {
            "values": [ITEMS_HEADERS, SAMPLE_ROW]
        }
        mock_service.spreadsheets().values().update().execute.return_value = {}

        h = _make_handler(body={"id": "WTT-000001", "name": "Updated Typewriter"})
        status, body = _handle_put(h, mock_service, sheet_id)

        assert status == 200
        assert body["id"] == "WTT-000001"
        assert body["name"] == "Updated Typewriter"
        assert body["category"] == "Props"  # preserved from existing

    def test_returns_404_for_missing_item(self, mock_service, sheet_id):
        mock_service.spreadsheets().values().get().execute.return_value = {
            "values": [ITEMS_HEADERS, SAMPLE_ROW]
        }

        h = _make_handler(body={"id": "WTT-999999", "name": "Ghost"})
        status, body = _handle_put(h, mock_service, sheet_id)

        assert status == 404
        assert "WTT-999999" in body["error"]

    def test_rejects_missing_id(self, mock_service, sheet_id):
        h = _make_handler(body={"name": "No ID"})
        status, body = _handle_put(h, mock_service, sheet_id)
        assert status == 400
        assert "id" in body["error"]

    def test_rejects_empty_body(self, mock_service, sheet_id):
        h = _make_handler()
        status, body = _handle_put(h, mock_service, sheet_id)
        assert status == 400

    def test_updates_all_fields(self, mock_service, sheet_id):
        mock_service.spreadsheets().values().get().execute.return_value = {
            "values": [ITEMS_HEADERS, SAMPLE_ROW]
        }
        mock_service.spreadsheets().values().update().execute.return_value = {}

        h = _make_handler(body={
            "id": "WTT-000001",
            "name": "New Name",
            "category": "New Category",
            "location": "New Location",
            "requiresTracking": True,
            "checkedOut": True,
        })
        status, body = _handle_put(h, mock_service, sheet_id)

        assert status == 200
        assert body["name"] == "New Name"
        assert body["category"] == "New Category"
        assert body["location"] == "New Location"
        assert body["requiresTracking"] is True
        assert body["checkedOut"] is True


# ---------------------------------------------------------------------------
# DELETE tests
# ---------------------------------------------------------------------------

class TestHandleDelete:
    def test_deletes_item(self, mock_service, sheet_id):
        mock_service.spreadsheets().values().get().execute.return_value = {
            "values": [ITEMS_HEADERS, SAMPLE_ROW]
        }
        mock_service.spreadsheets().get().execute.return_value = {
            "sheets": [{"properties": {"title": "Items", "sheetId": 0}}]
        }
        mock_service.spreadsheets().batchUpdate().execute.return_value = {}

        h = _make_handler(body={"id": "WTT-000001"})
        status, body = _handle_delete(h, mock_service, sheet_id)

        assert status == 200
        assert body["ok"] is True

    def test_returns_404_for_missing_item(self, mock_service, sheet_id):
        mock_service.spreadsheets().values().get().execute.return_value = {
            "values": [ITEMS_HEADERS]
        }

        h = _make_handler(body={"id": "WTT-999999"})
        status, body = _handle_delete(h, mock_service, sheet_id)

        assert status == 404
        assert "WTT-999999" in body["error"]

    def test_rejects_missing_id(self, mock_service, sheet_id):
        h = _make_handler(body={"name": "No ID"})
        status, body = _handle_delete(h, mock_service, sheet_id)
        assert status == 400
        assert "id" in body["error"]

    def test_rejects_empty_body(self, mock_service, sheet_id):
        h = _make_handler()
        status, body = _handle_delete(h, mock_service, sheet_id)
        assert status == 400

    def test_returns_502_when_sheet_not_found(self, mock_service, sheet_id):
        mock_service.spreadsheets().values().get().execute.return_value = {
            "values": [ITEMS_HEADERS, SAMPLE_ROW]
        }
        mock_service.spreadsheets().get().execute.return_value = {
            "sheets": [{"properties": {"title": "Other", "sheetId": 1}}]
        }

        h = _make_handler(body={"id": "WTT-000001"})
        status, body = _handle_delete(h, mock_service, sheet_id)

        assert status == 502
        assert "Items worksheet not found" in body["error"]


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


# ---------------------------------------------------------------------------
# _get_items_sheet_id tests
# ---------------------------------------------------------------------------

class TestGetItemsSheetId:
    def test_finds_items_sheet(self, mock_service, sheet_id):
        mock_service.spreadsheets().get().execute.return_value = {
            "sheets": [
                {"properties": {"title": "Categories", "sheetId": 1}},
                {"properties": {"title": "Items", "sheetId": 0}},
            ]
        }
        result = _get_items_sheet_id(mock_service, sheet_id)
        assert result == 0

    def test_returns_none_when_not_found(self, mock_service, sheet_id):
        mock_service.spreadsheets().get().execute.return_value = {
            "sheets": [{"properties": {"title": "Other", "sheetId": 1}}]
        }
        result = _get_items_sheet_id(mock_service, sheet_id)
        assert result is None
