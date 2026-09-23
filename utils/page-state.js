import { BUILT_IN_ENGINE_ORDER } from './engines.js';

export const PAGE_STATE_MESSAGE = 'free-search-switcher:page-state';

// Memory only: no URL, query, or tab identifier belongs in configuration storage.
export function createPageState(engineId, settings) {
  const enabled = settings.enabled;
  const siteEnabled = settings.siteEnabled[engineId];
  return Object.freeze({ engineId, enabled, siteEnabled, eligible: enabled && siteEnabled });
}

export function needsPageReload(settings, pageState) {
  if (!pageState || !BUILT_IN_ENGINE_ORDER.includes(pageState.engineId)
      || typeof pageState.eligible !== 'boolean') {
    return false;
  }
  return pageState.eligible !== (settings.enabled && settings.siteEnabled[pageState.engineId]);
}
