# ContextGuard Backend

FastAPI backend for the ContextGuard browser extension.

## Endpoints

| Method | Path | Status | Description |
|--------|------|--------|-------------|
| POST | `/crawl` | Active | Crawl a URL and return structured page content |
| POST | `/verify_content` | Active | Verify page content with AI |
| POST | `/domain_verify` | Active | Fast domain-level credibility signal |
| POST | `/verify` | **Deprecated** | Old combined crawl+verify (kept for backwards compat) |
| GET | `/netcheck` | Active | DNS reachability health check |
| GET | `/` | Active | Health / version endpoint |

### Deprecated endpoint policy

`/verify` carries `Deprecation: true` and `Sunset: 2025-12-31` response headers.  
Do **not** use it for new code. Use `/crawl` → `/verify_content` instead.

## Environment variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `OPENAI_API_KEY` | Yes | — | OpenAI API key |
| `CONTEXTGUARD_API_KEY` | No | *(open)* | Shared secret checked in `X-ContextGuard-Key` header. If unset, auth is disabled (dev only). |
| `CORS_ALLOWED_ORIGINS` | No | see below | Comma-separated allowed origins |
| `RATE_LIMIT_REQUESTS` | No | `60` | Max requests per IP per window |
| `RATE_LIMIT_WINDOW_SEC` | No | `60` | Rate-limit window in seconds |

Default CORS origins: `https://contextguard-frontend-477107377254.asia-southeast1.run.app, http://localhost:3000`

## Authentication

All non-health endpoints require the `X-ContextGuard-Key` header when `CONTEXTGUARD_API_KEY` is set.

```
X-ContextGuard-Key: <shared-secret>
```

### Extension build pairing

When shipping the extension, set the extension build variable `VITE_BACKEND_API_KEY` to the same value as backend `CONTEXTGUARD_API_KEY`.

- Backend runtime: `CONTEXTGUARD_API_KEY=mysecret`
- Extension build-time: `VITE_BACKEND_API_KEY=mysecret`

If these values do not match, backend requests from the extension return `401`.

## Cache TTL

The extension caches `/crawl` + `/verify_content` results for **24 hours** per `(url, language)` pair. Stale entries are evicted on read.

## Local development

```bash
cd backend
pip install uv
uv sync
uv run uvicorn main:app --reload --port 8080
```

Smoke-test all endpoints:

```bash
curl http://localhost:8080/
curl http://localhost:8080/netcheck

curl -X POST http://localhost:8080/domain_verify \
  -H 'Content-Type: application/json' \
  -d '{"url":"https://www.bbc.com/","language":"English"}'

curl -X POST http://localhost:8080/crawl \
  -H 'Content-Type: application/json' \
  -d '{"url":"https://www.bbc.com/news","language":"English"}'
```

With API key enabled:

```bash
export CONTEXTGUARD_API_KEY=mysecret
curl -X POST http://localhost:8080/domain_verify \
  -H 'Content-Type: application/json' \
  -H 'X-ContextGuard-Key: mysecret' \
  -d '{"url":"https://www.bbc.com/","language":"English"}'
```
