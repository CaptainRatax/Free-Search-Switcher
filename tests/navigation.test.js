import { describe, expect, it } from 'vitest';
import { startpageAdapter } from '../utils/adapters/startpage.js';
import { BUILT_IN_ENGINES } from '../utils/engines.js';
import {
  buildCurrentNavigationUrl,
  buildNavigationUrl,
  extractSubmittedQuery,
} from '../utils/navigation.js';

const google = BUILT_IN_ENGINES.find((engine) => engine.id === 'google');
const complexQuery = 'privacidade café & "pesquisa livre" 世界';

describe('submitted query extraction', () => {
  it('reads a decoded submitted query from the URL', () => {
    const sourceUrl = `https://www.ecosia.org/search?q=${encodeURIComponent(complexQuery)}`;
    expect(extractSubmittedQuery(sourceUrl, ['q'])).toBe(complexQuery);
  });

  it('does not treat missing or empty parameters as submitted queries', () => {
    expect(extractSubmittedQuery('https://www.ecosia.org/', ['q'])).toBeNull();
    expect(extractSubmittedQuery('https://www.ecosia.org/search?q=', ['q'])).toBeNull();
  });

  it('uses Startpage results input only on its POST results path', () => {
    const queriedSelectors = [];
    const fakeDocument = {
      querySelector: (selector) => {
        queriedSelectors.push(selector);
        return {
          value: selector.includes('type="hidden"') ? complexQuery : 'UNSUBMITTED EDIT',
        };
      },
    };

    expect(startpageAdapter.extractQuery(new URL('https://www.startpage.com/'), fakeDocument)).toBeNull();
    expect(startpageAdapter.extractQuery(
      new URL('https://www.startpage.com/sp/search'),
      fakeDocument,
    )).toBe(complexQuery);
    expect(queriedSelectors.at(-1)).toContain('form#search-filters');
  });
});

describe('navigation URL generation', () => {
  it('reads the current SPA URL synchronously when switching', () => {
    const adapter = {
      extractQuery: (url) => extractSubmittedQuery(url, ['q']),
    };

    expect(buildCurrentNavigationUrl(
      google,
      adapter,
      `https://www.ecosia.org/search?q=${encodeURIComponent(complexQuery)}`,
      {},
    )).toBe(`https://www.google.com/search?q=${encodeURIComponent(complexQuery)}`);
    expect(buildCurrentNavigationUrl(
      google,
      adapter,
      'https://www.ecosia.org/',
      {},
    )).toBe('https://www.google.com/');
  });

  it('uses the target homepage when there is no submitted query', () => {
    expect(buildNavigationUrl(google, null)).toBe('https://www.google.com/');
    expect(buildNavigationUrl(google, '   ')).toBe('https://www.google.com/');
  });

  it('encodes spaces, accents, ampersands, quotes, and Unicode exactly once', () => {
    const target = buildNavigationUrl(google, complexQuery);
    expect(target).toBe(`https://www.google.com/search?q=${encodeURIComponent(complexQuery)}`);
    expect(new URL(target).searchParams.get('q')).toBe(complexQuery);
    expect(target).not.toContain('%2520');
  });

  it('supports custom search templates', () => {
    const custom = {
      homeUrl: 'https://example.com/',
      searchUrlTemplate: 'https://example.com/find/{query}',
    };
    expect(buildNavigationUrl(custom, 'café & tea')).toBe(
      `https://example.com/find/${encodeURIComponent('café & tea')}`,
    );
  });
});
