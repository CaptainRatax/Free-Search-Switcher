import { createAdapter } from './shared.js';
import { extractSubmittedQuery } from '../navigation.js';

export const startpageAdapter = createAdapter({
  id: 'startpage',
  hostname: 'www.startpage.com',
  queryParameters: ['query'],
  formSelectors: [
    'form#search[role="search"][action="/sp/search"]',
    'form#search[data-testid="search"]',
    'form[role="search"]',
    'form[action*="/sp/search"]',
    'form[action*="/do/search"]',
  ],
  inputSelectors: [
    'input#q[name="query"][role="searchbox"]',
    'input#q[data-testid="q"]',
    'input[name="query"]',
    'textarea[name="query"]',
    'input[type="search"]',
  ],
  navigationBehavior: 'full-page with consent variants',
  notes: 'Results currently use POST. The initial results input is captured once only on /sp/search.',
  findMobileLayoutPoint(document, anchor) {
    if (document?.location?.pathname?.replace(/\/+$/, '') === '/sp/search') {
      return anchor?.closest?.('header') ?? anchor?.closest?.('form') ?? anchor;
    }
    return anchor?.closest?.('form') ?? anchor;
  },
  extractQuery(url, document) {
    const urlQuery = extractSubmittedQuery(url, ['query']);
    if (urlQuery) {
      return urlQuery;
    }

    if (url.pathname.replace(/\/+$/, '') !== '/sp/search') {
      return null;
    }

    const submittedInput = document?.querySelector(
      'form#search-filters[action="/sp/search"] input[type="hidden"][name="query"]',
    ) ?? document?.querySelector(
      'form[action="/sp/search"] input[type="hidden"][name="query"]',
    );
    return submittedInput?.value?.trim() ? submittedInput.value : null;
  },
});
