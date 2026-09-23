# Privacy Policy for Free Search Switcher

**Effective date:** September 18, 2026

**Policy version:** 2.0

**Extension version:** 2.0.0

## Overview

Free Search Switcher adds switching controls to seven supported search-engine origins. A user-selected destination receives the submitted textual query in its HTTPS navigation URL, or opens its homepage when there is no submitted query.

The extension has no analytics, telemetry, tracking, ads, Free Search Switcher accounts, developer-operated servers, external developer databases, query logging, or browsing-history collection. The developer does not receive settings, searches, or current-page context. Browser-native configuration sync and optional external image requests are described below.

## Submitted queries and current-page context

On supported origins, the extension temporarily processes the current URL and limited page metadata to identify the engine, locate its search bar, and extract a submitted query and recognized search mode. Startpage POST results may expose the submitted query in non-editable hidden form metadata. Editable text that has not been submitted is not transferred.

Queries, current URLs, search modes, and browsing history are never written to `storage.local` or `storage.sync`, logged, or sent to developer services. They are not retained or synchronized. On a user-initiated switch, the submitted query and supported mode are used to construct the selected engine's HTTPS destination. Unsupported modes fall back to web search; filters, dates, pagination, regions, and other provider-specific parameters are not copied.

The popup can ask the current supported page for its engine identifier and enabled-state snapshot at load to decide whether a reload is required. That exchange does not include a query or current URL. Reload warnings and other temporary interface state are not stored or synchronized.

For Chrome Web Store disclosure purposes, transient current-page processing is declared as **Website Content** and **Web History**: it involves the submitted text, limited submitted metadata, and current supported URL/domain. Free Search Switcher does not request history permission, access the history API, collect lists of visited pages, monitor unrelated browsing, or build a browsing profile.

## Configuration and browser-native sync

The normal configuration backend is the WebExtensions `storage.sync` API. It contains only:

- Global enabled state and injection switches for the seven built-in sites.
- First and second preferred engine identifiers.
- Custom engine identifiers, names, HTTPS homepages, HTTPS search templates, optional HTTPS icon URL strings, and ordering.
- Settings schema version and configuration metadata.

Depending on browser, platform, account, and user settings, the browser provider may synchronize this configuration through the user's browser account. Free Search Switcher does not operate the sync server, create accounts, or receive synchronized settings. Firefox/Mozilla and Chromium sync ecosystems are separate; the extension implements no cross-browser sync service.

Firefox Desktop can synchronize extension settings when browser sync is supported and enabled. Firefox for Android does not synchronize these extension settings with Desktop Firefox through a Mozilla account. See [Mozilla's storage.sync documentation](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/storage/sync). Chromium availability depends on the browser's own support and settings; [Chrome's storage documentation](https://developer.chrome.com/docs/extensions/reference/api/storage#sync) describes its native behavior.

Configuration remains usable without an account. If the sync API is unavailable or cannot provide normal storage, a local fallback is used where possible. Ordinary configuration has one active storage backend, not two competing normal copies.

The `freeSearchSwitcherOnboardingOpened` marker remains in `storage.local`, recording only whether first-install Settings has opened on that installation. It is not synchronized. Options drafts, popup state, reload warnings, current-page snapshots, and temporary UI state are also excluded from sync.

## Custom icon URLs

A custom engine may have an optional HTTPS **Icon URL**. Free Search Switcher stores the URL string only. It does not accept image-file uploads, convert images to stored Data URLs, download images during URL validation, or upload/proxy images through a developer server.

When an icon is displayed, the browser may request the image from the external host chosen by the user. That host may receive normal network request information, such as the device's IP address, and handles the request under its own privacy practices. Free Search Switcher does not operate that host or receive those requests. Built-in icons are bundled with the extension. Missing or failed custom images use the engine's first letter; switching still works.

## Upgrade from version 1

Migration preserves existing preferred engines, custom engine definitions, and their order from the legacy local configuration. Global and site switches default to enabled. Old uploaded icon data is discarded from migrated configuration; the custom engine itself remains and uses a first-letter icon until an icon URL is supplied. Legacy data is removed only after successful migration, or retained locally when needed for reliable recovery. Existing valid version 2 settings take precedence over stale legacy settings.

## Information sharing and use

Configuration is used only to provide and configure search switching. Global and site settings determine whether controls start when a page loads; preferences and custom destinations configure the quick button and menu.

When you explicitly select an engine, the submitted query goes directly to that search provider as part of navigation. Its operator handles the request under its own terms and privacy policy. Free Search Switcher does not send preferred-engine configuration or the custom-engine catalog along with that navigation. Optional icon requests and browser-native configuration synchronization are separate operations described above.

In Firefox, the required `searchTerms` manifest declaration describes direct, user-initiated query transfer to the selected provider. It is not developer collection or retention. The extension does not sell, rent, monetize, or share information with advertisers, data brokers, or analytics services.

## Retention and user choices

Configuration remains until changed or removed through the extension or browser. Synchronized copies and their deletion are governed by the browser provider's sync and account controls; removing one installation should not be assumed to remove every synchronized copy. Local fallback and onboarding data can be removed through the browser's extension-data controls. There is no search-history database to clear.

You can:

- Enable or disable the extension globally or on individual built-in sites, then reload affected pages.
- Use no preferred engine, or change either preference.
- Add, edit, and delete custom destinations and icon URLs.
- Review a Settings draft before **Save changes**, or discard it with **Cancel**.
- Manage browser sync through the browser's settings.
- Remove the extension through the browser.

Desktop popup changes save immediately. Options-page changes remain in memory until saved. Deleting a custom first preference clears both preferred slots; deleting a custom second preference clears only that slot.

## Permissions and security

The production extension requests only the `storage` API permission. Content-script access is statically limited to:

- `https://www.ecosia.org/*`
- `https://www.startpage.com/*`
- `https://duckduckgo.com/*`
- `https://www.qwant.com/*`
- `https://www.bing.com/*`
- `https://search.brave.com/*`
- `https://www.google.com/*`

Custom engines do not gain content scripts or arbitrary host permissions. The extension does not request `<all_urls>`, broad `tabs` access, history, cookies, bookmarks, web requests, downloads, or clipboard access. The popup uses an active tab identifier for content-script messaging and reloading without requesting access to all tab URLs.

Executable JavaScript is included in the extension package. The extension does not fetch or execute remote code. Built-in and custom navigation requires HTTPS; custom templates require exactly one literal `{query}` after the hostname and reject embedded credentials. Optional icon URLs are checked for valid HTTPS syntax. Format checks do not guarantee a provider's availability or privacy practices.

## Chrome Web Store Limited Use

Free Search Switcher's use and transfer of information complies with the Chrome Web Store User Data Policy, including Limited Use requirements. Information is used only as necessary for its user-facing search-switching functionality.

## Changes and contact

Material changes to data handling are documented in the repository and reflected in this policy's effective date. Read the policy shipped with your installed version.

For privacy questions, open an issue in the [project repository](https://github.com/CaptainRatax/Free-Search-Switcher/issues). GitHub issues are public; do not include private queries, account details, or other sensitive information.
