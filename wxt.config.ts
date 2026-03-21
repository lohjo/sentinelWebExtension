import { defineConfig } from 'wxt';

// See https://wxt.dev/api/config.html
export default defineConfig({
  srcDir: 'src',
  modules: ['@wxt-dev/module-svelte'],
  manifest: {
    name: 'FactGuard',
    permissions: ['activeTab', 'tabs', 'storage', 'windows', 'scripting'],
    host_permissions: [
      'https://natfanclub-backend-809989871890.asia-southeast1.run.app/*',
      'http://localhost:3000/*',
    ],
    web_accessible_resources: [
      {
        resources: ['icon/*', 'verification_icon/*'],
        matches: ['http://*/*', 'https://*/*'],
      },
    ],
  },
});
