export const BUILT_IN_ENGINE_ORDER = Object.freeze([
  'ecosia',
  'startpage',
  'duckduckgo',
  'qwant',
  'bing',
  'brave',
  'google',
]);

export const BUILT_IN_ENGINES = Object.freeze([
  {
    id: 'ecosia',
    name: 'Ecosia',
    homeUrl: 'https://www.ecosia.org/',
    searchUrlTemplate: 'https://www.ecosia.org/search?q={query}',
    queryParameters: ['q'],
    iconPath: '/engine-icons/ecosia.png',
    kind: 'built-in',
    modes: {
      images: { searchUrlTemplate: 'https://www.ecosia.org/images?q={query}' },
      videos: { searchUrlTemplate: 'https://www.ecosia.org/videos?q={query}' },
      news: { searchUrlTemplate: 'https://www.ecosia.org/news?q={query}' },
      // No `maps`: Ecosia's "Maps" tab is an external link to Google Maps
      // (google.com/maps/search/?api=1&query=...), a different domain entirely, not
      // a same-origin Ecosia destination. No `shopping`: Ecosia shows only an inline
      // product carousel inside Images results, not a separate navigable tab. Neither
      // of the pages above has a stable homepage without a query (verified: a bare
      // /images, /videos, or /news request returns Ecosia's own 404 page), so no
      // `homeUrl` is set for any of these modes; the plain Ecosia homepage is used
      // instead, exactly as the general fallback already does.
    },
  },
  {
    id: 'startpage',
    name: 'Startpage',
    homeUrl: 'https://www.startpage.com/',
    searchUrlTemplate: 'https://www.startpage.com/sp/search?query={query}',
    queryParameters: ['query'],
    iconPath: '/engine-icons/startpage.png',
    kind: 'built-in',
    modes: {
      images: { searchUrlTemplate: 'https://www.startpage.com/sp/search?query={query}&cat=images' },
      // Startpage's category parameter is inconsistently named: plural "images" and
      // invariant "news", but singular "video" (not "videos" — confirmed live: the
      // plural form silently falls back to the "All" web tab with no error).
      videos: { searchUrlTemplate: 'https://www.startpage.com/sp/search?query={query}&cat=video' },
      news: { searchUrlTemplate: 'https://www.startpage.com/sp/search?query={query}&cat=news' },
      // No `maps`: a live `cat=maps` request returned Startpage's own error page
      // (`/en/errors/?t=device`), and no `shopping` tab exists in Startpage's UI.
    },
  },
  {
    id: 'duckduckgo',
    name: 'DuckDuckGo',
    homeUrl: 'https://duckduckgo.com/',
    searchUrlTemplate: 'https://duckduckgo.com/?q={query}',
    queryParameters: ['q'],
    iconPath: '/engine-icons/duckduckgo.png',
    kind: 'built-in',
    modes: {
      images: { searchUrlTemplate: 'https://duckduckgo.com/?q={query}&ia=images&iax=images' },
      videos: { searchUrlTemplate: 'https://duckduckgo.com/?q={query}&ia=videos&iax=videos' },
      news: { searchUrlTemplate: 'https://duckduckgo.com/?q={query}&ia=news&iar=news' },
      maps: { searchUrlTemplate: 'https://duckduckgo.com/?q={query}&iaxm=maps' },
      // No `shopping`: DuckDuckGo has no shopping vertical tab.
    },
  },
  {
    id: 'qwant',
    name: 'Qwant',
    homeUrl: 'https://www.qwant.com/',
    searchUrlTemplate: 'https://www.qwant.com/?q={query}',
    queryParameters: ['q'],
    iconPath: '/engine-icons/qwant.png',
    kind: 'built-in',
    modes: {
      images: { searchUrlTemplate: 'https://www.qwant.com/?q={query}&t=images' },
      videos: { searchUrlTemplate: 'https://www.qwant.com/?q={query}&t=videos' },
      news: { searchUrlTemplate: 'https://www.qwant.com/?q={query}&t=news' },
      // No `maps` or `shopping`: neither tab exists in Qwant's search UI.
    },
  },
  {
    id: 'bing',
    name: 'Bing',
    homeUrl: 'https://www.bing.com/',
    searchUrlTemplate: 'https://www.bing.com/search?q={query}',
    queryParameters: ['q'],
    iconPath: '/engine-icons/bing.png',
    kind: 'built-in',
    modes: {
      images: { searchUrlTemplate: 'https://www.bing.com/images/search?q={query}', homeUrl: 'https://www.bing.com/images' },
      videos: { searchUrlTemplate: 'https://www.bing.com/videos/search?q={query}', homeUrl: 'https://www.bing.com/videos' },
      news: { searchUrlTemplate: 'https://www.bing.com/news/search?q={query}', homeUrl: 'https://www.bing.com/news' },
      maps: { searchUrlTemplate: 'https://www.bing.com/maps?q={query}', homeUrl: 'https://www.bing.com/maps' },
      shopping: { searchUrlTemplate: 'https://www.bing.com/shop/topics?q={query}' },
    },
  },
  {
    id: 'brave',
    name: 'Brave',
    homeUrl: 'https://search.brave.com/',
    searchUrlTemplate: 'https://search.brave.com/search?q={query}',
    queryParameters: ['q'],
    iconPath: '/engine-icons/brave.png',
    kind: 'built-in',
    modes: {
      images: { searchUrlTemplate: 'https://search.brave.com/images?q={query}' },
      videos: { searchUrlTemplate: 'https://search.brave.com/videos?q={query}' },
      news: { searchUrlTemplate: 'https://search.brave.com/news?q={query}' },
      maps: { searchUrlTemplate: 'https://search.brave.com/maps/search?q={query}', homeUrl: 'https://search.brave.com/maps/search' },
      // No `shopping`: Brave Search has no shopping vertical tab.
    },
  },
  {
    id: 'google',
    name: 'Google',
    homeUrl: 'https://www.google.com/',
    searchUrlTemplate: 'https://www.google.com/search?q={query}',
    queryParameters: ['q'],
    iconPath: '/engine-icons/google.png',
    kind: 'built-in',
    modes: {
      images: { searchUrlTemplate: 'https://www.google.com/search?q={query}&udm=2', homeUrl: 'https://www.google.com/imghp' },
      videos: { searchUrlTemplate: 'https://www.google.com/search?q={query}&udm=7' },
      news: { searchUrlTemplate: 'https://www.google.com/search?q={query}&tbm=nws' },
      maps: { searchUrlTemplate: 'https://www.google.com/maps/search/{query}', homeUrl: 'https://www.google.com/maps' },
      shopping: { searchUrlTemplate: 'https://www.google.com/search?q={query}&udm=3' },
    },
  },
].map(freezeEngine));

