import { createAdapter } from './shared.js';

export const braveAdapter = createAdapter({
  id: 'brave',
  hostname: 'search.brave.com',
  queryParameters: ['q'],
  formSelectors: [
    'form#searchform[data-testid="searchform"]',
    'form[role="search"]',
    'form[action="/search"]',
    'form[action*="search.brave.com/search"]',
  ],
  inputSelectors: [
    'form#searchform #searchbox[name="q"]',
    'input[name="q"]',
    'textarea[name="q"]',
    'input[type="search"]',
  ],
  navigationBehavior: 'client-side navigation with full-page fallbacks',
  notes: 'The q URL parameter remains authoritative when the input is replaced dynamically.',
  detectMode(url) {
    const path = url.pathname;
    if (path.startsWith('/images')) {
      return 'images';
    }
    if (path.startsWith('/videos')) {
      return 'videos';
    }
    if (path.startsWith('/news')) {
      return 'news';
    }
    if (path.startsWith('/maps')) {
      return 'maps';
    }
    return 'web';
  },
});
