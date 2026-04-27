"""
Backend unit tests — main.py middleware, crawl.py, verify.py parse guards.
Run: uv run pytest backend/tests/ -v
"""
from __future__ import annotations

import json
import os
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi.testclient import TestClient


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------
@pytest.fixture(autouse=True)
def _set_openai_key(monkeypatch):
    monkeypatch.setenv("OPENAI_API_KEY", "sk-test-fake-key")


@pytest.fixture()
def client_no_auth():
    """TestClient with no CONTEXTGUARD_API_KEY set (open mode)."""
    # Ensure key is cleared before importing app
    os.environ.pop("CONTEXTGUARD_API_KEY", None)
    # Re-import to get a fresh app instance without cached key
    import importlib
    import sys
    for mod in list(sys.modules.keys()):
        if "main" in mod or "crawl" in mod or "verify" in mod or "website_verify" in mod:
            sys.modules.pop(mod, None)
    import main as app_module  # noqa: PLC0415
    return TestClient(app_module.app)


@pytest.fixture()
def client_with_auth(monkeypatch):
    """TestClient with CONTEXTGUARD_API_KEY=testsecret."""
    monkeypatch.setenv("CONTEXTGUARD_API_KEY", "testsecret")
    import importlib
    import sys
    for mod in list(sys.modules.keys()):
        if "main" in mod or "crawl" in mod or "verify" in mod or "website_verify" in mod:
            sys.modules.pop(mod, None)
    import main as app_module  # noqa: PLC0415
    return TestClient(app_module.app)


# ---------------------------------------------------------------------------
# Health endpoints (no auth needed)
# ---------------------------------------------------------------------------
def test_root_returns_200(client_no_auth):
    resp = client_no_auth.get("/")
    assert resp.status_code == 200
    assert "message" in resp.json()


# ---------------------------------------------------------------------------
# Auth middleware
# ---------------------------------------------------------------------------
def test_missing_api_key_returns_401(client_with_auth):
    resp = client_with_auth.post(
        "/domain_verify",
        json={"url": "https://example.com", "language": "English"},
    )
    assert resp.status_code == 401
    body = resp.json()
    assert "Unauthorized" in body.get("error", "")


def test_correct_api_key_passes_middleware(client_with_auth):
    with patch("main.website_verify_with_openai", new=AsyncMock(return_value={"Verdict": "Unverified"})):
        resp = client_with_auth.post(
            "/domain_verify",
            headers={"X-ContextGuard-Key": "testsecret"},
            json={"url": "https://example.com", "language": "English"},
        )
    assert resp.status_code == 200


def test_wrong_api_key_returns_401(client_with_auth):
    resp = client_with_auth.post(
        "/domain_verify",
        headers={"X-ContextGuard-Key": "wrongkey"},
        json={"url": "https://example.com", "language": "English"},
    )
    assert resp.status_code == 401


def test_crawl_requires_matching_api_key(client_with_auth):
    with patch("main.crawl_with_openai", new=AsyncMock(return_value={"Title": "ok", "Body Text": "b", "Comments": ""})):
        missing = client_with_auth.post(
            "/crawl",
            json={"url": "https://example.com", "language": "English"},
        )
        wrong = client_with_auth.post(
            "/crawl",
            headers={"X-ContextGuard-Key": "wrongkey"},
            json={"url": "https://example.com", "language": "English"},
        )
        good = client_with_auth.post(
            "/crawl",
            headers={"X-ContextGuard-Key": "testsecret"},
            json={"url": "https://example.com", "language": "English"},
        )

    assert missing.status_code == 401
    assert wrong.status_code == 401
    assert good.status_code == 200


# ---------------------------------------------------------------------------
# Deprecation headers on /verify
# ---------------------------------------------------------------------------
def test_verify_endpoint_has_deprecation_headers(client_no_auth):
    with patch("main.verify_url_with_openai", new=AsyncMock(return_value={"ok": True})):
        resp = client_no_auth.post(
            "/verify",
            json={"url": "https://example.com", "language": "English"},
        )
    assert resp.headers.get("Deprecation") == "true"
    assert "Sunset" in resp.headers


# ---------------------------------------------------------------------------
# crawl.py parse guard
# ---------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_crawl_raises_on_empty_output():
    from src.crawl import crawl_with_openai

    fake_response = MagicMock()
    fake_response.output_text = ""

    with patch("src.crawl._client") as mock_client:
        mock_client.responses.create = AsyncMock(return_value=fake_response)
        with pytest.raises(RuntimeError, match="empty output_text"):
            await crawl_with_openai("https://example.com", "English")


@pytest.mark.asyncio
async def test_crawl_raises_on_malformed_json():
    from src.crawl import crawl_with_openai

    fake_response = MagicMock()
    fake_response.output_text = "not valid json {{{"

    with patch("src.crawl._client") as mock_client:
        mock_client.responses.create = AsyncMock(return_value=fake_response)
        with pytest.raises(RuntimeError, match="parse"):
            await crawl_with_openai("https://example.com", "English")


@pytest.mark.asyncio
async def test_crawl_success():
    from src.crawl import crawl_with_openai

    payload = {"Title": "Test", "Body Text": "Hello", "Comments": ""}
    fake_response = MagicMock()
    fake_response.output_text = json.dumps(payload)

    with patch("src.crawl._client") as mock_client:
        mock_client.responses.create = AsyncMock(return_value=fake_response)
        result = await crawl_with_openai("https://example.com", "English")

    assert result["Title"] == "Test"


# ---------------------------------------------------------------------------
# verify.py parse guard
# ---------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_verify_content_raises_on_empty_output():
    from src.verify import verify_content_with_openai

    fake_response = MagicMock()
    fake_response.output_text = None

    with patch("src.verify._client") as mock_client:
        mock_client.responses.create = AsyncMock(return_value=fake_response)
        with pytest.raises(RuntimeError, match="empty output_text"):
            await verify_content_with_openai("t", "b", "c", "English")


@pytest.mark.asyncio
async def test_verify_content_raises_on_malformed_json():
    from src.verify import verify_content_with_openai

    fake_response = MagicMock()
    fake_response.output_text = "oops{broken"

    with patch("src.verify._client") as mock_client:
        mock_client.responses.create = AsyncMock(return_value=fake_response)
        with pytest.raises(RuntimeError, match="parse"):
            await verify_content_with_openai("t", "b", "c", "English")


# ---------------------------------------------------------------------------
# website_verify.py parse guard
# ---------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_website_verify_raises_on_empty_output():
    from src.website_verify import website_verify_with_openai

    fake_response = MagicMock()
    fake_response.output_text = ""

    with patch("src.website_verify._client") as mock_client:
        mock_client.responses.create = AsyncMock(return_value=fake_response)
        with pytest.raises(RuntimeError, match="empty output_text"):
            await website_verify_with_openai("https://example.com")


@pytest.mark.asyncio
async def test_website_verify_raises_on_bad_json():
    from src.website_verify import website_verify_with_openai

    fake_response = MagicMock()
    fake_response.output_text = "<<<bad json"

    with patch("src.website_verify._client") as mock_client:
        mock_client.responses.create = AsyncMock(return_value=fake_response)
        with pytest.raises(RuntimeError, match="parse"):
            await website_verify_with_openai("https://example.com")