/**
 * Base URL for Hackomania/FactGuard web app (NO trailing slash).
 */
const DEFAULT_FACTGUARD_API_BASE = 'https://hackomania-three.vercel.app';
const DEFAULT_BACKEND_BASE = 'https://natfanclub-backend-809989871890.asia-southeast1.run.app';

const PROCESS_ENV: Record<string, string | undefined> =
  (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env ?? {};

const VITE_FACTGUARD_API_BASE =
  PROCESS_ENV.VITE_FACTGUARD_API_BASE ?? import.meta.env.VITE_FACTGUARD_API_BASE;
const VITE_BACKEND_BASE = PROCESS_ENV.VITE_BACKEND_BASE ?? import.meta.env.VITE_BACKEND_BASE;
const VITE_BACKEND_API_KEY = PROCESS_ENV.VITE_BACKEND_API_KEY ?? import.meta.env.VITE_BACKEND_API_KEY;

const normalizeBaseUrl = (value: string | undefined, fallback: string): string => {
  const candidate = (value ?? '').trim();
  const chosen = candidate || fallback;
  return chosen.replace(/\/+$/, '');
};

export const FACTGUARD_API_BASE = normalizeBaseUrl(
  VITE_FACTGUARD_API_BASE,
  DEFAULT_FACTGUARD_API_BASE,
);

// --- Web-app paths ---
export const FACTGUARD_LOGIN_PATH = '/api/auth/login';
export const FACTGUARD_CHAT_REPORT_PATH = '/api/internal/extension/chat-report';

// --- Backend base (NO trailing slash) ---
export const BACKEND_BASE = normalizeBaseUrl(VITE_BACKEND_BASE, DEFAULT_BACKEND_BASE);

// --- Backend endpoint paths ---
export const BACKEND_CRAWL_PATH = '/crawl';
export const BACKEND_VERIFY_CONTENT_PATH = '/verify_content';
export const BACKEND_DOMAIN_VERIFY_PATH = '/domain_verify';

// --- Full backend URLs (convenience) ---
export const BACKEND_CRAWL_URL = `${BACKEND_BASE}${BACKEND_CRAWL_PATH}`;
export const BACKEND_VERIFY_CONTENT_URL = `${BACKEND_BASE}${BACKEND_VERIFY_CONTENT_PATH}`;
export const BACKEND_DOMAIN_VERIFY_URL = `${BACKEND_BASE}${BACKEND_DOMAIN_VERIFY_PATH}`;

// --- Shared API key header (extension → backend) ---
// Value injected at build time via env; falls back to empty string (open during dev).
export const BACKEND_API_KEY_HEADER = 'X-FactGuard-Key';
export const BACKEND_API_KEY_VALUE = (VITE_BACKEND_API_KEY ?? '').trim();

// --- Cache ---
export const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours