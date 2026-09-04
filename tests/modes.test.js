import { describe, expect, it } from 'vitest';
import { ENGINE_ADAPTERS } from '../utils/adapters/index.js';
import { BUILT_IN_ENGINES } from '../utils/engines.js';
import { DEFAULT_SEARCH_MODE, SEARCH_MODES } from '../utils/modes.js';
import { buildCurrentNavigationUrl, buildNavigationUrl } from '../utils/navigation.js';

const complexQuery = 'privacidade café & "pesquisa livre" 世界';
const adapterById = new Map(ENGINE_ADAPTERS.map((adapter) => [adapter.id, adapter]));

function expectedTemplateFor(engine, mode) {
  const capability = mode !== 'web' ? engine.modes?.[mode] : null;
  return capability?.searchUrlTemplate ?? engine.searchUrlTemplate;
}

function expectedHomeFor(engine, mode) {
  const capability = mode !== 'web' ? engine.modes?.[mode] : null;
  return capability?.homeUrl ?? engine.homeUrl;
}

describe('SEARCH_MODES', () => {
  it('always includes web as the implicit default fallback mode', () => {
    expect(SEARCH_MODES).toContain('web');
    expect(DEFAULT_SEARCH_MODE).toBe('web');
  });
});

describe('destination URL construction for every built-in engine and mode', () => {
  for (const destination of BUILT_IN_ENGINES) {
    for (const mode of SEARCH_MODES) {
      it(`${destination.id} + ${mode}: uses the mode template when supported, otherwise web`, () => {
        const url = buildNavigationUrl(destination, complexQuery, mode);
        const expected = expectedTemplateFor(destination, mode)
          .replace('{query}', encodeURIComponent(complexQuery));
        expect(url).toBe(expected);
      });

      it(`${destination.id} + ${mode}: opens a stable mode homepage when available, otherwise the normal homepage`, () => {
        expect(buildNavigationUrl(destination, null, mode)).toBe(expectedHomeFor(destination, mode));
        expect(buildNavigationUrl(destination, '   ', mode)).toBe(expectedHomeFor(destination, mode));
      });
    }
  }
});

