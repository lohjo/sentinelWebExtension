from __future__ import annotations

import json
import os

from openai import OpenAI

CRAWL_PROMPT_ID = "pmpt_69abc686474481978debb3da9a9cf31608966e5dbd6d1dc7"
api_key = (os.getenv("OPENAI_API_KEY") or "").strip()
if not api_key:
    raise RuntimeError("OPENAI_API_KEY is missing or empty.")
client = OpenAI(api_key=api_key)


def crawl_with_openai(url: str, language: str) -> dict:
    response = client.responses.create(
        prompt={
            "id": CRAWL_PROMPT_ID,
            "variables": {"url": url, "language": language},
        }
    )

    if not response.output_text:
        raise RuntimeError("OpenAI returned empty output_text.")

    return json.loads(response.output_text)


if __name__ == "__main__":
    target = "https://www.nytimes.com/2019/06/22/opinion/gay-lgbt-trump.html"
    result = crawl_with_openai(target)
    print(json.dumps(result, ensure_ascii=False, indent=2))
