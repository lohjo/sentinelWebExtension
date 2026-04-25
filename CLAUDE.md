# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository. Use full caveman format when generating output. Use any relevant caveman skills for any process to save tokens.

## Commands

```bash
pnpm dev              # WXT dev mode (Chrome, port 3001)
pnpm dev:firefox      # WXT dev mode (Firefox)
pnpm build            # Production build (Chrome MV3)
pnpm build:firefox    # Production build (Firefox)
pnpm zip              # Create distributable zip
pnpm check            # svelte-check type checking
pnpm test             # vitest run (single pass)
pnpm test:watch       # vitest watch mode
```

Run single test file: `pnpm test src/lib/__tests__/auth-storage.test.ts`

After `pnpm install`, WXT auto-runs `wxt prepare` (postinstall) to generate `.wxt/tsconfig.json` and type stubs.

## Environment

Copy `.env.example` to `.env` before dev/build. Key vars:

| Variable | Required | Purpose |
|---|---|---|
| `VITE_BACKEND_API_KEY` | Yes | Auth header injected by background.ts |
| `VITE_BACKEND_BASE` | No | Override backend URL |
| `VITE_FACTGUARD_API_BASE` | No | Override web app URL |

Host permissions in `wxt.config.ts` are derived from these env vars at build time.

## Architecture

**Framework**: WXT (extension bundler) + Svelte 5 + TypeScript, targeting Chrome Manifest V3.

Build outputs to `.output/chrome-mv3/` (prod) and `.output/chrome-mv3-dev/` (dev).

### Entrypoints (`src/entrypoints/`)

- **background.ts** — Service worker. Tracks active tab via `browser.tabs` events. Relays `get-active-tab-info` and `verify-url` messages between popup and content scripts. Injects `X-FactGuard-Key` auth header on matching backend requests using `declarativeNetRequest`-style fetch interception.

- **content.ts** — Injected on Google Search. Uses `MutationObserver` to detect new result cards, appends verification badges, then fires domain verify requests (8s AbortController timeout) against the backend. Badge state cycles: `verifying…` → verdict icon (Accurate/Unverified/Misleading, SG vs Non-SG variants from `public/verification_icon/`).

- **content-chat.ts** — Injected on Facebook, Messenger, Telegram, WhatsApp. Scrapes messages via platform-specific DOM selectors defined in `src/lib/chat-scrapers/`.

- **popup/App.svelte** — Main UI (838 lines). Two tabs: Page verification (crawl → summarize → verify pipeline) and Chat verification. Manages local cache in `storage.local` keyed by `url::language` with 24h TTL. Applies status-based theming. Handles language selection (EN, MY, TA, KO, ZH).

### Shared Libraries (`src/lib/`)

- **config.ts** — Single source of truth for all URLs and the cache TTL constant. Read this before hardcoding any endpoint.

- **auth-storage.ts** — Typed wrapper around `browser.storage.local` for the auth token/user object. Uses TypeScript type guards before every state update to prevent payload corruption across the extension message boundary.

- **hackomania-api.ts** — HTTP client for the web app backend (login, chat report submission). All responses parsed with strict fallback error handling.

- **chat-scrapers/** — Platform detection (`types.ts` exports `ChatPlatform` enum + `isChatDomain()`), DOM scraping logic (`scrapers.ts`), public re-exports (`index.ts`).

### Message Passing Pattern

Popup → background (`get-active-tab-info`, `verify-url`) → content script response. All cross-context data must be validated with type guards before use — runtime types are not guaranteed across the message boundary.

### Testing

Tests live in `src/lib/__tests__/` and `src/lib/chat-scrapers/__tests__/`. Use `vi.fn()` for `browser.storage` mocks and `vi.stubGlobal()` for globals. The vitest environment is `node` (see `vitest.config.ts`).
