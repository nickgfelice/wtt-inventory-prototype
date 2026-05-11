"""Google API authentication helpers for Vercel serverless functions.

Loads service account credentials from environment variables and builds
an authenticated Google Sheets API service client.
"""

import json
import os

from google.oauth2.service_account import Credentials
from googleapiclient.discovery import build

SCOPES = [
    "https://www.googleapis.com/auth/spreadsheets",
]


class ConfigError(Exception):
    """Raised when a required environment variable is missing or invalid."""


def _get_credentials() -> Credentials:
    """Load service account credentials from the GOOGLE_SERVICE_ACCOUNT_JSON env var."""
    raw = os.environ.get("GOOGLE_SERVICE_ACCOUNT_JSON")
    if not raw:
        raise ConfigError(
            "Configuration error: GOOGLE_SERVICE_ACCOUNT_JSON is missing. "
            "Set this environment variable to the full JSON content of your "
            "Google service account key."
        )
    try:
        info = json.loads(raw)
    except (json.JSONDecodeError, ValueError) as exc:
        raise ConfigError(
            "Configuration error: GOOGLE_SERVICE_ACCOUNT_JSON is not valid JSON."
        ) from exc
    return Credentials.from_service_account_info(info, scopes=SCOPES)


def get_sheets_service():
    """Build and return an authenticated Google Sheets API v4 service."""
    creds = _get_credentials()
    return build("sheets", "v4", credentials=creds)


def get_sheet_id() -> str:
    """Return the GOOGLE_SHEET_ID env var or raise ConfigError."""
    value = os.environ.get("GOOGLE_SHEET_ID")
    if not value:
        raise ConfigError(
            "Configuration error: GOOGLE_SHEET_ID is missing. "
            "Set this environment variable to the spreadsheet ID from your Google Sheets URL."
        )
    return value
