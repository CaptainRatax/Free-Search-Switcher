import { createAdapter } from './shared.js';
import { extractSubmittedQuery } from '../navigation.js';

const MAPS_PATH_QUERY = /^\/maps\/search\/([^/@]+)/;

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
  notes: 'The q URL parameter is used; generated layout classes and live input text are ignored.'
    + ' Google Maps embeds the submitted query in the path (/maps/search/{query}) instead of'
    + ' a q parameter, so it is decoded separately.',
  extractQuery(url) {
    if (url.pathname.startsWith('/maps')) {
      const pathMatch = url.pathname.match(MAPS_PATH_QUERY);
      if (!pathMatch) {
        return extractSubmittedQuery(url, ['q']);
      }
      try {
        const decoded = decodeURIComponent(pathMatch[1].replace(/\+/g, ' ')).trim();
        return decoded || null;
      } catch {
        return null;
      }
    }
    return extractSubmittedQuery(url, ['q']);
  },
  // Google serves the newer `udm` parameter to modern desktop browsers, but was
  // observed (live, with a Firefox-Android user agent) to redirect udm=2/udm=7 to the
  // legacy `tbm=isch`/`tbm=vid` parameters instead, so both forms are recognized here.
  detectMode(url) {
    if (url.pathname.startsWith('/maps')) {
      return 'maps';
    }
    if (url.pathname === '/imghp') {
      return 'images';
    }

    const udm = url.searchParams.get('udm');
    if (udm === '2') {
      return 'images';
    }
    if (udm === '7') {
      return 'videos';
    }
    if (udm === '3') {
      return 'shopping';
    }

    const tbm = url.searchParams.get('tbm');
    if (tbm === 'isch') {
      return 'images';
    }
    if (tbm === 'vid') {
      return 'videos';
    }
    if (tbm === 'nws') {
      return 'news';
    }
    return 'web';
  },
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
