import { extractSubmittedQuery } from '../navigation.js';
import { DEFAULT_SEARCH_MODE, isKnownMode } from '../modes.js';

function isUsable(element) {
  if (!element?.isConnected) {
    return false;
  }

  if (typeof element.getClientRects !== 'function') {
    return true;
  }

  if (element.getClientRects().length === 0) {
    return false;
  }

  const view = element.ownerDocument?.defaultView;
  let ancestor = element;
  while (ancestor) {
    const style = view?.getComputedStyle?.(ancestor);
    if (
      ancestor.hidden
      || ancestor.hasAttribute?.('inert')
      || ancestor.getAttribute?.('aria-hidden') === 'true'
      || style?.display === 'none'
      || style?.visibility === 'hidden'
      || style?.opacity === '0'
    ) {
      return false;
    }
    ancestor = ancestor.parentElement;
  }

  return true;
}

function queryFirstUsable(document, selectors) {
  for (const selector of selectors) {
    for (const element of document.querySelectorAll(selector)) {
      if (isUsable(element)) {
        return element;
      }
    }
  }

  return null;
}

export function findSearchAnchor(document, { formSelectors, inputSelectors }) {
  const input = queryFirstUsable(document, inputSelectors);
  if (input) {
    const form = input.closest('form, [role="search"]');
    const inputRect = input.getBoundingClientRect?.();
    let element = input.parentElement;
    let compactSearchBar = null;

    while (element) {
      const rect = element.getBoundingClientRect?.();
      if (
        rect
        && rect.width >= Math.max(inputRect?.width ?? 0, 180)
        && rect.height >= 32
        && rect.height <= 84
      ) {
        compactSearchBar = element;
      }

      if (element === form) {
        break;
      }
      element = element.parentElement;
    }

    return compactSearchBar ?? form ?? input.parentElement;
  }

  return queryFirstUsable(document, formSelectors);
}

export function createAdapter({
  id,
  hostname,
  queryParameters,
  formSelectors,
  inputSelectors,
  navigationBehavior,
  notes,
  extractQuery: customExtractQuery,
  detectMode: customDetectMode,
  findMobileControlPosition: customFindMobileControlPosition,
  findMobileInlineSlot: customFindMobileInlineSlot,
  findMobileLayoutPoint: customFindMobileLayoutPoint,
  isBlockedPage: customIsBlockedPage,
}) {
  return Object.freeze({
    id,
    hostname,
    queryParameters: Object.freeze([...queryParameters]),
    navigationBehavior,
    notes,
    matches(url) {
      return url.protocol === 'https:' && url.hostname === hostname;
    },
    extractQuery(url, document) {
      return customExtractQuery
        ? customExtractQuery(url, document)
        : extractSubmittedQuery(url, queryParameters);
    },
    detectMode(url, document) {
      const detected = customDetectMode?.(url, document);
      return isKnownMode(detected) ? detected : DEFAULT_SEARCH_MODE;
    },
    findMountPoint(document) {
      if (customIsBlockedPage?.(document)) {
        return null;
      }
      return findSearchAnchor(document, { formSelectors, inputSelectors });
    },
    isBlockedPage(document) {
      return Boolean(customIsBlockedPage?.(document));
    },
    findMobileControlPosition(document, context) {
      return customFindMobileControlPosition?.(document, context) ?? null;
    },
    findMobileInlineSlot(document, anchor) {
      return customFindMobileInlineSlot?.(document, anchor) ?? null;
    },
    findMobileLayoutPoint(document, anchor) {
      return customFindMobileLayoutPoint?.(document, anchor)
        ?? anchor?.closest?.('form')
        ?? anchor?.closest?.('[role="search"]')
        ?? anchor
        ?? null;
    },
  });
}
