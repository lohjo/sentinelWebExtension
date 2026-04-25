from __future__ import annotations

import json
import logging

try:
    from llm import chat_complete
except ImportError:
    from src.llm import chat_complete

logger = logging.getLogger(__name__)

_SYSTEM = """\
You are a domain credibility expert. Given a URL, assess the website and return ONLY valid JSON — no markdown.

Output schema:
{
  "Verdict": "<Likely Accurate|Unverified|Potentially Misleading>",
  "IsSingaporeSite": <true|false>,
  "Fail": false
}

IsSingaporeSite is true for Singapore-based news, government, or institutional sites
(e.g. straitstimes.com, channelnewsasia.com, gov.sg, todayonline.com, mothership.sg)."""


def _strip_fences(raw: str) -> str:
    raw = raw.strip()
    if raw.startswith("```"):
        parts = raw.split("```", 2)
        raw = parts[1] if len(parts) > 1 else raw
        if raw.startswith("json"):
            raw = raw[4:]
        raw = raw.rsplit("```", 1)[0].strip()
    return raw


async def website_verify_with_openai(url: str) -> dict:
    raw = await chat_complete(
        messages=[
            {"role": "system", "content": _SYSTEM},
            {"role": "user", "content": f"Assess this URL: {url}"},
        ],
        max_tokens=100,
    )

    raw = _strip_fences(raw)
    try:
        return json.loads(raw)
    except json.JSONDecodeError as exc:
        logger.error(
            "website_verify: JSON parse failed url=%s raw=%s...", url, raw[:200]
        )
        return {"Verdict": "Unverified", "IsSingaporeSite": False, "Fail": True}
