# Architecture

Free Search Switcher 2.0.0 is a Firefox-first WXT extension written in Vanilla JavaScript, HTML, and CSS. Firefox Desktop is the primary target; Firefox for Android shares the Firefox package and remains supported. Chromium is the secondary compatibility target. UI appears in a desktop popup, a full Settings tab, and beside supported search bars.

## Repository map

| Location | Responsibility |
| --- | --- |
| `wxt.config.js` | Manifest V3 configuration, permissions, bundled resources, and Firefox settings. |
| `entrypoints/background.js` | First-install onboarding; the marker stays local to each installation. |
| `entrypoints/popup/` | Immediate global/preference saves, Settings access, and active-page reload feedback; Android provides Settings access. |
| `entrypoints/content.js` | Exact-origin bootstrap, page-load eligibility snapshot, runtime messaging, and settings subscription. |
| `entrypoints/options/` | Full configuration with baseline/draft state, Save/Cancel, external-change handling, and custom engine editor. |
| `ui/search-switcher-ui.js` | Closed Shadow DOM, quick button, menu, keyboard handling, positioning, and recovery. |
| `utils/engines.js` | Built-in destinations and modes, fixed ordering, preferred quick target, and menu deduplication. |
| `utils/modes.js` | Normalized Web, Images, Videos, News, Maps, and Shopping modes. |
| `utils/navigation.js` | Submitted-query extraction and encoded destination URLs with mode/homepage fallback. |
| `utils/settings.js` | Schema version 2, defensive normalization, preferred-engine rules, and custom operations. |
| `utils/storage.js` | Browser wrapper exposing normalized load/save/status and change notifications. |
| `utils/settings-storage.js` | Sync persistence, quota-safe encoding, migration, fallback selection, and storage events. |
| `utils/validation.js` | HTTPS navigation and icon URL validation, and literal query-placeholder rules. |
| `utils/adapters/` | Exact-origin detection, search-bar selectors, submitted-query extraction, and mobile placement. |
| `public/icons/`, `public/engine-icons/` | Bundled extension and built-in engine icons. |
| `tests/` | Unit and DOM coverage of settings, storage, migration, Options, popup, lifecycle, and navigation. |
| `scripts/` | Live Chromium integration and packaged Firefox smoke tests with mobile variants. |

## Configuration and persistence

Schema version 2 adds `enabled: true` and a `siteEnabled` object with all seven built-in engine IDs set to `true`. Preferences default to `null` and custom engines to an empty array. Normalization tolerates malformed/missing input, rejects invalid custom navigation definitions, removes duplicate IDs, and clears invalid or duplicate preferred selections. An invalid optional icon URL falls back to no icon without discarding an otherwise valid engine.

Only configuration reaches `storage.sync`: schema metadata, global/site switches, preferred engine IDs, and ordered custom definitions with `iconUrl` strings. Storage internals are hidden behind load/save/change functions. Small configurations use one `freeSearchSwitcherSettings` sync item. Larger configurations use that key as a revision manifest plus `freeSearchSwitcherSettings:chunk:<revision>:<index>` records, respecting per-item UTF-8/JSON size limits. Total quota checks reject a normal save before changing its saved snapshot, with no fixed engine-count cap or silently truncated list.

If sync is unavailable, a shared local `freeSearchSwitcherStorageBackend` marker selects the single `freeSearchSwitcherSettingsV2Local` fallback record. `getSettingsStorageStatus()` exposes backend and reason. A migrated legacy list too large for total sync quota remains usable locally while the legacy backup is retained. An explicit Options Save retries that migration: once the reduced configuration fits and the sync write succeeds, it removes the fallback marker and local records so every context uses sync. Failed retries keep the saved local configuration. Ordinary quota errors in the normal sync backend do not silently switch backend. Sync remains the normal authority, with no parallel normal copy of settings.

Migration reads the legacy `freeSearchSwitcherSettings` record from `storage.local`. Existing valid v2 settings take precedence over stale v1 data. Migration preserves preferences, custom engine identities and order, supplies enabled defaults, and drops legacy `iconDataUrl` values while keeping their engines. Cleanup happens only after a successful migration write; repeating migration is safe.

The first-install `freeSearchSwitcherOnboardingOpened` marker remains in `storage.local` and is never synchronized. On installation the background checks it, records it, and opens Options; updates do not reopen onboarding. Queries, current URLs, modes, popup state, eligibility snapshots, and Options drafts are never stored or synchronized.

