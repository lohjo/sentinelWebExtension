from __future__ import annotations

import json
import logging
import os

from openai import AsyncOpenAI

logger = logging.getLogger(__name__)

WEBSITE_VERIFY_PROMPT_ID = "pmpt_69abe408b3a88193a5a119438d36665102cb49c173fc89a3"

_api_key = (os.getenv("OPENAI_API_KEY") or "").strip()
if not _api_key:
    raise RuntimeError("OPENAI_API_KEY is missing or empty.")

# Shared async client — reused across all requests.
_client = AsyncOpenAI(api_key=_api_key)


async def website_verify_with_openai(url: str) -> dict:
    response = await _client.responses.create(
        prompt={
            "id": WEBSITE_VERIFY_PROMPT_ID,
            "variables": {"url": url},
        }
    )

    raw = getattr(response, "output_text", None)
    if not raw:
        logger.error("website_verify_with_openai: empty output_text for url=%s", url)
        raise RuntimeError("OpenAI returned empty output_text for website verify.")

    try:
        return json.loads(raw)
    except json.JSONDecodeError as exc:
        logger.error(
            "website_verify_with_openai: JSON parse failed for url=%s raw=%s...",
            url,
            raw[:200],
        )
        raise RuntimeError(
            f"Website verify: could not parse OpenAI JSON response: {exc}"
        ) from exc


if __name__ == "__main__":
    import asyncio

    target_url = "https://example.com"
    result = asyncio.run(website_verify_with_openai(target_url))
    print(json.dumps(result, ensure_ascii=False, indent=2))