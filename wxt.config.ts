import { defineConfig } from 'wxt';

function toHostPermission(baseUrl: string | undefined): string | null {
  if (!baseUrl) return null;
  try {
    const origin = new URL(baseUrl).origin;
    return `${origin}/*`;
  } catch {
    return null;
  }
}

const BUILD_ENV: Record<string, string | undefined> =
  (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env ?? {};

const hostPermissions = [
  'https://natfanclub-backend-809989871890.asia-southeast1.run.app/*',
  'https://hackomania-three.vercel.app/*',
  'http://localhost:3000/*',
  toHostPermission(BUILD_ENV.VITE_BACKEND_BASE),
  toHostPermission(BUILD_ENV.VITE_FACTGUARD_API_BASE),
].filter((value, index, arr): value is string => Boolean(value) && arr.indexOf(value) === index);

// See https://wxt.dev/api/config.html
export default defineConfig({
  srcDir: 'src',
  modules: ['@wxt-dev/module-svelte'],
  manifest: {
    name: 'FactGuard',
    permissions: ['activeTab', 'tabs', 'storage', 'windows', 'scripting'],
    host_permissions: hostPermissions,
    web_accessible_resources: [
      {
        resources: ['icon/*', 'verification_icon/*'],
        matches: ['http://*/*', 'https://*/*'],
      },
    ],
  },
});