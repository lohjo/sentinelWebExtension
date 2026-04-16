from fastapi import FastAPI
from pydantic import BaseModel
from starlette.concurrency import run_in_threadpool
import socket
import time

from src.verify import verify_url_with_openai, verify_content_with_openai
from src.crawl import crawl_with_openai
from src.website_verify import website_verify_with_openai

app = FastAPI()


class VerifyRequest(BaseModel):
    url: str
    language: str

class ContentVerifyRequest(BaseModel):
    title: str
    body: str
    comments: str
    language: str


@app.get("/")
def read_root():
    return {"message": "hello fastapi"}


@app.post("/verify") # DEPRECATED
async def verify(request: VerifyRequest):
    result = await run_in_threadpool(verify_url_with_openai, request.url)
    return result

@app.post("/crawl")
async def crawl(request: VerifyRequest):
    result = await run_in_threadpool(crawl_with_openai, request.url, request.language)
    return result

@app.post("/verify_content")
async def verify_content(request: ContentVerifyRequest):
    result = await run_in_threadpool(verify_content_with_openai, request.title, request.body, request.comments, request.language)
    return result

@app.post("/domain_verify")
async def domain_verify(request: VerifyRequest):
    result = await run_in_threadpool(website_verify_with_openai, request.url)
    return result


@app.get("/netcheck")
async def netcheck():
    started = time.perf_counter()
    try:
        with socket.create_connection(("8.8.8.8", 53), timeout=3):
            elapsed = time.perf_counter() - started
            return {"ok": True, "target": "8.8.8.8:53", "elapsed_sec": round(elapsed, 2)}
    except OSError as exc:
        elapsed = time.perf_counter() - started
        return {
            "ok": False,
            "target": "8.8.8.8:53",
            "elapsed_sec": round(elapsed, 2),
            "error": str(exc),
        }
