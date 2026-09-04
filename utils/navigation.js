import { isKnownMode } from './modes.js';

export function extractSubmittedQuery(urlInput, queryParameters) {
  let url;

  try {
    url = urlInput instanceof URL ? urlInput : new URL(urlInput);
  } catch {
    return null;
  }

  for (const parameter of queryParameters) {
    if (!url.searchParams.has(parameter)) {
      continue;
    }

    const value = url.searchParams.get(parameter);
    if (value && value.trim()) {
      return value;
    }
  }

  return null;
}

function getModeCapability(engine, mode) {
  return isKnownMode(mode) ? (engine.modes?.[mode] ?? null) : null;
}

export function buildNavigationUrl(engine, submittedQuery, mode = 'web') {
  const capability = getModeCapability(engine, mode);

  if (typeof submittedQuery !== 'string' || !submittedQuery.trim()) {
    return capability?.homeUrl ?? engine.homeUrl;
  }

  const template = capability?.searchUrlTemplate ?? engine.searchUrlTemplate;
  return template.replace('{query}', encodeURIComponent(submittedQuery));
}

export function buildCurrentNavigationUrl(engine, adapter, currentUrl, document) {
  let submittedQuery = null;
  let mode = 'web';
  try {
    const url = new URL(currentUrl);
    submittedQuery = adapter.extractQuery(url, document);
    mode = adapter.detectMode(url, document);
  } catch {
    // Invalid or transient page state safely falls back to the target homepage.
  }
  return buildNavigationUrl(engine, submittedQuery, mode);
}