function freezeEngine(engine) {
  if (!engine.modes) {
    return Object.freeze(engine);
  }

  const modes = Object.fromEntries(
    Object.entries(engine.modes).map(([mode, capability]) => [mode, Object.freeze(capability)]),
  );
  return Object.freeze({ ...engine, modes: Object.freeze(modes) });
}

const BUILT_IN_BY_ID = new Map(BUILT_IN_ENGINES.map((engine) => [engine.id, engine]));

export function sortCustomEngines(customEngines = []) {
  return [...customEngines].sort((left, right) => {
    const orderDifference = Number(left.creationOrder) - Number(right.creationOrder);
    return orderDifference || String(left.id).localeCompare(String(right.id));
  });
}

export function getEngineById(engineId, customEngines = []) {
  if (!engineId) {
    return null;
  }

  return BUILT_IN_BY_ID.get(engineId)
    ?? customEngines.find((engine) => engine.id === engineId)
    ?? null;
}

export function getSelectableEngines(customEngines = []) {
  return [...BUILT_IN_ENGINES, ...sortCustomEngines(customEngines)];
}

export function selectQuickTarget(currentEngineId, settings) {
  const first = settings.firstPreferredEngineId;
  const second = settings.secondPreferredEngineId;

  if (!first) {
    return null;
  }

  if (currentEngineId === first) {
    return second || null;
  }

  return first;
}

export function buildEngineMenu(currentEngineId, settings) {
  const engines = getSelectableEngines(settings.customEngines);
  const engineById = new Map(engines.map((engine) => [engine.id, engine]));
  const orderedEntries = [];
  const seen = new Set([currentEngineId]);

  const addEngine = (engineId, preferenceRank = null) => {
    if (!engineId || seen.has(engineId)) {
      return;
    }

    const engine = engineById.get(engineId);
    if (!engine) {
      return;
    }

    seen.add(engineId);
    orderedEntries.push({ engine, preferenceRank });
  };

  addEngine(settings.firstPreferredEngineId, 1);
  addEngine(settings.secondPreferredEngineId, 2);
  BUILT_IN_ENGINES.forEach((engine) => addEngine(engine.id));
  sortCustomEngines(settings.customEngines).forEach((engine) => addEngine(engine.id));

  return orderedEntries;
}
