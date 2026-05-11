"""Unit tests for api/_shared/sheets_helpers.py."""

import pytest

from sheets_helpers import (
    CATEGORIES_HEADERS,
    ITEMS_HEADERS,
    LOCATIONS_HEADERS,
    apply_option_rename,
    item_to_row,
    next_item_id,
    row_to_item,
)


class TestConstants:
    """Verify header constants match the expected spreadsheet layout."""

    def test_items_headers_length(self):
        assert len(ITEMS_HEADERS) == 10

    def test_items_headers_first_and_last(self):
        assert ITEMS_HEADERS[0] == "ID"
        assert ITEMS_HEADERS[-1] == "UpdatedAt"

    def test_categories_headers(self):
        assert CATEGORIES_HEADERS == ["Name"]

    def test_locations_headers(self):
        assert LOCATIONS_HEADERS == ["Name"]


class TestItemToRow:
    """Tests for item_to_row()."""

    def test_full_item(self):
        item = {
            "id": "WTT-000001",
            "name": "Typewriter",
            "category": "Props",
            "location": "Warehouse A",
            "photoUrl": "https://drive.google.com/uc?id=abc",
            "requiresTracking": True,
            "checkedOut": False,
            "checkedOutAt": 1700000000000,
            "estimatedReturnDate": "2025-01-15",
            "updatedAt": 1700000000000,
        }
        row = item_to_row(item)
        assert row == [
            "WTT-000001",
            "Typewriter",
            "Props",
            "Warehouse A",
            "https://drive.google.com/uc?id=abc",
            "TRUE",
            "FALSE",
            "1700000000000",
            "2025-01-15",
            "1700000000000",
        ]

    def test_missing_optional_fields(self):
        item = {
            "id": "WTT-000002",
            "name": "Camera",
            "category": "Equipment",
            "requiresTracking": False,
            "checkedOut": False,
            "updatedAt": 1700000000000,
        }
        row = item_to_row(item)
        assert row[3] == ""  # location
        assert row[4] == ""  # photoUrl
        assert row[7] == ""  # checkedOutAt
        assert row[8] == ""  # estimatedReturnDate

    def test_boolean_true_false_strings(self):
        item = {
            "id": "WTT-000003",
            "name": "Lamp",
            "category": "Lighting",
            "requiresTracking": True,
            "checkedOut": True,
            "updatedAt": 1700000000000,
        }
        row = item_to_row(item)
        assert row[5] == "TRUE"
        assert row[6] == "TRUE"

    def test_none_values_become_empty_strings(self):
        item = {
            "id": "WTT-000004",
            "name": "Desk",
            "category": "Furniture",
            "location": None,
            "photoUrl": None,
            "requiresTracking": False,
            "checkedOut": False,
            "checkedOutAt": None,
            "estimatedReturnDate": None,
            "updatedAt": 1700000000000,
        }
        row = item_to_row(item)
        assert row[3] == ""
        assert row[4] == ""
        assert row[7] == ""
        assert row[8] == ""


class TestRowToItem:
    """Tests for row_to_item()."""

    def test_full_row(self):
        row = [
            "WTT-000001",
            "Typewriter",
            "Props",
            "Warehouse A",
            "https://drive.google.com/uc?id=abc",
            "TRUE",
            "FALSE",
            "1700000000000",
            "2025-01-15",
            "1700000000000",
        ]
        item = row_to_item(row)
        assert item["id"] == "WTT-000001"
        assert item["name"] == "Typewriter"
        assert item["category"] == "Props"
        assert item["location"] == "Warehouse A"
        assert item["photoUrl"] == "https://drive.google.com/uc?id=abc"
        assert item["requiresTracking"] is True
        assert item["checkedOut"] is False
        assert item["checkedOutAt"] == 1700000000000
        assert item["estimatedReturnDate"] == "2025-01-15"
        assert item["updatedAt"] == 1700000000000

    def test_boolean_parsing(self):
        row = ["", "", "", "", "", "FALSE", "TRUE", "", "", ""]
        item = row_to_item(row)
        assert item["requiresTracking"] is False
        assert item["checkedOut"] is True

    def test_boolean_case_insensitive(self):
        row = ["", "", "", "", "", "true", "false", "", "", ""]
        item = row_to_item(row)
        assert item["requiresTracking"] is True
        assert item["checkedOut"] is False

    def test_short_row_padded(self):
        row = ["WTT-000001", "Camera"]
        item = row_to_item(row)
        assert item["id"] == "WTT-000001"
        assert item["name"] == "Camera"
        assert item["category"] == ""
        assert item["requiresTracking"] is False
        assert item["checkedOut"] is False
        assert item["checkedOutAt"] is None
        assert item["updatedAt"] is None

    def test_empty_row(self):
        item = row_to_item([])
        assert item["id"] == ""
        assert item["name"] == ""
        assert item["requiresTracking"] is False
        assert item["checkedOutAt"] is None

    def test_empty_numeric_fields_become_none(self):
        row = ["", "", "", "", "", "FALSE", "FALSE", "", "", ""]
        item = row_to_item(row)
        assert item["checkedOutAt"] is None
        assert item["updatedAt"] is None


