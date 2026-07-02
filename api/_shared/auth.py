"""Authentication helpers for inventory API routes."""

import base64
import hashlib
import hmac
import json
import os
import time
from http import cookies
from typing import Optional

from google.auth.transport import requests
from google.oauth2 import id_token


COOKIE_NAME = "wtt_session"
SESSION_TTL_SECONDS = 60 * 60 * 8


class AuthConfigError(Exception):
    """Raised when auth environment variables are missing or invalid."""


class AuthError(Exception):
    """Raised when a request is unauthenticated or unauthorized."""

    def __init__(self, message: str, status: int = 401):
        super().__init__(message)
        self.status = status


def _b64encode(raw: bytes) -> str:
    return base64.urlsafe_b64encode(raw).decode("utf-8").rstrip("=")


def _b64decode(value: str) -> bytes:
    padding = "=" * (-len(value) % 4)
    return base64.urlsafe_b64decode(value + padding)


def _get_secret() -> bytes:
    value = os.environ.get("AUTH_SECRET", "")
    if len(value) < 32:
        raise AuthConfigError(
            "Configuration error: AUTH_SECRET must be set to at least 32 characters."
        )
    return value.encode("utf-8")


def _get_google_client_id() -> str:
    value = os.environ.get("GOOGLE_OAUTH_CLIENT_ID", "")
    if not value:
        raise AuthConfigError("Configuration error: GOOGLE_OAUTH_CLIENT_ID is missing.")
    return value


def _allowed_emails() -> set[str]:
    raw = os.environ.get("AUTH_ALLOWED_EMAILS", "")
    return {email.strip().lower() for email in raw.split(",") if email.strip()}


def _allowed_domain() -> str:
    return os.environ.get("AUTH_ALLOWED_DOMAIN", "").strip().lower()


def _cookie_secure() -> bool:
    raw = os.environ.get("AUTH_COOKIE_SECURE")
    if raw is not None:
        return raw.lower() not in {"0", "false", "no"}
    return bool(os.environ.get("VERCEL"))


def _session_signature(payload_b64: str) -> str:
    return _b64encode(
        hmac.new(_get_secret(), payload_b64.encode("utf-8"), hashlib.sha256).digest()
    )


def create_session_cookie(user: dict) -> str:
    payload = {
        "sub": user["sub"],
        "email": user["email"],
        "name": user.get("name", ""),
        "picture": user.get("picture", ""),
        "exp": int(time.time()) + SESSION_TTL_SECONDS,
    }
    payload_b64 = _b64encode(json.dumps(payload, separators=(",", ":")).encode("utf-8"))
    token = f"{payload_b64}.{_session_signature(payload_b64)}"

    morsel = cookies.SimpleCookie()
    morsel[COOKIE_NAME] = token
    morsel[COOKIE_NAME]["httponly"] = True
    morsel[COOKIE_NAME]["samesite"] = "Lax"
    morsel[COOKIE_NAME]["path"] = "/"
    morsel[COOKIE_NAME]["max-age"] = str(SESSION_TTL_SECONDS)
    if _cookie_secure():
        morsel[COOKIE_NAME]["secure"] = True
    return morsel.output(header="").strip()


def clear_session_cookie() -> str:
    morsel = cookies.SimpleCookie()
    morsel[COOKIE_NAME] = ""
    morsel[COOKIE_NAME]["httponly"] = True
    morsel[COOKIE_NAME]["samesite"] = "Lax"
    morsel[COOKIE_NAME]["path"] = "/"
    morsel[COOKIE_NAME]["max-age"] = "0"
    if _cookie_secure():
        morsel[COOKIE_NAME]["secure"] = True
    return morsel.output(header="").strip()


def parse_cookie_header(header: str) -> Optional[dict]:
    if not header:
        return None
    parsed = cookies.SimpleCookie()
    parsed.load(header)
    if COOKIE_NAME not in parsed:
        return None

    token = parsed[COOKIE_NAME].value
    try:
        payload_b64, signature = token.split(".", 1)
    except ValueError:
        return None
    expected = _session_signature(payload_b64)
    if not hmac.compare_digest(signature, expected):
        return None

    try:
        payload = json.loads(_b64decode(payload_b64).decode("utf-8"))
    except (json.JSONDecodeError, UnicodeDecodeError, ValueError):
        return None
    if int(payload.get("exp", 0)) < int(time.time()):
        return None
    return {
        "sub": payload.get("sub", ""),
        "email": payload.get("email", ""),
        "name": payload.get("name", ""),
        "picture": payload.get("picture", ""),
    }


def get_request_user(handler) -> Optional[dict]:
    return parse_cookie_header(handler.headers.get("Cookie", ""))


def require_request_user(handler) -> dict:
    user = get_request_user(handler)
    if not user:
        raise AuthError("Login required.", 401)
    return user


def verify_google_credential(credential: str) -> dict:
    if not credential:
        raise AuthError("Missing Google credential.", 400)

    try:
        idinfo = id_token.verify_oauth2_token(
            credential,
            requests.Request(),
            _get_google_client_id(),
        )
    except ValueError as exc:
        raise AuthError("Invalid Google credential.", 401) from exc

    email = str(idinfo.get("email", "")).lower()
    email_verified = bool(idinfo.get("email_verified"))
    if not email or not email_verified:
        raise AuthError("Google account email is not verified.", 403)

    allowed_emails = _allowed_emails()
    allowed_domain = _allowed_domain()
    email_domain = email.rsplit("@", 1)[-1] if "@" in email else ""
    if allowed_emails and email not in allowed_emails:
        raise AuthError("This Google account is not authorized.", 403)
    if allowed_domain and email_domain != allowed_domain:
        raise AuthError("This Google account is not authorized.", 403)
    if not allowed_emails and not allowed_domain:
        raise AuthConfigError(
            "Configuration error: set AUTH_ALLOWED_EMAILS or AUTH_ALLOWED_DOMAIN."
        )

    return {
        "sub": idinfo["sub"],
        "email": email,
        "name": idinfo.get("name", email),
        "picture": idinfo.get("picture", ""),
    }
