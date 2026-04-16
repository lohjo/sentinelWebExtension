from __future__ import annotations

import json
import os

from openai import OpenAI

WEBSITE_VERIFY_PROMPT_ID = "pmpt_69abe408b3a88193a5a119438d36665102cb49c173fc89a3"
api_key = (os.getenv("OPENAI_API_KEY") or "").strip()
if not api_key:
    raise RuntimeError("OPENAI_API_KEY is missing or empty.")
client = OpenAI(api_key=api_key)


def website_verify_with_openai(url: str) -> dict:
    response = client.responses.create(
        prompt={
            "id": WEBSITE_VERIFY_PROMPT_ID,
            "variables": {"url": url},
        }
    )

    if not response.output_text:
        raise RuntimeError("OpenAI returned empty output_text for website verify.")

    return json.loads(response.output_text)


if __name__ == "__main__":
    target_url = "https://example.com"
    result = website_verify_with_openai(target_url)
    print(json.dumps(result, ensure_ascii=False, indent=2))
