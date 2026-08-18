import { bingAdapter } from './bing.js';
import { braveAdapter } from './brave.js';
import { duckduckgoAdapter } from './duckduckgo.js';
import { ecosiaAdapter } from './ecosia.js';
import { googleAdapter } from './google.js';
import { qwantAdapter } from './qwant.js';
import { startpageAdapter } from './startpage.js';

export const ENGINE_ADAPTERS = Object.freeze([
  ecosiaAdapter,
  startpageAdapter,
  duckduckgoAdapter,
  qwantAdapter,
  bingAdapter,
  braveAdapter,
  googleAdapter,
]);

export function detectEngineAdapter(urlInput) {
  let url;

  try {
    url = urlInput instanceof URL ? urlInput : new URL(urlInput);
  } catch {
    return null;
  }

  return ENGINE_ADAPTERS.find((adapter) => adapter.matches(url)) ?? null;
}

