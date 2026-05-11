"""Unit tests for api/_shared/google_auth.py."""

import json
import os
from unittest.mock import MagicMock, patch

import pytest

from google_auth import (
    ConfigError,
    _get_credentials,
    get_sheet_id,
    get_sheets_service,
)

# A minimal valid service account JSON structure for testing
FAKE_SA_JSON = json.dumps(
    {
        "type": "service_account",
        "project_id": "test-project",
        "private_key_id": "key123",
        "private_key": "-----BEGIN RSA PRIVATE KEY-----\nMIIEpAIBAAKCAQEA0Z3VS5JJcds3xfn/ygWyF8PbnGy0AHB7MhgHcTz6sE2I2yPB\naFDrBz9vFqU4zK7G4mFZ5KLe9JjDvGzlPd5JfHiPfCBN0kP+JjBRElYDz7iCFJM\n"
        + "a" * 1588
        + "\n-----END RSA PRIVATE KEY-----\n",
        "client_email": "test@test-project.iam.gserviceaccount.com",
        "client_id": "123456789",
        "auth_uri": "https://accounts.google.com/o/oauth2/auth",
        "token_uri": "https://oauth2.googleapis.com/token",
    }
)


class TestConfigError:
    def test_config_error_is_exception(self):
        assert issubclass(ConfigError, Exception)

    def test_config_error_message(self):
        err = ConfigError("test message")
        assert str(err) == "test message"


class TestGetCredentials:
    def test_missing_env_var_raises_config_error(self):
        with patch.dict(os.environ, {}, clear=True):
            with pytest.raises(ConfigError, match="GOOGLE_SERVICE_ACCOUNT_JSON is missing"):
                _get_credentials()

    def test_empty_env_var_raises_config_error(self):
        with patch.dict(os.environ, {"GOOGLE_SERVICE_ACCOUNT_JSON": ""}):
            with pytest.raises(ConfigError, match="GOOGLE_SERVICE_ACCOUNT_JSON is missing"):
                _get_credentials()

    def test_invalid_json_raises_config_error(self):
        with patch.dict(os.environ, {"GOOGLE_SERVICE_ACCOUNT_JSON": "not-json"}):
            with pytest.raises(ConfigError, match="not valid JSON"):
                _get_credentials()

    @patch("google_auth.Credentials.from_service_account_info")
    def test_valid_json_returns_credentials(self, mock_from_info):
        mock_creds = MagicMock()
        mock_from_info.return_value = mock_creds
        with patch.dict(os.environ, {"GOOGLE_SERVICE_ACCOUNT_JSON": FAKE_SA_JSON}):
            result = _get_credentials()
        assert result is mock_creds
        mock_from_info.assert_called_once()
        call_args = mock_from_info.call_args
        assert call_args[1]["scopes"] == [
            "https://www.googleapis.com/auth/spreadsheets",
        ]


class TestGetSheetsService:
    @patch("google_auth.build")
    @patch("google_auth._get_credentials")
    def test_builds_sheets_v4_service(self, mock_get_creds, mock_build):
        mock_creds = MagicMock()
        mock_get_creds.return_value = mock_creds
        mock_service = MagicMock()
        mock_build.return_value = mock_service
        result = get_sheets_service()
        assert result is mock_service
        mock_build.assert_called_once_with("sheets", "v4", credentials=mock_creds)

    @patch("google_auth._get_credentials")
    def test_propagates_config_error(self, mock_get_creds):
        mock_get_creds.side_effect = ConfigError("missing creds")
        with pytest.raises(ConfigError, match="missing creds"):
            get_sheets_service()


class TestGetSheetId:
    def test_returns_value_when_set(self):
        with patch.dict(os.environ, {"GOOGLE_SHEET_ID": "abc123"}):
            assert get_sheet_id() == "abc123"

    def test_missing_env_var_raises_config_error(self):
        with patch.dict(os.environ, {}, clear=True):
            with pytest.raises(ConfigError, match="GOOGLE_SHEET_ID is missing"):
                get_sheet_id()

    def test_empty_env_var_raises_config_error(self):
        with patch.dict(os.environ, {"GOOGLE_SHEET_ID": ""}):
            with pytest.raises(ConfigError, match="GOOGLE_SHEET_ID is missing"):
                get_sheet_id()
