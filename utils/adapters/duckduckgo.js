import { createAdapter } from './shared.js';

export const duckduckgoAdapter = createAdapter({
  id: 'duckduckgo',
  hostname: 'duckduckgo.com',
  queryParameters: ['q'],
  formSelectors: [
    'form#searchbox_homepage[role="search"][data-testid="searchbox-form"]',
    '#react-search-form form#search_form[data-testid="search-form"]',
    'form[role="search"]',
    'form[action="/"]',
    'form[action*="/html"]',
  ],
  inputSelectors: [
    'input#searchbox_input[name="q"]',
    'input#search_form_input[name="q"]',
    'input[name="q"]',
    'textarea[name="q"]',
    'input[type="search"]',
  ],
  navigationBehavior: 'client-side results navigation with full-page fallbacks',
  notes: 'The q URL parameter is stable across the homepage and results layouts.',
  detectMode(url) {
    if (url.searchParams.get('iaxm') === 'maps') {
      return 'maps';
    }

    const ia = url.searchParams.get('ia');
    return ia === 'images' || ia === 'videos' || ia === 'news' ? ia : 'web';
  },
});
