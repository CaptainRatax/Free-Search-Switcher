import { describe, expect, it } from 'vitest';
import { findSearchAnchor } from '../utils/adapters/shared.js';
import { ecosiaAdapter } from '../utils/adapters/ecosia.js';
import { googleAdapter } from '../utils/adapters/google.js';
import { qwantAdapter } from '../utils/adapters/qwant.js';
import { startpageAdapter } from '../utils/adapters/startpage.js';

function createElement({ visibility = 'visible', opacity = '1', parentElement = null } = {}) {
  const element = {
    hidden: false,
    isConnected: true,
    parentElement,
    ownerDocument: {
      defaultView: {
        getComputedStyle: () => ({ display: 'block', visibility, opacity }),
      },
    },
    closest: () => parentElement,
    getAttribute: () => null,
    getBoundingClientRect: () => ({ width: 500, height: 50 }),
    getClientRects: () => [{}],
    hasAttribute: () => false,
  };
  return element;
}

describe('adapter mount-point discovery', () => {
  it('suppresses Ecosia controls while its consent notice is visible', () => {
    const consentAction = {
      getBoundingClientRect: () => ({ width: 180, height: 48 }),
    };
    const document = {
      body: { textContent: '' },
      defaultView: {
        getComputedStyle: () => ({ display: 'block', visibility: 'visible' }),
      },
      querySelector: () => consentAction,
      querySelectorAll: () => {
        throw new Error('Consent overlays must not scan for a search form.');
      },
    };

    expect(ecosiaAdapter.findMountPoint(document)).toBeNull();
  });

  it('does not fall back to a connected but visually hidden search control', () => {
    const hiddenForm = createElement({ visibility: 'hidden' });
    const hiddenInput = createElement({ parentElement: hiddenForm });
    hiddenInput.ownerDocument.defaultView.getComputedStyle = (element) => (
      element === hiddenForm
        ? { display: 'block', visibility: 'hidden', opacity: '1' }
        : { display: 'block', visibility: 'visible', opacity: '1' }
    );
    hiddenForm.ownerDocument = hiddenInput.ownerDocument;
    const document = {
      querySelectorAll: () => [hiddenInput],
    };

    expect(findSearchAnchor(document, {
      formSelectors: ['form[role="search"]'],
      inputSelectors: ['input[name="q"]'],
    })).toBeNull();
  });

  it('suppresses Qwant controls on its anti-automation verification page', () => {
    const document = {
      body: { textContent: 'Verification Required. Slide right to secure your access.' },
      querySelector: () => null,
      querySelectorAll: () => {
        throw new Error('Challenge pages must not scan for a search form.');
      },
    };

    expect(qwantAdapter.findMountPoint(document)).toBeNull();
  });

  it('recognizes the stable Qwant DataDome challenge container', () => {
    const challenge = {};
    const document = {
      body: { textContent: '' },
      querySelector: () => challenge,
      querySelectorAll: () => {
        throw new Error('Challenge pages must not scan for a search form.');
      },
    };

    expect(qwantAdapter.findMountPoint(document)).toBeNull();
    expect(qwantAdapter.isBlockedPage(document)).toBe(true);
  });

  it('keeps ordinary Qwant error pages eligible for semantic mount discovery', () => {
    let selectorScans = 0;
    const document = {
      body: { textContent: 'The results service temporarily returned HTTP 403.' },
      querySelector: () => null,
      querySelectorAll: () => {
        selectorScans += 1;
        return [];
      },
    };

    expect(qwantAdapter.findMountPoint(document)).toBeNull();
    expect(selectorScans).toBeGreaterThan(0);
  });

  it('uses Qwant top-header free space on mobile results', () => {
    const row = { getBoundingClientRect: () => ({ top: 83, height: 32 }) };
    const logoLink = { getBoundingClientRect: () => ({ right: 129 }) };
    const menuAction = { getBoundingClientRect: () => ({ left: 342 }) };
    row.querySelector = () => menuAction;
    const logo = {
      closest: (selector) => (selector === 'div' ? row : logoLink),
    };
    const document = {
      location: { href: 'https://www.qwant.com/?q=privacy' },
      querySelector: () => logo,
    };

    const position = qwantAdapter.findMobileControlPosition(document, {
      controlHeight: 50,
      controlWidth: 98,
      viewport: { left: 0, top: 0, width: 390, height: 844 },
    });

    expect(position.placement).toBe('header-gap');
    expect(position.left).toBeGreaterThanOrEqual(137);
    expect(position.left + 98).toBeLessThanOrEqual(334);
    expect(position.top).toBe(74);
  });
});

describe('mobile layout targets', () => {
  it('reserves an inline slot inside the fixed Ecosia results form', () => {
    const input = {};
    const submit = {};
    const container = {
      querySelector: (selector) => (selector.includes('submit') ? submit : input),
    };
    const form = { querySelector: () => container };
    const document = {
      location: { href: 'https://www.ecosia.org/search?q=privacy' },
      querySelector: () => form,
    };

    expect(ecosiaAdapter.findMobileInlineSlot(document, null)).toEqual({
      before: submit,
      container,
      input,
      verticalAnchor: container,
    });
  });

  it('uses the containing Startpage header on POST result pages', () => {
    const header = { id: 'header-search-form' };
    const form = { id: 'search' };
    const anchor = {
      closest: (selector) => (selector === 'header' ? header : form),
    };

    expect(startpageAdapter.findMobileLayoutPoint(
      { location: { pathname: '/sp/search' } },
      anchor,
    )).toBe(header);
  });

  it('uses the stable Google homepage search container before the language row', () => {
    const searchContainer = { id: 'sfcnt' };
    const anchor = { closest: () => null };

    expect(googleAdapter.findMobileLayoutPoint(
      { location: { pathname: '/' }, querySelector: () => searchContainer },
      anchor,
    )).toBe(searchContainer);
  });

  it('reserves an inline slot before Google results trailing search actions', () => {
    const before = {};
    const container = {};
    before.parentElement = container;
    const input = { nextElementSibling: before, parentElement: container };
    const form = { querySelector: () => input };
    const document = {
      location: { href: 'https://www.google.com/search?q=privacy' },
      querySelector: () => form,
    };

    expect(googleAdapter.findMobileInlineSlot(document, null)).toEqual({
      before,
      container,
      input,
      verticalAnchor: form,
    });

    const spacer = {
      hasAttribute: (name) => name === 'data-free-search-switcher-spacer',
      nextElementSibling: before,
      parentElement: container,
    };
    input.nextElementSibling = spacer;

    expect(googleAdapter.findMobileInlineSlot(document, null).before).toBe(before);
  });
});
