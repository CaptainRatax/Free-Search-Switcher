export const SEARCH_MODES = Object.freeze(['web', 'images', 'videos', 'news', 'maps', 'shopping']);

export const DEFAULT_SEARCH_MODE = 'web';

export function isKnownMode(mode) {
  return SEARCH_MODES.includes(mode);
}
