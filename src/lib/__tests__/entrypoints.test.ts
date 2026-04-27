import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ---------------------------------------------------------------------------
// Cache TTL logic unit test (extracted from App.svelte logic)
// ---------------------------------------------------------------------------

const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24h

function isCacheEntryFresh(fetchedAt: string | undefined): boolean {
  if (!fetchedAt || typeof fetchedAt !== 'string') return false;
  const ts = new Date(fetchedAt).getTime();
  if (isNaN(ts)) return false;
  return Date.now() - ts <= CACHE_TTL_MS;
}

describe('cache TTL enforcement', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns fresh for entry fetched now', () => {
    const now = new Date().toISOString();
    expect(isCacheEntryFresh(now)).toBe(true);
  });

  it('returns fresh for entry fetched 23h ago', () => {
    const twentyThreeHoursAgo = new Date(Date.now() - 23 * 60 * 60 * 1000).toISOString();
    expect(isCacheEntryFresh(twentyThreeHoursAgo)).toBe(true);
  });

  it('returns fresh for entry fetched exactly 24h ago', () => {
    const twentyFourHoursAgo = new Date(Date.now() - CACHE_TTL_MS).toISOString();
    expect(isCacheEntryFresh(twentyFourHoursAgo)).toBe(true);
  });

  it('returns stale for entry fetched 25h ago', () => {
    const twentyFiveHoursAgo = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString();
    expect(isCacheEntryFresh(twentyFiveHoursAgo)).toBe(false);
  });

  it('returns false for missing fetchedAt', () => {
    expect(isCacheEntryFresh(undefined)).toBe(false);
  });

  it('returns false for invalid ISO string', () => {
    expect(isCacheEntryFresh('not-a-date')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Config constants sanity checks
// ---------------------------------------------------------------------------
describe('config constants', () => {
  it('CONTEXTGUARD_API_BASE has no trailing slash', async () => {
    const { CONTEXTGUARD_API_BASE } = await import('../config');
    expect(CONTEXTGUARD_API_BASE).not.toMatch(/\/$/);
  });

  it('BACKEND_BASE has no trailing slash', async () => {
    const { BACKEND_BASE } = await import('../config');
    expect(BACKEND_BASE).not.toMatch(/\/$/);
  });

  it('BACKEND_CRAWL_URL ends with /crawl', async () => {
    const { BACKEND_CRAWL_URL } = await import('../config');
    expect(BACKEND_CRAWL_URL).toMatch(/\/crawl$/);
  });

  it('BACKEND_VERIFY_CONTENT_URL ends with /verify_content', async () => {
    const { BACKEND_VERIFY_CONTENT_URL } = await import('../config');
    expect(BACKEND_VERIFY_CONTENT_URL).toMatch(/\/verify_content$/);
  });

  it('BACKEND_DOMAIN_VERIFY_URL ends with /domain_verify', async () => {
    const { BACKEND_DOMAIN_VERIFY_URL } = await import('../config');
    expect(BACKEND_DOMAIN_VERIFY_URL).toMatch(/\/domain_verify$/);
  });

  it('CACHE_TTL_MS equals 24 hours', async () => {
    const { CACHE_TTL_MS } = await import('../config');
    expect(CACHE_TTL_MS).toBe(86_400_000);
  });
});

describe('env-driven config', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('normalizes VITE_BACKEND_BASE with trailing slash', async () => {
    vi.stubEnv('VITE_BACKEND_BASE', 'https://example-backend.test///');

    const { BACKEND_BASE, BACKEND_CRAWL_URL, BACKEND_VERIFY_CONTENT_URL, BACKEND_DOMAIN_VERIFY_URL } =
      await import('../config');

    expect(BACKEND_BASE).toBe('https://example-backend.test');
    expect(BACKEND_CRAWL_URL).toBe('https://example-backend.test/crawl');
    expect(BACKEND_VERIFY_CONTENT_URL).toBe('https://example-backend.test/verify_content');
    expect(BACKEND_DOMAIN_VERIFY_URL).toBe('https://example-backend.test/domain_verify');
  });

  it('normalizes VITE_CONTEXTGUARD_API_BASE with trailing slash', async () => {
    vi.stubEnv('VITE_CONTEXTGUARD_API_BASE', 'https://custom-app.example///');
    const { CONTEXTGUARD_API_BASE } = await import('../config');
    expect(CONTEXTGUARD_API_BASE).toBe('https://custom-app.example');
  });

  it('uses VITE_BACKEND_API_KEY when provided', async () => {
    vi.stubEnv('VITE_BACKEND_API_KEY', 'my-own-key');
    const { BACKEND_API_KEY_VALUE } = await import('../config');
    expect(BACKEND_API_KEY_VALUE).toBe('my-own-key');
  });
});