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
  },
  {
    id: 'startpage',
    name: 'Startpage',
    homeUrl: 'https://www.startpage.com/',
    searchUrlTemplate: 'https://www.startpage.com/sp/search?query={query}',
    queryParameters: ['query'],
    iconPath: '/engine-icons/startpage.png',
    kind: 'built-in',
  },
  {
    id: 'duckduckgo',
    name: 'DuckDuckGo',
    homeUrl: 'https://duckduckgo.com/',
    searchUrlTemplate: 'https://duckduckgo.com/?q={query}',
    queryParameters: ['q'],
    iconPath: '/engine-icons/duckduckgo.png',
    kind: 'built-in',
  },
  {
    id: 'qwant',
    name: 'Qwant',
    homeUrl: 'https://www.qwant.com/',
    searchUrlTemplate: 'https://www.qwant.com/?q={query}',
    queryParameters: ['q'],
    iconPath: '/engine-icons/qwant.png',
    kind: 'built-in',
  },
  {
    id: 'bing',
    name: 'Bing',
    homeUrl: 'https://www.bing.com/',
    searchUrlTemplate: 'https://www.bing.com/search?q={query}',
    queryParameters: ['q'],
    iconPath: '/engine-icons/bing.png',
    kind: 'built-in',
  },
  {
    id: 'brave',
    name: 'Brave',
    homeUrl: 'https://search.brave.com/',
    searchUrlTemplate: 'https://search.brave.com/search?q={query}',
    queryParameters: ['q'],
    iconPath: '/engine-icons/brave.png',
    kind: 'built-in',
  },
  {
    id: 'google',
    name: 'Google',
    homeUrl: 'https://www.google.com/',
    searchUrlTemplate: 'https://www.google.com/search?q={query}',
    queryParameters: ['q'],
    iconPath: '/engine-icons/google.png',
    kind: 'built-in',
  },
].map((engine) => Object.freeze(engine)));

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
