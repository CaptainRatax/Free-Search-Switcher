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

export function buildNavigationUrl(engine, submittedQuery) {
  if (typeof submittedQuery !== 'string' || !submittedQuery.trim()) {
    return engine.homeUrl;
  }

  return engine.searchUrlTemplate.replace('{query}', encodeURIComponent(submittedQuery));
}

export function buildCurrentNavigationUrl(engine, adapter, currentUrl, document) {
  let submittedQuery = null;
  try {
    submittedQuery = adapter.extractQuery(new URL(currentUrl), document);
  } catch {
    // Invalid or transient page state safely falls back to the target homepage.
  }
  return buildNavigationUrl(engine, submittedQuery);
}
