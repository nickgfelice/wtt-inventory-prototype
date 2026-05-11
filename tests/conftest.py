"""Shared test configuration — adds api/ and api/_shared/ to sys.path."""

import sys
import os

# Add api source directories to Python path so tests can import from them
_api_dir = os.path.join(os.path.dirname(__file__), "..", "api")
_shared_dir = os.path.join(_api_dir, "_shared")

if _api_dir not in sys.path:
    sys.path.insert(0, _api_dir)
if _shared_dir not in sys.path:
    sys.path.insert(0, _shared_dir)