describe('explicit compatibility-matrix assertions (guards against data-entry mistakes)', () => {
  const byId = (id) => BUILT_IN_ENGINES.find((engine) => engine.id === id);
  const encoded = encodeURIComponent(complexQuery);

  it('Bing supports images, videos, news, maps, and shopping', () => {
    const bing = byId('bing');
    expect(buildNavigationUrl(bing, complexQuery, 'images')).toBe(`https://www.bing.com/images/search?q=${encoded}`);
    expect(buildNavigationUrl(bing, complexQuery, 'videos')).toBe(`https://www.bing.com/videos/search?q=${encoded}`);
    expect(buildNavigationUrl(bing, complexQuery, 'news')).toBe(`https://www.bing.com/news/search?q=${encoded}`);
    expect(buildNavigationUrl(bing, complexQuery, 'maps')).toBe(`https://www.bing.com/maps?q=${encoded}`);
    expect(buildNavigationUrl(bing, complexQuery, 'shopping')).toBe(`https://www.bing.com/shop/topics?q=${encoded}`);
    expect(buildNavigationUrl(bing, null, 'images')).toBe('https://www.bing.com/images');
    expect(buildNavigationUrl(bing, null, 'shopping')).toBe('https://www.bing.com/');
  });

  it('Brave supports images, videos, news, and maps but not shopping', () => {
    const brave = byId('brave');
    expect(buildNavigationUrl(brave, complexQuery, 'images')).toBe(`https://search.brave.com/images?q=${encoded}`);
    expect(buildNavigationUrl(brave, complexQuery, 'maps')).toBe(`https://search.brave.com/maps/search?q=${encoded}`);
    expect(buildNavigationUrl(brave, complexQuery, 'shopping')).toBe(`https://search.brave.com/search?q=${encoded}`);
    expect(buildNavigationUrl(brave, null, 'maps')).toBe('https://search.brave.com/maps/search');
    expect(buildNavigationUrl(brave, null, 'images')).toBe('https://search.brave.com/');
  });

  it('DuckDuckGo supports images, videos, news, and maps but not shopping', () => {
    const ddg = byId('duckduckgo');
    expect(buildNavigationUrl(ddg, complexQuery, 'images')).toBe(`https://duckduckgo.com/?q=${encoded}&ia=images&iax=images`);
    expect(buildNavigationUrl(ddg, complexQuery, 'news')).toBe(`https://duckduckgo.com/?q=${encoded}&ia=news&iar=news`);
    expect(buildNavigationUrl(ddg, complexQuery, 'maps')).toBe(`https://duckduckgo.com/?q=${encoded}&iaxm=maps`);
    expect(buildNavigationUrl(ddg, complexQuery, 'shopping')).toBe(`https://duckduckgo.com/?q=${encoded}`);
  });

  it('Qwant supports images, videos, and news but not maps or shopping', () => {
    const qwant = byId('qwant');
    expect(buildNavigationUrl(qwant, complexQuery, 'images')).toBe(`https://www.qwant.com/?q=${encoded}&t=images`);
    expect(buildNavigationUrl(qwant, complexQuery, 'maps')).toBe(`https://www.qwant.com/?q=${encoded}`);
    expect(buildNavigationUrl(qwant, complexQuery, 'shopping')).toBe(`https://www.qwant.com/?q=${encoded}`);
  });

  it('Startpage supports images, videos, and news but not maps or shopping', () => {
    const startpage = byId('startpage');
    expect(buildNavigationUrl(startpage, complexQuery, 'images')).toBe(`https://www.startpage.com/sp/search?query=${encoded}&cat=images`);
    // Startpage's video category is singular ("video"), unlike images ("images") and
    // news ("news") -- confirmed live; the plural form silently falls back to web.
    expect(buildNavigationUrl(startpage, complexQuery, 'videos')).toBe(`https://www.startpage.com/sp/search?query=${encoded}&cat=video`);
    expect(buildNavigationUrl(startpage, complexQuery, 'news')).toBe(`https://www.startpage.com/sp/search?query=${encoded}&cat=news`);
    expect(buildNavigationUrl(startpage, complexQuery, 'maps')).toBe(`https://www.startpage.com/sp/search?query=${encoded}`);
    expect(buildNavigationUrl(startpage, complexQuery, 'shopping')).toBe(`https://www.startpage.com/sp/search?query=${encoded}`);
  });

  it('Google supports images, videos, news, maps, and shopping via udm/tbm and a path-style maps query', () => {
    const google = byId('google');
    expect(buildNavigationUrl(google, complexQuery, 'images')).toBe(`https://www.google.com/search?q=${encoded}&udm=2`);
    expect(buildNavigationUrl(google, complexQuery, 'videos')).toBe(`https://www.google.com/search?q=${encoded}&udm=7`);
    expect(buildNavigationUrl(google, complexQuery, 'news')).toBe(`https://www.google.com/search?q=${encoded}&tbm=nws`);
    expect(buildNavigationUrl(google, complexQuery, 'shopping')).toBe(`https://www.google.com/search?q=${encoded}&udm=3`);
    expect(buildNavigationUrl(google, complexQuery, 'maps')).toBe(`https://www.google.com/maps/search/${encoded}`);
    expect(buildNavigationUrl(google, null, 'images')).toBe('https://www.google.com/imghp');
    expect(buildNavigationUrl(google, null, 'maps')).toBe('https://www.google.com/maps');
    expect(buildNavigationUrl(google, null, 'news')).toBe('https://www.google.com/');
  });

  it('Ecosia supports images, videos, and news, with no dedicated mode homepage', () => {
    const ecosia = byId('ecosia');
    expect(buildNavigationUrl(ecosia, complexQuery, 'images')).toBe(`https://www.ecosia.org/images?q=${encoded}`);
    expect(buildNavigationUrl(ecosia, complexQuery, 'videos')).toBe(`https://www.ecosia.org/videos?q=${encoded}`);
    expect(buildNavigationUrl(ecosia, complexQuery, 'news')).toBe(`https://www.ecosia.org/news?q=${encoded}`);
    expect(buildNavigationUrl(ecosia, complexQuery, 'maps')).toBe(`https://www.ecosia.org/search?q=${encoded}`);
    expect(buildNavigationUrl(ecosia, complexQuery, 'shopping')).toBe(`https://www.ecosia.org/search?q=${encoded}`);
    for (const mode of SEARCH_MODES) {
      expect(buildNavigationUrl(ecosia, null, mode)).toBe('https://www.ecosia.org/');
    }
  });
});

