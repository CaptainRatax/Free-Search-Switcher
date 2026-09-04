import { createAdapter } from './shared.js';

export const qwantAdapter = createAdapter({
  id: 'qwant',
  hostname: 'www.qwant.com',
  queryParameters: ['q'],
  formSelectors: [
    'form[data-testid="mainSearchBar"]',
    'form[role="search"]',
    'form[action="/"]',
    'form[action*="qwant.com"]',
  ],
  inputSelectors: [
    'form[data-testid="mainSearchBar"] input[name="q"][role="searchbox"]',
    'input[name="q"]',
    'textarea[name="q"]',
    'input[type="search"]',
  ],
  navigationBehavior: 'client-side navigation with consent overlay variants',
  notes: 'The q URL parameter is used so unsubmitted input contents are ignored.',
  detectMode(url) {
    const type = url.searchParams.get('t');
    return type === 'images' || type === 'videos' || type === 'news' ? type : 'web';
  },
  isBlockedPage(document) {
    if (document?.querySelector?.(
      'div[id^="ddChallengeContainer"], style[id^="ddStyleCaptchaBody"]',
    )) {
      return true;
    }

    const pageText = document?.body?.textContent ?? '';
    return pageText.includes('Verification Required')
      || pageText.includes('Slide right to secure your access');
  },
  findMobileControlPosition(document, {
    controlHeight,
    controlWidth,
    viewport,
  }) {
    const locationUrl = new URL(document.location.href);
    if (!locationUrl.searchParams.has('q')) {
      return null;
    }

    const logo = document.querySelector(
      'svg[data-testid="qwantLogoTopbar"][aria-label="Qwant"]',
    );
    const topRow = logo?.closest('div');
    const logoLink = logo?.closest('a');
    const menuAction = topRow?.querySelector('a[role="button"][title="Show menu"]');
    if (!topRow || !logoLink || !menuAction) {
      return null;
    }

    const rowRect = topRow.getBoundingClientRect();
    const logoRect = logoLink.getBoundingClientRect();
    const menuRect = menuAction.getBoundingClientRect();
    const gapStart = logoRect.right + 8;
    const gapEnd = menuRect.left - 8;
    if (gapEnd - gapStart < controlWidth) {
      return null;
    }

    const viewportRight = viewport.left + viewport.width;
    const viewportBottom = viewport.top + viewport.height;
    const left = Math.max(
      viewport.left + 8,
      Math.min(
        gapStart + ((gapEnd - gapStart - controlWidth) / 2),
        viewportRight - controlWidth - 8,
      ),
    );
    const top = Math.max(
      viewport.top + 8,
      Math.min(
        rowRect.top + ((rowRect.height - controlHeight) / 2),
        viewportBottom - controlHeight - 8,
      ),
    );

    return { left, placement: 'header-gap', top };
  },
});
