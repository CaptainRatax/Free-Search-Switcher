import { createAdapter } from './shared.js';

export const googleAdapter = createAdapter({
  id: 'google',
  hostname: 'www.google.com',
  queryParameters: ['q'],
  formSelectors: [
    'form[role="search"][action="/search"]',
    'form#tsf[role="search"]',
    'form[role="search"]',
    'form[action="/search"]',
    'form[action*="google.com/search"]',
  ],
  inputSelectors: [
    'textarea#APjFqb[name="q"]',
    'textarea[name="q"]',
    'input[name="q"]',
    'input[type="search"]',
  ],
  navigationBehavior: 'client-side and full-page navigation with consent-page redirects',
  notes: 'The q URL parameter is used; generated layout classes and live input text are ignored.',
  findMobileInlineSlot(document) {
    const locationUrl = new URL(document.location.href);
    if (locationUrl.pathname !== '/search' || !locationUrl.searchParams.has('q')) {
      return null;
    }

    const form = document.querySelector('form#sf')
      ?? document.querySelector('form[role="search"][action="/search"]');
    const input = form?.querySelector('input[name="q"], textarea[name="q"]');
    const container = input?.parentElement;
    let before = input?.nextElementSibling;
    while (before?.hasAttribute?.('data-free-search-switcher-spacer')) {
      before = before.nextElementSibling;
    }
    if (!form || !container || !before || before.parentElement !== container) {
      return null;
    }

    return {
      before,
      container,
      input,
      verticalAnchor: form,
    };
  },
  findMobileLayoutPoint(document, anchor) {
    if (document?.location?.pathname === '/') {
      return document.querySelector?.('#sfcnt') ?? anchor?.closest?.('form') ?? anchor;
    }
    return anchor?.closest?.('form') ?? anchor;
  },
});