Firefox Desktop can use Mozilla sync, while Chromium uses the browser's own supported service. These ecosystems are separate. Firefox for Android does not synchronize extension data with the user's Mozilla account. See [MDN storage.sync](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/storage/sync).

## Settings and popup state

Options loads a persisted baseline and keeps a working draft. Every control, including custom add/edit/delete and icon changes, edits the draft only. Page-level Save validates and persists the full draft, replaces the baseline, and clears dirty state. Cancel loads the latest persisted configuration. A `beforeunload` handler warns while the draft is dirty.

Storage changes refresh a clean Options page. A dirty page retains edits and exposes an accessible external-change warning and reset action. The implementation deliberately has no distributed merge.

The desktop popup saves global and preferred settings immediately, with the same preference invariants. To decide whether the active page needs reloading, it asks the content script for its immutable load snapshot and compares that with saved settings. It does not infer a warning merely because a toggle changed, nor need the active URL, browsing history, or broad `tabs` permission. Reload uses the active tab ID. Unsupported pages without a supported snapshot show no misleading warning.

Android uses the full Options page as its main settings interface; its action popup provides simple access to that page.

## Content-script lifecycle

The content script runs at `document_idle` on seven exact HTTPS origins. It detects the adapter and loads settings, then records the detected engine, global enabled flag, that site's flag, and whether both allowed injection. Runtime messaging exposes this snapshot to the popup even if injection was disabled.

`SearchSwitcherUi` starts only for eligible loads. Later global/site changes do not create or remove a UI instance; reload/navigation applies them. Regular preference and custom-engine changes can update a running UI. WXT context invalidation removes listeners and stops the instance.

The host uses a closed Shadow DOM. Isolated styles respond to dark mode, forced colors, and viewport size. DOM APIs construct user-provided names without inserting HTML. Built-in icons use `runtime.getURL()`; custom icons use validated HTTPS URL strings, with first-letter fallback on image failure. No file upload, canvas conversion, Data URL persistence, icon proxy, or extra custom-host permission is needed.

Mutation, resize, scroll, URL, and visual viewport monitoring keep controls beside a recognized visible bar after site rendering changes. Adapters reject hidden, inert, transparent, and disconnected anchors; Ecosia consent and Qwant challenge overlays suppress mounting. Narrow layouts keep larger touch targets, engine-specific placement, and a menu that flips and clamps to the viewport.

## From a click to a destination

1. Preferences choose the quick target. The full menu omits the current engine and duplicates, places preferred engines first, then remaining built-ins in fixed order, and custom engines in creation order. Google remains the final built-in. Site-injection switches never filter destinations.
2. At the click, the adapter reads the current URL and extracts the submitted query and normalized mode.
3. The destination chooses a verified mode template or general-search fallback. Without a query, it chooses a mode homepage or normal homepage.
4. `encodeURIComponent` replaces the single `{query}` placeholder and `window.location.assign()` navigates the current tab.

Most submitted queries come from `q`; Startpage uses `query` and submitted hidden metadata for POST results. Google Maps can use `/maps/search/{query}`. Editable text is not evidence of submission. Filters, pagination, region, and SafeSearch are not copied. Custom destinations use their single general template.

Startpage's native tabs may change results without updating the mode URL, which URL-based detection cannot infer reliably. Existing provider-specific mounting and mode limitations remain documented in the [engine reference](/configuration/search-engines.md).

## Browser and privacy boundaries

Both builds use WXT's browser wrapper. Chromium runs a module background service worker; Firefox uses module background scripts. Firefox retains ID `{9b6a0b52-51a6-44e1-945d-19209156934e}`, desktop minimum `140.0`, Android minimum `142.0`, and the required `searchTerms` declaration.

Only `storage` is requested as an API permission. Content scripts and bundled icon resources remain limited to the seven built-in origins. Custom engines are navigation destinations only.

Executable code is bundled. The developer operates no account, server, sync service, icon proxy, analytics, or telemetry. Browser providers may synchronize configuration; external icon hosts may receive browser image requests. Query and page context stay transient and are never logged. Read [Privacy](/privacy/privacy.md) and [Permissions](/privacy/permissions.md) before changing these boundaries.
