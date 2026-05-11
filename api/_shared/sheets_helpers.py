"""Google Sheets serialization and helper utilities.

Provides functions to convert between Python dicts (matching the frontend
Item type) and Google Sheets row arrays, generate sequential item IDs,
and apply option renames across item lists.
"""

# Column headers for each worksheet — order must match the spreadsheet layout.
ITEMS_HEADERS = [
    "ID",
    "Name",
    "Category",
    "Location",
    "PhotoUrl",
    "RequiresTracking",
    "CheckedOut",
    "CheckedOutAt",
    "EstimatedReturnDate",
    "UpdatedAt",
]

CATEGORIES_HEADERS = ["Name"]
LOCATIONS_HEADERS = ["Name"]

# Mapping from Item dict keys to their column index in ITEMS_HEADERS.
_KEY_ORDER = [
    "id",
    "name",
    "category",
    "location",
    "photoUrl",
    "requiresTracking",
    "checkedOut",
    "checkedOutAt",
    "estimatedReturnDate",
    "updatedAt",
]

_BOOL_FIELDS = {"requiresTracking", "checkedOut"}
_INT_FIELDS = {"checkedOutAt", "updatedAt"}


def item_to_row(item_dict: dict) -> list[str]:
    """Serialize an Item dict to a list of strings matching the Sheets column order.

    Booleans are stored as ``"TRUE"`` / ``"FALSE"``.  Numbers are converted to
    their string representation.  Missing optional fields become empty strings.
    """
    row: list[str] = []
    for key in _KEY_ORDER:
        value = item_dict.get(key)
        if value is None or value == "":
            row.append("")
        elif isinstance(value, bool):
            row.append("TRUE" if value else "FALSE")
        else:
            row.append(str(value))
    return row


def row_to_item(row: list[str]) -> dict:
    """Parse a Sheets row (list of strings) back into an Item dict.

    Short rows are padded with empty strings so callers don't need to worry
    about missing trailing columns.  ``"TRUE"`` / ``"FALSE"`` strings are
    converted to Python booleans, and numeric timestamp strings are converted
    to ``int``.
    """
    # Pad short rows with empty strings up to the expected column count.
    padded = list(row) + [""] * (len(_KEY_ORDER) - len(row))

    item: dict = {}
    for idx, key in enumerate(_KEY_ORDER):
        raw = padded[idx]
        if key in _BOOL_FIELDS:
            item[key] = raw.upper() == "TRUE"
        elif key in _INT_FIELDS:
            if raw and raw.strip():
                try:
                    item[key] = int(raw)
                except (ValueError, TypeError):
                    item[key] = raw
            else:
                item[key] = None
        else:
            item[key] = raw if raw else ""
    return item


def next_item_id(existing_ids: list[str]) -> str:
    """Generate the next sequential ``WTT-XXXXXX`` ID.

    Extracts the numeric suffix from each existing ID, finds the maximum,
    and returns the next value zero-padded to six digits.  Returns
    ``"WTT-000001"`` when the list is empty.
    """
    if not existing_ids:
        return "WTT-000001"

    max_num = 0
    for raw_id in existing_ids:
        raw_id = raw_id.strip()
        if raw_id.startswith("WTT-"):
            try:
                num = int(raw_id[4:])
                if num > max_num:
                    max_num = num
            except (ValueError, IndexError):
                continue
    return f"WTT-{max_num + 1:06d}"


def apply_option_rename(
    items: list[dict],
    field: str,
    old_name: str,
    new_name: str,
) -> list[dict]:
    """Return a new list of item dicts with *field* renamed from *old_name* to *new_name*.

    Comparison is case-insensitive.  Items whose *field* value does not match
    *old_name* are included unchanged (shallow-copied).
    """
    result: list[dict] = []
    for item in items:
        current = item.get(field, "")
        if isinstance(current, str) and current.lower() == old_name.lower():
            updated = {**item, field: new_name}
            result.append(updated)
        else:
            result.append({**item})
    return result
