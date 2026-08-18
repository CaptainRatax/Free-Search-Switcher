# Privacy Policy for Free Search Switcher

**Effective date:** August 18, 2026  
**Policy version:** 1.0  
**Extension version:** 0.1.0

## Overview

Free Search Switcher adds search-engine switching controls to a limited set of supported search-engine pages. It can carry the textual query from a submitted search to a search engine explicitly selected by the user. If there is no submitted query, it opens the selected engine's homepage instead.

The extension handles a small amount of information locally to provide this functionality. The extension developer does not receive stored settings, submitted queries, or current-page context. A submitted query is transmitted only to the destination search engine explicitly selected by the user, as described below. Free Search Switcher has no analytics, telemetry, advertising, user accounts, developer-operated servers, external databases, or cloud synchronization.

## Information handled by the extension

### Submitted search queries and current-page context

On the seven supported search-engine origins, Free Search Switcher processes the current page URL and limited search-page metadata to:

- Identify the current supported search engine.
- Determine whether the current page represents a submitted search.
- Extract the textual submitted query, if present, so it can be transferred only if the user later chooses another engine.
- Locate the search bar and display the extension's switching controls beside it.

For Startpage results produced through a POST submission, the extension may read non-editable hidden form metadata containing the submitted query because the query may not be present in the page URL.

This processing occurs locally and temporarily in the browser. Search queries and current-page URLs are not written to extension storage, logged, sent to the extension developer, or used to build a browsing history. Text that has merely been typed into an editable search field but has not been submitted is not transferred.

For Chrome Web Store disclosure purposes, this transient current-page processing is declared as **Website Content** and **Web History**. Website Content includes the submitted textual query and Startpage's submitted hidden form metadata. Web History here means only the URL and domain of the currently open supported search page because Chrome's user-data guidance treats handled URLs as web-browsing activity. Free Search Switcher does not request the browser history permission, access the browser history API, read or store a list of visited pages, monitor unrelated browsing, create a browsing profile, or retain this current-page information.

### Locally stored settings

Free Search Switcher stores the following information in the browser's extension-local storage:

- The first and second preferred search-engine identifiers.
- User-created custom engine definitions: a generated identifier, display name, HTTPS homepage URL, HTTPS search URL template, creation order, and an optional locally processed icon.
- A storage schema version used for future migrations.
- A marker recording that first-install onboarding has already opened.

Uploaded custom icons are processed locally in the settings page, normalized to a PNG Data URL, and stored locally. The original icon is not uploaded by the extension.

## How information is used

The information described above is used only to provide and configure Free Search Switcher's single purpose: allowing the user to switch from a supported search-engine page to a chosen built-in or custom search engine while preserving a submitted textual query when one exists.

Local settings are used to build the preferred-engine quick switch, order the engine menu, display custom engines and icons, and update controls on supported pages when the user changes their configuration.

## Information sharing and transmission

Free Search Switcher does not sell, rent, monetize, or disclose user information to the extension developer, advertisers, data brokers, analytics providers, or other unrelated third parties.

When the user explicitly selects a destination engine while viewing submitted search results, the extension places the submitted textual query into that destination's HTTPS search URL and navigates the current tab. The query is therefore transmitted to the operator of the built-in or custom search engine selected by the user. This user-initiated transfer is necessary to perform the extension's stated purpose. If no submitted query exists, the extension navigates to the destination homepage without adding an empty search.

The destination search engine processes the resulting request according to its own terms and privacy policy. Free Search Switcher does not control the destination provider's collection, retention, or use of information. Preferred-engine settings, custom-engine definitions, and custom icons are not transmitted to the selected provider by the extension.

In Firefox, the manifest declares required `searchTerms` data handling. This declaration refers only to the direct, user-initiated transfer described above: the submitted text goes to the search engine the user selects so that engine can perform the requested search. It is not sent through the extension developer or another intermediary, and the extension does not retain it.

## Storage and retention

Settings are stored with the browser's `storage.local` extension API on the user's device. They remain there until the user changes or deletes them, resets the relevant configuration, or removes the extension and its local data through the browser. Submitted queries and current-page context are transient and are not retained by Free Search Switcher.

Free Search Switcher does not use external databases or cloud backups. Browser-level backup, device-management, or diagnostic behavior is controlled by the browser vendor or device administrator rather than by this extension.

## Permissions

Free Search Switcher requests only the following access:

### `storage`

This permission stores preferred-engine selections, custom-engine definitions, processed custom icons, the schema version, and the first-install onboarding marker locally. It also allows open supported pages to respond when these settings change.

### Access to seven supported HTTPS search-engine origins

The extension's content script is statically limited to:

- `https://www.ecosia.org/*`
- `https://www.startpage.com/*`
- `https://duckduckgo.com/*`
- `https://www.qwant.com/*`
- `https://www.bing.com/*`
- `https://search.brave.com/*`
- `https://www.google.com/*`

This access is required to identify the supported engine, determine the submitted textual query, locate the search bar, and inject or update the switching controls. Free Search Switcher does not request access to all websites and does not inject controls into custom-engine or unrelated websites.

The extension does not request access to browser history, tabs, cookies, bookmarks, web requests, downloads, the clipboard, or arbitrary HTTP or HTTPS websites.

Firefox desktop 140 and Firefox for Android 142 are the minimum supported versions because those releases provide Firefox's built-in data-consent handling for the manifest declaration described above.

## Remote code and external services

All executable JavaScript and runtime assets are included in the extension package. Free Search Switcher does not download or execute remote JavaScript or WebAssembly, load remote script modules, or use `eval`, `Function`, or similar dynamic code execution.

Built-in engine icons are bundled with the extension. Custom icons are supplied and processed locally by the user. The extension does not use analytics, telemetry, advertising, tracking pixels, remote APIs, or remotely hosted runtime assets.

## Security

Built-in and custom navigation targets must use HTTPS. Custom search templates are validated before they are saved, must contain exactly one literal `{query}` placeholder, and cannot place the placeholder in the URL authority. Uploaded icons are type- and size-checked and processed locally.

No method of software operation or network transmission can be guaranteed to be completely secure. Users should review the privacy practices of any search engine they choose as a destination.

## User choices and control

Users may:

- Use the extension with no preferred engine.
- Change or clear preferred-engine selections at any time.
- Add, edit, or delete custom engines and their locally stored icons.
- Remove the extension and its extension-local data through the browser.

Deleting a custom engine also removes it from any preferred-engine selection according to the extension's preference rules.

## Chrome Web Store Limited Use

Free Search Switcher's use and transfer of information complies with the Chrome Web Store User Data Policy, including the Limited Use requirements. Information is used only as necessary to provide the extension's prominent, user-facing search-switching functionality.

## Changes to this policy

This policy may be updated if the extension's functionality, data handling, or legal requirements change. Material changes will be documented in the repository, and the effective date at the top of this policy will be updated. The version published with the extension should be read as the current policy.

## Contact

For privacy questions or concerns, open an issue in the project's GitHub repository:

https://github.com/CaptainRatax/Free-Search-Switcher/issues

GitHub issues are public. Do not include search queries or other sensitive or personal information in an issue.
