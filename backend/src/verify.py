from __future__ import annotations

import json
import os
import time

from openai import OpenAI

try:
    from crawl import crawl_with_openai
except ImportError:  # pragma: no cover
    from src.crawl import crawl_with_openai

VERIFY_PROMPT_ID = "pmpt_69abc91051848195800cf59937efd9410593b431d4c0aece"
api_key = (os.getenv("OPENAI_API_KEY") or "").strip()
if not api_key:
    raise RuntimeError("OPENAI_API_KEY is missing or empty.")
client = OpenAI(api_key=api_key)


def verify_content_with_openai(
    title: str,
    body: str,
    comments: str,
    language: str,
) -> dict:
    response = client.responses.create(
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

    if not response.output_text:
        raise RuntimeError("OpenAI returned empty output_text for verify.")

    return json.loads(response.output_text)


def verify_url_with_openai(url: str) -> dict:
    crawled = crawl_with_openai(url)
    return verify_content_with_openai(
        title=crawled.get("Title", ""),
        body=crawled.get("Body Text", ""),
        comments=crawled.get("Comments", ""),
        language="English"
    )


if __name__ == "__main__":
    target_url = "https://www.reddit.com/r/singapore/comments/1rfqh4z/singaporeans_dont_want_a_nordic_model_we_want_to/"
    started = time.perf_counter()
    result = verify_url_with_openai(target_url)
    elapsed = time.perf_counter() - started
    print(json.dumps(result, ensure_ascii=False, indent=2))
    print(f"elapsed: {elapsed:.2f}s")
