# Architecture

Free Search Switcher is a small WXT extension written in Vanilla JavaScript, HTML, and CSS. Its UI lives beside supported search bars and in a settings tab. There is no popup entrypoint, browser-wide keyboard command, context-menu component, or remote service.

## Repository map

| Location | Responsibility |
| --- | --- |
| `wxt.config.js` | Shared Manifest V3 configuration, permissions, action title/icons, packaged icon access, and Firefox-specific settings. |
| `entrypoints/background.js` | First-install settings onboarding and reopening settings from the extension action. |
| `entrypoints/content.js` | Bootstrap the switcher on the seven statically matched origins and subscribe to settings changes. |
| `entrypoints/options/` | Shared onboarding/settings tab: preferred engines, custom engine editor, local icon processing. |
| `ui/search-switcher-ui.js` | Closed Shadow DOM, quick button, engine menu, keyboard handling, positioning, observers, and recovery. |
| `utils/engines.js` | Built-in destinations and mode capabilities, fixed ordering, preferred quick target, custom ordering, and menu deduplication. |
| `utils/modes.js` | The six normalized modes: Web, Images, Videos, News, Maps, and Shopping. |
| `utils/navigation.js` | Read submitted URL queries and construct encoded destination URLs with mode/homepage fallback. |
| `utils/settings.js` | Defaults, schema normalization, preferred-engine rules, and custom create/edit/delete operations. |
| `utils/storage.js` | `storage.local` load/save and local settings-change subscription. |
| `utils/validation.js` | HTTPS URL validation, literal query placeholder rules, and safe local icon Data URLs. |
| `utils/adapters/` | Exact-origin detection, per-engine search-bar selectors, submitted-query extraction, mode detection, and mobile placement helpers. |
| `public/icons/`, `public/engine-icons/` | Packaged extension branding and engine icons. |
| `assets/` | Original extension and engine icon source assets. |
| `tests/` | Vitest pure-logic tests. |
| `scripts/` | Live Chromium integration and packaged Firefox smoke tests, with mobile wrappers. |
| `docs/` | Browser-rendered Docsify documentation and documentation assets. |

## Installation and settings

The background entrypoint listens for the runtime installation event. On `reason === 'install'`, it checks the local `freeSearchSwitcherOnboardingOpened` marker, records it if absent, and calls `runtime.openOptionsPage()`. Updates do not trigger that onboarding path. Clicking the extension action also calls `runtime.openOptionsPage()`.

WXT generates `options_ui` with `open_in_tab: true` from the options HTML. The first-install page and later settings page are the same interface.

The settings object is stored under `freeSearchSwitcherSettings` with schema version `1`. Its defaults are no first preference, no second preference, and no custom engines. Normalization rejects invalid custom definitions, removes duplicate IDs, clears invalid preferences, and prevents the two preferred slots from containing the same engine. Without a first preference, a second preference cannot remain selected.

Preference changes save immediately. Custom engines save when their editor is submitted. Editing preserves a custom engine's identifier and creation order. Deleting the first preferred custom engine clears both preferred slots; deleting the second clears only that slot.

## Content-script lifecycle

The content script runs at `document_idle` on seven exact HTTPS origins. It identifies an adapter from the current URL, loads normalized settings, starts one switcher UI instance, and listens for local storage changes. WXT context invalidation removes the subscription and stops the UI.

The UI creates a host marked `data-free-search-switcher-root` with a **closed Shadow DOM**. The isolated styles follow the icon palette and respond to dark mode, forced colors, and viewport size. Engine names and custom content are constructed through DOM APIs rather than inserted as user-provided HTML. Built-in icons use `runtime.getURL()`; custom icons use locally stored Data URLs.

Mutation, resize, scroll, URL, and visual viewport monitoring keep controls attached to the current visible search bar and recover after client rendering replaces or moves it. Adapters reject hidden, inert, transparent, or disconnected anchors. Recognized Ecosia consent and Qwant challenge overlays can suppress mounting.

Desktop positioning chooses available space beside the bar. At viewport widths up to 700 CSS pixels, controls use larger touch targets and engine-specific safe placement or reserved space. The engine menu can flip upward and clamps to the visual viewport. These are automatic layout behaviors, not user-selectable appearance settings.

## From a click to a destination

1. Engine definitions and preferred slots determine the quick-switch target and menu. The menu omits the current engine, then lists the remaining preferred engines, remaining built-ins in their fixed order, and custom engines in creation order.
2. When the user selects a target, the UI reads `window.location.href` at that moment.
3. The source adapter extracts the submitted query and detects a normalized search mode.
4. The destination's declared capability selects its mode-specific template, falling back to the general search template when needed. With no submitted query, navigation uses a declared mode homepage or the engine homepage.
5. `encodeURIComponent` replaces the one literal `{query}` placeholder, and `window.location.assign()` navigates the current tab.

Filters, pagination, region, SafeSearch, and other source-specific parameters are not copied. Custom destinations use their single general template and therefore receive the Web fallback.

Most submitted queries come from URL parameter `q`; Startpage uses `query` and can fall back to hidden submitted form metadata on `/sp/search`. Google Maps also extracts a query from `/maps/search/{query}`. Editable visible search inputs are used to find the bar, not as proof of a submitted query.

Each adapter supplies URL-based mode detection. Unknown values normalize to Web. Startpage's native category tabs can change the visible mode without updating its `cat` URL parameter; the extension follows the URL mode and cannot infer that hidden change reliably. Provider-specific details and mounting limitations are documented in the [search-engine reference](/configuration/search-engines.md).

## Browser differences

Both production targets use Manifest V3 and WXT's `wxt/browser` API wrapper. Chromium's generated manifest uses a module **background service worker**; Firefox's uses module **background scripts**. Shared code handles settings and switching in both browsers.

Firefox adds its Gecko identifier, desktop minimum `140.0`, Android minimum `142.0`, and required `searchTerms` data declaration. The same Firefox package serves desktop and Android. Chromium has no explicit minimum version in the current manifest configuration. Production API access and supported content-script origins are otherwise the same.

## Privacy and security boundaries

The runtime has no remote API client or developer server. The only search transfer is user-initiated navigation to a selected destination. Search query/context is transient; only configuration and the onboarding marker use local storage. Uploaded icons are checked, decoded locally, and normalized to a 128 × 128 PNG. Generated options code can include Vite's module-preload compatibility helper, which loads referenced chunks from the local extension package.

Custom definitions require HTTPS URLs without embedded username/password credentials and exactly one literal `{query}` placeholder after the URL authority. This validation checks the format; it does not certify a destination provider's privacy or reliability. No content script is added for a custom domain.

Read [Permissions](/privacy/permissions.md), [Privacy](/privacy/privacy.md), and the [Privacy Policy](/privacy/privacy-policy.md) before changing data handling or access. For build and test commands, see [Build, load, and test](/development/building.md).
