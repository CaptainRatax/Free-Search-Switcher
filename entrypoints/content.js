import { SearchSwitcherUi } from '../ui/search-switcher-ui.js';
import { detectEngineAdapter } from '../utils/adapters/index.js';
import { listenForSettingsChanges, loadSettings } from '../utils/storage.js';
import { defineContentScript } from 'wxt/utils/define-content-script';

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

    const settings = await loadSettings();
    const switcherUi = new SearchSwitcherUi({
      document,
      window,
      adapter,
      settings,
    });
    switcherUi.start();

    const stopListening = listenForSettingsChanges((nextSettings) => {
      switcherUi.updateSettings(nextSettings);
    });

    context.onInvalidated(() => {
      stopListening();
      switcherUi.stop();
    });
  },
});
