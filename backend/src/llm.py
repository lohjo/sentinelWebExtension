from __future__ import annotations

import logging
import os
from typing import Any

from openai import AsyncOpenAI

logger = logging.getLogger(__name__)

_sea_lion_key = (os.getenv("SEA_LION_API_KEY") or "").strip()
_groq_key = (os.getenv("GROQ_API_KEY") or "").strip()

if not _sea_lion_key and not _groq_key:
    raise RuntimeError("SEA_LION_API_KEY and GROQ_API_KEY are both missing.")

_sea_lion_client = (
    AsyncOpenAI(api_key=_sea_lion_key, base_url="https://api.sea-lion.ai/v1")
    if _sea_lion_key
    else None
)
_groq_client = (
    AsyncOpenAI(api_key=_groq_key, base_url="https://api.groq.com/openai/v1")
    if _groq_key
    else None
)

SEA_LION_MODEL = os.getenv("SEA_LION_MODEL", "sea-lion-v3-instruct")
GROQ_FALLBACK_MODEL = os.getenv("GROQ_FALLBACK_MODEL", "llama-3.3-70b-versatile")


async def chat_complete(
    messages: list[dict[str, str]],
    max_tokens: int = 2000,
    temperature: float = 0.1,
) -> str:
    """Call SEA-LION; fall back to Groq on any error."""
    if _sea_lion_client:
        try:
            resp = await _sea_lion_client.chat.completions.create(
                model=SEA_LION_MODEL,
                messages=messages,
                temperature=temperature,
                max_tokens=max_tokens,
            )
            return resp.choices[0].message.content or ""
        except Exception as exc:
            logger.warning("SEA-LION failed (%s), falling back to Groq", exc)

    if _groq_client:
        resp = await _groq_client.chat.completions.create(
            model=GROQ_FALLBACK_MODEL,
            messages=messages,
            temperature=temperature,
            max_tokens=max_tokens,
        )
        return resp.choices[0].message.content or ""

    raise RuntimeError("All LLM backends failed.")
