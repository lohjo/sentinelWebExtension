# FactGuard

AI-assisted credibility review system built across three repositories:

1. An AI-powered browser extension for inline search-result verification and detailed page analysis
2. A FastAPI backend that handles crawling and OpenAI-powered verification
3. A Next.js website focused on forum-based content workflows

## Repositories
We have THREE repositories! Pls take a look.
- WebExtension: [JunJin1218/natfanclub-webextension](https://github.com/JunJin1218/natfanclub-webextension)
- Backend for WebExtension: [JunJin1218/natfanclub-backend](https://github.com/JunJin1218/natfanclub-backend.git)
- Website repo: [ItsMeOX/Hackomania](https://github.com/ItsMeOX/Hackomania)

## System Overview

### 1. AI-Powered Web Extension

This repository contains the browser extension built with WXT and Svelte.

Main responsibilities:

- Inject verification badges into Google Search results
- Show a popup with credibility analysis for the current page
- Cache results locally by URL and selected language
- Integrate with the forum-based webpage login flow
- Provide direct links for reporting suspicious content to the forum-based webpage
- Support Chrome builds

Current extension surfaces:

- `content.ts`: injects search-result verification badges
- `background.ts`: relays verification requests to the backend
- `popup/App.svelte`: renders the detailed credibility review UI

### 2. FastAPI Backend

The backend is implemented with FastAPI and uses the OpenAI API to power crawling and verification.

It currently exposes three main endpoints for the extension flow:

- `/verify_content`
- `/domain_verify`
- `/crawl`

Notes:

- The endpoint order above is intentional and matches the current project usage
- The extension uses `crawl` first, then `verify_content`
- `domain_verify` is used by the injected Google Search badge flow

### 3. Forum-Based Website

The website repository is built with Next.js and is intended for forum-based website scenarios.

This repo complements the extension/backend setup by providing a standalone web interface and broader content workflows outside the browser extension popup.

## Main Features

### Overall

- Multilingual credibility review results across the system

### Web Extension

#### 1. Google Search URL-Based Verifier

- Injects verification badges directly into Google Search results
- Distinguishes Singapore and non-Singapore sites
- Uses both domain-level and full-URL signals so AI can make a fast initial judgment

#### 2. Web Content Crawl + Verifier

- Runs a `crawl -> summarize -> verify` pipeline
- Summarizes not only the main page content but also associated comments when available
- Cross-checks claims against credible sources and returns report-style output with real links
- Includes localized source discovery, including local credible sources where relevant
- Uses `(full URL + language)` as the local storage cache key to reduce repeated token usage
- Transparently exposes supporting and contradicting source findings

#### 3. Forum Integration

- Supports login through the connected forum-based webpage system
- Provides direct navigation links so users can quickly report suspicious pages through the website workflow

## Extension Flow

### Search Result Verification

When a user searches on Google:

1. The content script finds result cards
2. The extension sends the result URL to the backend via `domain_verify`
3. The badge updates to show the verification state

### Popup Review Flow

When the popup opens:

1. The extension reads the active tab URL
2. It loads the user's preferred language from local storage
3. It checks local cache for an existing result
4. If no cache is found, it calls `crawl`
5. The crawled `Body Text` is shown as the summary
6. It then calls `verify_content` with:
   - `title`
   - `body`
   - `comments`
   - `language`
7. The popup renders:
   - verdict
   - credibility reasoning
   - supporting and contradicting sources
   - comparison with a reliable source
   - contextual flags

## Tech Stack

### Extension

- WXT
- Svelte (with TypeScript)
- WebExtension APIs

### Backend

- FastAPI
- OpenAI API (Thanks for credits supported!)
- Google Cloud Run (Thanks for credits supported!)
- Python

### Website

- Next.js

## Local Development

### Web Extension

Install dependencies:

```bash
pnpm install
```

Run development mode:

```bash
pnpm dev
```

Build for browser loading:

```bash
pnpm build
```

Then load the generated extension manually in the target browser.

Create packaged zip builds:

```bash
pnpm zip
```

Use these packaged outputs when you want a distributable build artifact instead of a dev or unpacked build folder.

Prebuilt zip artifacts are also included in this repository:

- `build_chrome_latest.zip`: latest packaged Chrome build. This is the current version and is supported on Chrome only.
- `old_version_chrome.zip`: older Chrome build without the login flow.
- `old_version_firefox.zip`: older Firefox build without the login flow.

Typical output folders:

- Chrome dev: `.output/chrome-mv3-dev/`
- Chrome build: `.output/chrome-mv3/`

### Backend

The backend is currently deployed on Google Cloud Run:

- `https://natfanclub-backend-809989871890.asia-southeast1.run.app`

Main extension-facing endpoints:

- `/verify_content`
- `/domain_verify`
- `/crawl`

### Webpage

The website repository is built with Next.js.

Typical local usage:

```bash
pnpm install
pnpm dev
```

## Highlights

- Inline Google Search verification badges
- Popup-based detailed credibility review
- Language-aware analysis
- Local caching for faster repeated lookups
- Cross-browser extension support
- AI-backed crawling and content verification

## Status

This repository is the browser-extension frontend of the broader FactGuard system. It is designed to work together with the FastAPI backend and the separate Next.js website repository listed above.

## Screenshots

### Website: Main Landing Page

<p align="center">
  <img src="./imgs/MainPage.jpg" alt="FactGuard main landing page" width="900" />
</p>

<p align="center"><sub>Main website landing page for discovering and verifying suspicious claims.</sub></p>

### Website: Forum / Listing Page

<p align="center">
  <img src="./imgs/ForumPage.jpg" alt="FactGuard forum listing page" width="900" />
</p>

<p align="center"><sub>Forum-style listing page for browsing suspicious claims and trending topics.</sub></p>

### Website: Suspicious Report Submission Page

<p align="center">
  <img src="./imgs/ReportSuspicious.jpg" alt="FactGuard suspicious report submission page" width="900" />
</p>

<p align="center"><sub>Submission form for reporting suspicious information with supporting context.</sub></p>

### Web Extension: Google Search Verification

<p align="center">
  <img src="./imgs/GoogleSearch.png" alt="Google Search result verification badges" width="900" />
</p>

<p align="center"><sub>Inline Google Search verification badges showing likely accurate, unverified, and potentially misleading results.</sub></p>

### Web Extension: Popup Overview

<p align="center">
  <img src="./imgs/Screenshot-EN2.png" alt="Extension popup in English" width="900" />
</p>

<p align="center"><sub>Extension popup review flow in English.</sub></p>

<p align="center">
  <img src="./imgs/Screenshot-CN3.png" alt="Extension popup in Chinese" width="900" />
</p>

<p align="center"><sub>Extension popup review flow in Chinese to demonstrate multilingual support.</sub></p>

### Web Extension: Popup Details

<p align="center">
  <img src="./imgs/Popup-CredibilityStatistics.png" alt="Popup credibility statistics section" width="31%" />
  <img src="./imgs/Popup-Comparison.png" alt="Popup comparison section" width="31%" />
  <img src="./imgs/Popup-CN.png" alt="Popup Chinese localized section" width="31%" />
</p>

<p align="center"><sub>Detailed popup sections for credibility statistics, source comparison, and localized multilingual output.</sub></p>