describe('unknown or ambiguous modes safely fall back to web', () => {
  it('treats a mode string outside SEARCH_MODES as web for construction', () => {
    const bing = BUILT_IN_ENGINES.find((engine) => engine.id === 'bing');
    const url = buildNavigationUrl(bing, complexQuery, 'not-a-real-mode');
    expect(url).toBe(`https://www.bing.com/search?q=${encodeURIComponent(complexQuery)}`);
  });

  it('treats undefined/null mode as web', () => {
    const bing = BUILT_IN_ENGINES.find((engine) => engine.id === 'bing');
    expect(buildNavigationUrl(bing, complexQuery, undefined)).toBe(
      `https://www.bing.com/search?q=${encodeURIComponent(complexQuery)}`,
    );
  });
});

describe('custom engines always use their single general template regardless of mode', () => {
  const customEngine = {
    id: 'custom-example',
    homeUrl: 'https://example.com/',
    searchUrlTemplate: 'https://example.com/search?q={query}',
  };

  it('ignores every known mode for a custom engine (no modes field)', () => {
    for (const mode of SEARCH_MODES) {
      expect(buildNavigationUrl(customEngine, complexQuery, mode)).toBe(
        `https://example.com/search?q=${encodeURIComponent(complexQuery)}`,
      );
      expect(buildNavigationUrl(customEngine, null, mode)).toBe('https://example.com/');
    }
  });
});

describe('encoding stays single-pass for every mode template shape', () => {
  it('does not double-encode a query embedded in a path segment (Google Maps)', () => {
    const google = BUILT_IN_ENGINES.find((engine) => engine.id === 'google');
    const url = buildNavigationUrl(google, complexQuery, 'maps');
    expect(url).toBe(`https://www.google.com/maps/search/${encodeURIComponent(complexQuery)}`);
    expect(url).not.toContain('%2520');
    expect(new URL(url).pathname).toContain(encodeURIComponent(complexQuery));
  });

  it('does not double-encode a query alongside extra mode query parameters (DuckDuckGo maps)', () => {
    const ddg = BUILT_IN_ENGINES.find((engine) => engine.id === 'duckduckgo');
    const url = buildNavigationUrl(ddg, complexQuery, 'maps');
    expect(new URL(url).searchParams.get('q')).toBe(complexQuery);
    expect(url).not.toContain('%2520');
  });
});

describe('source -> destination mode preservation across every built-in engine pair', () => {
  for (const source of BUILT_IN_ENGINES) {
    const sourceAdapter = adapterById.get(source.id);

    for (const mode of SEARCH_MODES) {
      if (mode !== 'web' && !source.modes?.[mode]) {
        continue; // The source engine can never actually be in this mode.
      }

      const sourceUrl = buildNavigationUrl(source, complexQuery, mode);

      for (const destination of BUILT_IN_ENGINES) {
        if (destination.id === source.id) {
          continue;
        }

        it(`${source.id} in ${mode} mode -> ${destination.id}`, () => {
          const result = buildCurrentNavigationUrl(destination, sourceAdapter, sourceUrl, {});
          const expected = expectedTemplateFor(destination, mode)
            .replace('{query}', encodeURIComponent(complexQuery));
          expect(result).toBe(expected);
        });
      }
    }
  }
});
