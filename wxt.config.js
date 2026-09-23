import { defineConfig } from 'wxt';
import { readFileSync } from 'node:fs';

const { version } = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));

const SUPPORTED_MATCHES = [
  'https://www.ecosia.org/*',
  'https://www.startpage.com/*',
  'https://duckduckgo.com/*',
  'https://www.qwant.com/*',
  'https://www.bing.com/*',
  'https://search.brave.com/*',
  'https://www.google.com/*',
];

const icons = {
  16: 'icons/icon-16.png',
  32: 'icons/icon-32.png',
  48: 'icons/icon-48.png',
  96: 'icons/icon-96.png',
  128: 'icons/icon-128.png',
};

export default defineConfig({
  imports: false,
  manifestVersion: 3,
  manifest: ({ browser }) => ({
    name: 'Free Search Switcher',
    version,
    description: 'A cross-browser extension for switching between preferred and custom search engines while preserving the current search query.',
    permissions: ['storage'],
    icons,
    action: {
      default_title: 'Free Search Switcher',
      default_icon: icons,
    },
    web_accessible_resources: [
      {
        resources: ['engine-icons/*.png'],
        matches: SUPPORTED_MATCHES,
      },
    ],
    ...(browser === 'firefox'
      ? {
          browser_specific_settings: {
            gecko: {
              id: '{9b6a0b52-51a6-44e1-945d-19209156934e}',
              strict_min_version: '140.0',
              data_collection_permissions: {
                required: ['searchTerms'],
              },
            },
            gecko_android: {
              strict_min_version: '142.0',
            },
          },
        }
      : {}),
  }),
});
