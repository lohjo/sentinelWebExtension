I’ll inspect the project files first so the README preview is accurate, then draft the preview for your approval before creating the file.

Updated todo list

Read [](file:///c%3A/Users/Admin/source/repos/hackomania2026-Nat-Fan-Club-FactGuard-WebExtension/tsconfig.json)

Read [](file:///c%3A/Users/Admin/source/repos/hackomania2026-Nat-Fan-Club-FactGuard-WebExtension/README.md)

Read [](file:///c%3A/Users/Admin/source/repos/hackomania2026-Nat-Fan-Club-FactGuard-WebExtension/package.json)

Read [](file:///c%3A/Users/Admin/source/repos/hackomania2026-Nat-Fan-Club-FactGuard-WebExtension/wxt.config.ts)

Searched for files matching `**/*`, 56 results

Read [](file:///c%3A/Users/Admin/source/repos/hackomania2026-Nat-Fan-Club-FactGuard-WebExtension/src/entrypoints/popup/App.svelte)

Read [](file:///c%3A/Users/Admin/source/repos/hackomania2026-Nat-Fan-Club-FactGuard-WebExtension/src/entrypoints/content.ts)

Read [](file:///c%3A/Users/Admin/source/repos/hackomania2026-Nat-Fan-Club-FactGuard-WebExtension/src/entrypoints/content-chat.ts)

Read [](file:///c%3A/Users/Admin/source/repos/hackomania2026-Nat-Fan-Club-FactGuard-WebExtension/src/entrypoints/popup/app.css)

Read [](file:///c%3A/Users/Admin/source/repos/hackomania2026-Nat-Fan-Club-FactGuard-WebExtension/src/entrypoints/popup/ChatVerifyPanel.svelte)

Read [](file:///c%3A/Users/Admin/source/repos/hackomania2026-Nat-Fan-Club-FactGuard-WebExtension/src/entrypoints/background.ts)

Read [](file:///c%3A/Users/Admin/source/repos/hackomania2026-Nat-Fan-Club-FactGuard-WebExtension/src/entrypoints/popup/App.svelte#1-261), lines 1 to 260

Read [](file:///c%3A/Users/Admin/source/repos/hackomania2026-Nat-Fan-Club-FactGuard-WebExtension/src/entrypoints/popup/App.svelte#261-561), lines 261 to 560

Read [](file:///c%3A/Users/Admin/source/repos/hackomania2026-Nat-Fan-Club-FactGuard-WebExtension/src/lib/config.ts)

Read [](file:///c%3A/Users/Admin/source/repos/hackomania2026-Nat-Fan-Club-FactGuard-WebExtension/src/entrypoints/popup/Login.svelte)

Read [](file:///c%3A/Users/Admin/source/repos/hackomania2026-Nat-Fan-Club-FactGuard-WebExtension/src/lib/hackomania-api.ts)

Read [](file:///c%3A/Users/Admin/source/repos/hackomania2026-Nat-Fan-Club-FactGuard-WebExtension/src/entrypoints/popup/main.ts)

Read [](file:///c%3A/Users/Admin/source/repos/hackomania2026-Nat-Fan-Club-FactGuard-WebExtension/src/lib/chat-scrapers/scrapers.ts)

Read [](file:///c%3A/Users/Admin/source/repos/hackomania2026-Nat-Fan-Club-FactGuard-WebExtension/src/lib/auth-storage.ts)

Searched for files matching `src\**\*.{ts,svelte,css,html}`.

Read [](file:///c%3A/Users/Admin/source/repos/hackomania2026-Nat-Fan-Club-FactGuard-WebExtension/src/lib/chat-scrapers/types.ts)

Read [](file:///c%3A/Users/Admin/source/repos/hackomania2026-Nat-Fan-Club-FactGuard-WebExtension/src/lib/chat-scrapers/index.ts)

Read [](file:///c%3A/Users/Admin/source/repos/hackomania2026-Nat-Fan-Club-FactGuard-WebExtension/src/entrypoints/popup/App.svelte)

Read [](file:///c%3A/Users/Admin/source/repos/hackomania2026-Nat-Fan-Club-FactGuard-WebExtension/vitest.config.ts)

Read [](file:///c%3A/Users/Admin/source/repos/hackomania2026-Nat-Fan-Club-FactGuard-WebExtension/src/lib/__tests__/hackomania-api.test.ts)

Read [](file:///c%3A/Users/Admin/source/repos/hackomania2026-Nat-Fan-Club-FactGuard-WebExtension/src/entrypoints/popup/index.html)

Read [](file:///c%3A/Users/Admin/source/repos/hackomania2026-Nat-Fan-Club-FactGuard-WebExtension/src/lib/chat-scrapers/__tests__/types.test.ts)

Read [](file:///c%3A/Users/Admin/source/repos/hackomania2026-Nat-Fan-Club-FactGuard-WebExtension/src/lib/__tests__/auth-storage.test.ts)

Great request — I reviewed the codebase and drafted a first-release README preview tailored for experienced developers.

## Preview: `README.md`

# FactGuard WebExtension

FactGuard is a browser extension built with [WXT](https://wxt.dev/) and [Svelte](https://svelte.dev/) that adds credibility signals to Google Search results and provides deeper page/chat verification in the popup UI. The extension integrates with a remote verification backend and a separate web app for report workflows.

Core implementation lives in [`src/entrypoints/content.ts`](./src/entrypoints/content.ts), [`src/entrypoints/background.ts`](./src/entrypoints/background.ts), and [`src/entrypoints/popup/App.svelte`](./src/entrypoints/popup/App.svelte).

## Interesting techniques used

- **DOM reactivity for injected UI** with [`MutationObserver`](https://developer.mozilla.org/docs/Web/API/MutationObserver) to keep verification badges in sync on dynamic Google result pages ([`src/entrypoints/content.ts`](./src/entrypoints/content.ts)).
- **Cancelable network requests** using [`AbortController`](https://developer.mozilla.org/docs/Web/API/AbortController) and fetch timeouts for domain verification ([`src/entrypoints/background.ts`](./src/entrypoints/background.ts)).
- **Extension message passing** via [`runtime.sendMessage`](https://developer.mozilla.org/docs/Mozilla/Add-ons/WebExtensions/API/runtime/sendMessage), [`runtime.onMessage`](https://developer.mozilla.org/docs/Mozilla/Add-ons/WebExtensions/API/runtime/onMessage), and [`tabs.sendMessage`](https://developer.mozilla.org/docs/Mozilla/Add-ons/WebExtensions/API/tabs/sendMessage) across content/background/popup layers.
- **Runtime script injection** with [`scripting.executeScript`](https://developer.mozilla.org/docs/Mozilla/Add-ons/WebExtensions/API/scripting/executeScript) to recover from missing content-script contexts in chat pages ([`src/entrypoints/popup/ChatVerifyPanel.svelte`](./src/entrypoints/popup/ChatVerifyPanel.svelte)).
- **Local result caching** and user preference persistence via [`storage.local`](https://developer.mozilla.org/docs/Mozilla/Add-ons/WebExtensions/API/storage/local) with URL+language cache keys ([`src/entrypoints/popup/App.svelte`](./src/entrypoints/popup/App.svelte)).
- **Strict runtime payload parsing** with TypeScript type guards before UI/state updates ([`src/entrypoints/popup/App.svelte`](./src/entrypoints/popup/App.svelte), [`src/lib/auth-storage.ts`](./src/lib/auth-storage.ts)).

## Non-obvious technologies and libraries

- [WXT](https://wxt.dev/) + [`@wxt-dev/module-svelte`](https://www.npmjs.com/package/@wxt-dev/module-svelte) for modern extension bundling and entrypoint conventions.
- [Svelte 5](https://svelte.dev/) reactive primitives (`$state`, `$derived`, `$props`) in popup components.
- [Vitest](https://vitest.dev/) for fast unit testing of storage/API/chat-domain logic (see [`src/lib/__tests__`](./src/lib/__tests__) and [`src/lib/chat-scrapers/__tests__`](./src/lib/chat-scrapers/__tests__)).
- Typed chat scraping abstraction for platform-specific extraction with fallback strategy ([`src/lib/chat-scrapers`](./src/lib/chat-scrapers)).

## Fonts and external assets

- `Segoe UI` (system font stack in [`src/entrypoints/popup/app.css`](./src/entrypoints/popup/app.css))
- [`Noto Sans KR`](https://fonts.google.com/noto/specimen/Noto+Sans+KR) (fallback/locale-friendly UI font in [`src/entrypoints/popup/app.css`](./src/entrypoints/popup/app.css))

## Project structure

```text
.
├─ README.md
├─ package.json
├─ pnpm-lock.yaml
├─ tsconfig.json
├─ vitest.config.ts
├─ wxt.config.ts
├─ wxt-env.d.ts
├─ build_chrome_latest.zip
├─ old_version_chrome.zip
├─ old_version_firefox.zip
├─ imgs/
├─ public/
│  ├─ icon/
│  └─ verification_icon/
├─ src/
│  ├─ assets/
│  ├─ entrypoints/
│  │  └─ popup/
│  └─ lib/
│     ├─ __tests__/
│     └─ chat-scrapers/
│        └─ __tests__/
└─ .vscode/
```

- [`src/entrypoints`](./src/entrypoints): extension runtime entrypoints (background, content scripts, popup app).
- [`src/lib`](./src/lib): shared API/storage/scraping logic and testable utility modules.
- [`public/verification_icon`](./public/verification_icon): badge assets mapped to verification outcomes.
- [`imgs`](./imgs): screenshots used for documentation and release visuals.

---

If this looks good, I’ll create/update `README.md` exactly with this content and validate markdown formatting.