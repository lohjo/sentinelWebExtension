from __future__ import annotations

import logging
import re

import httpx
from bs4 import BeautifulSoup

logger = logging.getLogger(__name__)

_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.5",
}

_BODY_LIMIT = 8000
_COMMENT_LIMIT = 3000


def _clean_text(soup: BeautifulSoup) -> str:
    for tag in soup(["script", "style", "nav", "footer", "header", "aside"]):
        tag.decompose()
    return " ".join(soup.get_text(separator=" ").split())


async def crawl_with_openai(url: str, language: str) -> dict:
    """Fetch URL and return structured content dict."""
    try:
        async with httpx.AsyncClient(
            headers=_HEADERS,
            follow_redirects=True,
            timeout=20.0,
        ) as client:
            resp = await client.get(url)
            resp.raise_for_status()
            html = resp.text
    except httpx.HTTPError as exc:
        logger.error("crawl: HTTP error url=%s: %s", url, exc)
        raise RuntimeError(f"Failed to fetch URL: {exc}") from exc

    soup = BeautifulSoup(html, "html.parser")

    title = (soup.title.string or "").strip() if soup.title else ""

    main_el = soup.find("article") or soup.find("main") or soup.body
    body_text = (
        _clean_text(BeautifulSoup(str(main_el), "html.parser"))
        if main_el
        else _clean_text(soup)
    )
    body_text = body_text[:_BODY_LIMIT]

    comments_el = soup.find(id=re.compile(r"comment", re.I)) or soup.find(
        class_=re.compile(r"comment", re.I)
    )
    comments = ""
    if comments_el:
        comments = _clean_text(BeautifulSoup(str(comments_el), "html.parser"))[
            :_COMMENT_LIMIT
        ]

    return {
        "Title": title,
        "Body Text": body_text,
        "Comments": comments,
        "Summary": body_text[:500],
    }
