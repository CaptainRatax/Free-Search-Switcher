import { createAdapter } from './shared.js';

export const ecosiaAdapter = createAdapter({
  id: 'ecosia',
  hostname: 'www.ecosia.org',
  queryParameters: ['q'],
  formSelectors: [
    'form[role="search"][action="/search"]',
    'form[role="search"]',
    'form[action="/search"]',
    'form[action*="ecosia.org/search"]',
  ],
  inputSelectors: [
    'textarea[name="q"]',
    'input[name="q"]',
    'input[type="search"]',
  ],
  navigationBehavior: 'full-page with client-rendered updates possible',
  notes: 'The URL q parameter is the submitted-query source; input text is never read.',
  findMobileInlineSlot(document) {
    const locationUrl = new URL(document.location.href);
    if (!locationUrl.searchParams.has('q')) {
      return null;
    }

    const form = document.querySelector(
      'form[role="search"][action="/search"].search-form--position-bottom',
    );
    const container = form?.querySelector('.search-form__search-field');
    const before = container?.querySelector(
      '.search-form__submit[data-test-id="search-form-submit"]',
    );
    const input = container?.querySelector('[name="q"]');
    if (!container || !before || !input) {
      return null;
    }

    return {
      before,
      container,
      input,
      verticalAnchor: container,
    };
  },
  isBlockedPage(document) {
    const consentAction = document?.querySelector?.('#didomi-notice-agree-button');
    if (!consentAction) {
      return false;
    }

    const rect = consentAction.getBoundingClientRect?.();
    const style = document.defaultView?.getComputedStyle?.(consentAction);
    return Boolean(
      rect?.width > 0
      && rect?.height > 0
      && style?.display !== 'none'
      && style?.visibility !== 'hidden',
    );
  },
});
