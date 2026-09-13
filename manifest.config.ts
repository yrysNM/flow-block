import { defineManifest } from '@crxjs/vite-plugin'

export default defineManifest({
  manifest_version: 3,
  name: 'Website Blocker',
  short_name: 'Blocker',
  version: '1.0.0',
  description:
    'Block distracting websites and enforce daily time limits while you browse.',
  action: {
    default_title: 'Website Blocker',
    default_popup: 'src/popup/index.html',
    default_icon: {
      16: 'icons/icon16.png',
      32: 'icons/icon32.png',
      48: 'icons/icon48.png',
      128: 'icons/icon128.png',
    },
  },
  options_ui: {
    page: 'src/options/index.html',
    open_in_tab: true,
  },
  background: {
    service_worker: 'src/background/service-worker.ts',
    type: 'module',
  },
  icons: {
    16: 'icons/icon16.png',
    32: 'icons/icon32.png',
    48: 'icons/icon48.png',
    128: 'icons/icon128.png',
  },
  permissions: [
    'storage',
    'tabs',
    'webNavigation',
    'idle',
    'alarms',
    'notifications',
  ],
  web_accessible_resources: [
    {
      resources: ['src/blocked/index.html', 'src/unlock/index.html'],
      matches: ['http://*/*', 'https://*/*'],
    },
  ],
})
