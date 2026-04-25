from __future__ import annotations

import json
import logging

try:
    from crawl import crawl_with_openai
    from llm import chat_complete
except ImportError:
    from src.crawl import crawl_with_openai
    from src.llm import chat_complete

logger = logging.getLogger(__name__)

_SYSTEM = """\
You are a professional fact-checker. Analyze the provided content and return ONLY valid JSON — no markdown, no explanation.

Output schema:
{
  "CredibilityAssessment": {
    "Verdict": "<Likely Accurate|Unverified|Potentially Misleading>",
    "VerdictReasoning": "<one paragraph>",
    "SupportingSourceCount": <int>,
    "ContradictingSourceCount": <int>,
    "SampleSupportingSources": [{"Title": "", "URL": "", "Excerpt": ""}],
    "SampleContradictingSources": [{"Title": "", "URL": "", "Excerpt": ""}]
  },
  "DeepComparison": {
    "ReliableSource": {"Name": "", "URL": ""},
    "Agreements": ["<point>"],
    "Differences": ["<point>"],
    "Analysis": "<paragraph>"
  },
  "ContextualFlags": {
    "MissingContext": ["<flag>"],
    "PotentialRisks": ["<flag>"]
  }
}"""


def _strip_fences(raw: str) -> str:
    raw = raw.strip()
    if raw.startswith("```"):
        parts = raw.split("```", 2)
        raw = parts[1] if len(parts) > 1 else raw
        if raw.startswith("json"):
            raw = raw[4:]
        raw = raw.rsplit("```", 1)[0].strip()
    return raw


async def verify_content_with_openai(
    title: str,
    body: str,
    comments: str,
    language: str,
) -> dict:
    user_msg = (
        f"Language: {language}\n"
        f"Title: {title}\n\n"
        f"Body:\n{body[:6000]}\n\n"
        f"Comments:\n{comments[:2000]}"
    )

    raw = await chat_complete(
        messages=[
            {"role": "system", "content": _SYSTEM},
            {"role": "user", "content": user_msg},
        ],
        max_tokens=2000,
    )

    raw = _strip_fences(raw)
    try:
        return json.loads(raw)
    except json.JSONDecodeError as exc:
        logger.error("verify_content: JSON parse failed raw=%s...", raw[:200])
        raise RuntimeError(f"Verify: could not parse LLM JSON response: {exc}") from exc


async def verify_url_with_openai(url: str) -> dict:
    crawled = await crawl_with_openai(url, "English")
    return await verify_content_with_openai(
        title=crawled.get("Title", ""),
        body=crawled.get("Body Text", ""),
        comments=crawled.get("Comments", ""),
        language="English",
    )
