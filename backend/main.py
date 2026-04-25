from __future__ import annotations

import logging
import os
import socket
import time
from collections import defaultdict
from typing import Any

from fastapi import FastAPI, HTTPException, Request, Response, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from src.crawl import crawl_with_openai
from src.verify import verify_content_with_openai, verify_url_with_openai
from src.website_verify import website_verify_with_openai

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------
SHARED_API_KEY: str = (os.getenv("FACTGUARD_API_KEY") or "").strip()
RATE_LIMIT_REQUESTS: int = int(os.getenv("RATE_LIMIT_REQUESTS", "60"))
RATE_LIMIT_WINDOW_SEC: int = int(os.getenv("RATE_LIMIT_WINDOW_SEC", "60"))

ALLOWED_ORIGINS: list[str] = [
    origin.strip()
    for origin in os.getenv(
        "CORS_ALLOWED_ORIGINS",
        "https://hackomania-three.vercel.app,http://localhost:3000",
    ).split(",")
    if origin.strip()
]

# ---------------------------------------------------------------------------
# App
# ---------------------------------------------------------------------------
app = FastAPI(title="FactGuard Backend", version="1.0.0")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Rate-limiter (simple in-memory: per IP, sliding window counter)
# ---------------------------------------------------------------------------
_rate_counters: dict[str, list[float]] = defaultdict(list)


def _check_rate_limit(request: Request) -> None:
    if not SHARED_API_KEY:
        # No auth configured → skip rate limiting (dev mode).
        return
    client_ip: str = (
        request.headers.get("X-Forwarded-For", "").split(",")[0].strip()
        or (request.client.host if request.client else "unknown")
    )
    now = time.monotonic()
    window_start = now - RATE_LIMIT_WINDOW_SEC
    hits = _rate_counters[client_ip]
    # Evict old timestamps
    _rate_counters[client_ip] = [t for t in hits if t > window_start]
    if len(_rate_counters[client_ip]) >= RATE_LIMIT_REQUESTS:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail={
                "error": "Rate limit exceeded",
                "retry_after_seconds": RATE_LIMIT_WINDOW_SEC,
            },
        )
    _rate_counters[client_ip].append(now)


# ---------------------------------------------------------------------------
# API-key validation middleware
# ---------------------------------------------------------------------------
_SKIP_AUTH_PATHS = {"/", "/netcheck", "/docs", "/openapi.json", "/redoc"}
_API_KEY_HEADER = "X-FactGuard-Key"


@app.middleware("http")
async def validate_api_key(request: Request, call_next: Any) -> Response:
    if not SHARED_API_KEY:
        # No key configured → open (dev mode), log warning once.
        return await call_next(request)

    if request.url.path in _SKIP_AUTH_PATHS or request.method == "OPTIONS":
        return await call_next(request)

    provided = request.headers.get(_API_KEY_HEADER, "")
    if provided != SHARED_API_KEY:
        logger.warning("Rejected request: missing/invalid %s from %s", _API_KEY_HEADER, request.client)
        return Response(
            content='{"error":"Unauthorized","detail":"Missing or invalid X-FactGuard-Key header"}',
            status_code=401,
            media_type="application/json",
        )
    return await call_next(request)


# ---------------------------------------------------------------------------
# Request/response models
# ---------------------------------------------------------------------------
class VerifyRequest(BaseModel):
    url: str
    language: str = "English"


class ContentVerifyRequest(BaseModel):
    title: str
    body: str
    comments: str
    language: str = "English"


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def _openai_error_to_http(exc: Exception) -> HTTPException:
    msg = str(exc)
    if "invalid_api_key" in msg or "authentication" in msg.lower():
        return HTTPException(status_code=502, detail={"error": "Backend SEA-LION auth error"})
    if "rate_limit" in msg or "429" in msg:
        return HTTPException(status_code=503, detail={"error": "SEA-LION rate limit reached; try later"})
    return HTTPException(status_code=500, detail={"error": "Upstream processing error", "detail": msg})


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------
@app.get("/")
def read_root() -> dict[str, str]:
    return {"message": "FactGuard backend v1"}


@app.post("/verify", deprecated=True)
async def verify(request: Request, body: VerifyRequest) -> Any:
    """DEPRECATED — use /crawl then /verify_content instead."""
    _check_rate_limit(request)
    logger.warning("/verify called (deprecated) for url=%s", body.url)
    try:
        result = await verify_url_with_openai(body.url)
    except Exception as exc:
        raise _openai_error_to_http(exc) from exc

    return Response(
        content=result if isinstance(result, (str, bytes)) else None,
        media_type="application/json",
        headers={
            "Deprecation": "true",
            "Sunset": "2025-12-31",
            "Link": '</verify_content>; rel="successor-version"',
        },
    )


@app.post("/crawl")
async def crawl(request: Request, body: VerifyRequest) -> Any:
    _check_rate_limit(request)
    try:
        return await crawl_with_openai(body.url, body.language)
    except Exception as exc:
        raise _openai_error_to_http(exc) from exc


@app.post("/verify_content")
async def verify_content(request: Request, body: ContentVerifyRequest) -> Any:
    _check_rate_limit(request)
    try:
        return await verify_content_with_openai(
            body.title, body.body, body.comments, body.language
        )
    except Exception as exc:
        raise _openai_error_to_http(exc) from exc


@app.post("/domain_verify")
async def domain_verify(request: Request, body: VerifyRequest) -> Any:
    _check_rate_limit(request)
    try:
        return await website_verify_with_openai(body.url)
    except Exception as exc:
        raise _openai_error_to_http(exc) from exc


@app.get("/netcheck")
async def netcheck() -> dict[str, Any]:
    started = time.perf_counter()
    try:
        with socket.create_connection(("8.8.8.8", 53), timeout=3):
            elapsed = time.perf_counter() - started
            return {"ok": True, "target": "8.8.8.8:53", "elapsed_sec": round(elapsed, 2)}
    except OSError as exc:
        elapsed = time.perf_counter() - started
        return {
            "ok": False,
            "target": "8.8.8.8:53",
            "elapsed_sec": round(elapsed, 2),
            "error": str(exc),
        }