class TestNextItemId:
    """Tests for next_item_id()."""

    def test_empty_list_returns_first_id(self):
        assert next_item_id([]) == "WTT-000001"

    def test_single_id(self):
        assert next_item_id(["WTT-000001"]) == "WTT-000002"

    def test_multiple_ids_returns_max_plus_one(self):
        assert next_item_id(["WTT-000001", "WTT-000005", "WTT-000003"]) == "WTT-000006"

    def test_zero_padded_output(self):
        result = next_item_id(["WTT-000099"])
        assert result == "WTT-000100"
        assert len(result) == 10  # "WTT-" + 6 digits

    def test_ignores_invalid_ids(self):
        assert next_item_id(["WTT-000003", "INVALID", "WTT-abc"]) == "WTT-000004"

    def test_all_invalid_ids_returns_first(self):
        assert next_item_id(["INVALID", "BAD-001"]) == "WTT-000001"

    def test_large_numbers(self):
        assert next_item_id(["WTT-999999"]) == "WTT-1000000"


class TestApplyOptionRename:
    """Tests for apply_option_rename()."""

    def test_renames_matching_category(self):
        items = [
            {"id": "WTT-000001", "name": "A", "category": "Props"},
            {"id": "WTT-000002", "name": "B", "category": "Lighting"},
        ]
        result = apply_option_rename(items, "category", "Props", "Stage Props")
        assert result[0]["category"] == "Stage Props"
        assert result[1]["category"] == "Lighting"

    def test_renames_matching_location(self):
        items = [
            {"id": "WTT-000001", "name": "A", "location": "Warehouse A"},
            {"id": "WTT-000002", "name": "B", "location": "Warehouse B"},
        ]
        result = apply_option_rename(items, "location", "Warehouse A", "Storage Room 1")
        assert result[0]["location"] == "Storage Room 1"
        assert result[1]["location"] == "Warehouse B"

    def test_case_insensitive_matching(self):
        items = [{"id": "WTT-000001", "name": "A", "category": "props"}]
        result = apply_option_rename(items, "category", "Props", "Stage Props")
        assert result[0]["category"] == "Stage Props"

    def test_no_matches_returns_unchanged(self):
        items = [{"id": "WTT-000001", "name": "A", "category": "Lighting"}]
        result = apply_option_rename(items, "category", "Props", "Stage Props")
        assert result[0]["category"] == "Lighting"

    def test_empty_list(self):
        result = apply_option_rename([], "category", "Props", "Stage Props")
        assert result == []

    def test_original_list_not_mutated(self):
        items = [{"id": "WTT-000001", "name": "A", "category": "Props"}]
        result = apply_option_rename(items, "category", "Props", "Stage Props")
        assert items[0]["category"] == "Props"
        assert result[0]["category"] == "Stage Props"

    def test_missing_field_not_renamed(self):
        items = [{"id": "WTT-000001", "name": "A"}]
        result = apply_option_rename(items, "category", "Props", "Stage Props")
        assert "category" not in result[0] or result[0].get("category") != "Stage Props"
