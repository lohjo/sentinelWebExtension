from __future__ import annotations

import json
import logging
import os
import time

from openai import AsyncOpenAI

try:
    from crawl import crawl_with_openai
except ImportError:  # pragma: no cover
    from src.crawl import crawl_with_openai

logger = logging.getLogger(__name__)

VERIFY_PROMPT_ID = "pmpt_69abc91051848195800cf59937efd9410593b431d4c0aece"

_api_key = (os.getenv("OPENAI_API_KEY") or "").strip()
if not _api_key:
    raise RuntimeError("OPENAI_API_KEY is missing or empty.")

# Shared async client — reused across all requests.
_client = AsyncOpenAI(api_key=_api_key)


async def verify_content_with_openai(
    title: str,
    body: str,
    comments: str,
    language: str,
) -> dict:
    response = await _client.responses.create(
        prompt={
            "id": VERIFY_PROMPT_ID,
            "variables": {
                "title": title,
                "body": body,
                "comments": comments,
                "language": language,
            },
        }
    )

    raw = getattr(response, "output_text", None)
    if not raw:
        logger.error("verify_content_with_openai: OpenAI returned empty output_text")
        raise RuntimeError("OpenAI returned empty output_text for verify.")

    try:
        return json.loads(raw)
    except json.JSONDecodeError as exc:
        logger.error(
            "verify_content_with_openai: JSON parse failed raw=%s...", raw[:200]
        )
        raise RuntimeError(f"Verify: could not parse OpenAI JSON response: {exc}") from exc


async def verify_url_with_openai(url: str) -> dict:
    crawled = await crawl_with_openai(url, "English")
    return await verify_content_with_openai(
        title=crawled.get("Title", ""),
        body=crawled.get("Body Text", ""),
        comments=crawled.get("Comments", ""),
        language="English",
    )


if __name__ == "__main__":
    import asyncio

    target_url = "https://www.reddit.com/r/singapore/comments/1rfqh4z/"
    started = time.perf_counter()
    result = asyncio.run(verify_url_with_openai(target_url))
    elapsed = time.perf_counter() - started
    print(json.dumps(result, ensure_ascii=False, indent=2))
    print(f"elapsed: {elapsed:.2f}s")