from __future__ import annotations

import json
import logging
import os

from openai import AsyncOpenAI

logger = logging.getLogger(__name__)

CRAWL_PROMPT_ID = "pmpt_69abc686474481978debb3da9a9cf31608966e5dbd6d1dc7"

_api_key = (os.getenv("OPENAI_API_KEY") or "").strip()
if not _api_key:
    raise RuntimeError("OPENAI_API_KEY is missing or empty.")

# Shared async client — reused across all requests.
_client = AsyncOpenAI(api_key=_api_key)


async def crawl_with_openai(url: str, language: str) -> dict:
    response = await _client.responses.create(
        prompt={
            "id": CRAWL_PROMPT_ID,
            "variables": {"url": url, "language": language},
        }
    )

    raw = getattr(response, "output_text", None)
    if not raw:
        logger.error("crawl_with_openai: OpenAI returned empty output_text for url=%s", url)
        raise RuntimeError("OpenAI returned empty output_text for crawl.")

    try:
        return json.loads(raw)
    except json.JSONDecodeError as exc:
        logger.error(
            "crawl_with_openai: JSON parse failed for url=%s raw=%s...",
            url,
            raw[:200],
        )
        raise RuntimeError(f"Crawl: could not parse OpenAI JSON response: {exc}") from exc


if __name__ == "__main__":
    import asyncio

    target = "https://www.nytimes.com/2019/06/22/opinion/gay-lgbt-trump.html"
    result = asyncio.run(crawl_with_openai(target, "English"))
    print(json.dumps(result, ensure_ascii=False, indent=2))