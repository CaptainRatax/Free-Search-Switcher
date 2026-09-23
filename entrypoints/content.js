import { SearchSwitcherUi } from '../ui/search-switcher-ui.js';
import { detectEngineAdapter } from '../utils/adapters/index.js';
import { listenForSettingsChanges, loadSettings } from '../utils/storage.js';
import { defineContentScript } from 'wxt/utils/define-content-script';
import { browser } from 'wxt/browser';
import { startContentSession } from '../utils/content-session.js';

const SUPPORTED_MATCHES = [
  'https://www.ecosia.org/*',
  'https://www.startpage.com/*',
  'https://duckduckgo.com/*',
  'https://www.qwant.com/*',
  'https://www.bing.com/*',
  'https://search.brave.com/*',
  'https://www.google.com/*',
];

export default defineContentScript({
  matches: SUPPORTED_MATCHES,
  runAt: 'document_idle',
  async main(context) {
    const adapter = detectEngineAdapter(window.location.href);
    if (!adapter) {
      return;
    }

    await startContentSession({
      context,
      runtime: browser.runtime,
      adapter,
      loadSettings,
      listenForSettingsChanges,
      createUi: (settings) => new SearchSwitcherUi({ document, window, adapter, settings }),
    });
  },
});
