# Privacy in everyday use

Free Search Switcher handles the current supported search page in your browser so you can move a submitted search to another engine. The developer does not receive your queries, page context, preferred engines, custom engine definitions, or uploaded icons.

The [Privacy Policy](/privacy/privacy-policy.md) is the formal statement of the extension's data handling. This page explains the same behavior in practical terms.

## What it reads

On the [seven supported search-engine origins](/privacy/permissions.md#supported-website-access), the extension reads the current URL to identify the engine, submitted textual query, and search mode. It inspects limited page structure to locate the search bar and place its switching controls.

Startpage can submit searches using POST, leaving the query out of the results URL. On its `/sp/search` results page, the extension can read the submitted query from a non-editable hidden form field. Google Maps searches can carry the query in the URL path.

Text you have merely typed or edited in the visible search box is not transferred. Submit that text through the search engine first if you want it to become the search that is switched.

The current query, URL, and detected mode are handled temporarily. They are not saved to extension storage, logged, or collected into a browsing history. The extension has no browser history permission and does not monitor unrelated websites.

## What stays on your device

| Locally stored information | Purpose |
| --- | --- |
| First and second preferred engine identifiers | Choose the quick-switch destination and put preferred engines first in the menu. |
| Custom engine identifier, display name, HTTPS homepage, HTTPS search template, creation order, and optional processed icon | Make your own destinations available in settings and the engine menu. |
| Storage schema version | Keep stored settings in the format expected by the extension. |
| First-install onboarding marker | Record that settings have already opened for onboarding. |

These values use the browser's `storage.local` extension API. Free Search Switcher does not use `storage.sync`, cloud synchronization, external databases, or extension-managed cloud backups. Chrome/Chromium and Firefox use the same local storage approach. Browser-level backups and managed-device behavior are controlled by the browser vendor or administrator.

Custom icons are decoded and resized in the settings page, converted to a PNG Data URL, and saved locally. The extension does not upload the original file or fetch an icon from a remote favicon service. Built-in icons are included in the extension package.

## What leaves the browser when you switch

Selecting a destination navigates the **current tab** to that engine's HTTPS URL. If the page has a submitted query, the extension includes that query in the destination search URL. A supported equivalent search mode may also be included. Without a submitted query, it opens the appropriate homepage.

This is a direct request to the engine **you select**, including a custom engine you add. Its operator receives and processes the request under its own terms and privacy policy. The request does not pass through an extension developer server. Preferred-engine settings, custom-engine definitions, and custom icons are not transmitted to the provider by the extension.

Free Search Switcher has no analytics, telemetry, advertising, user accounts, tracking pixels, remote APIs, or developer-operated services. Executable code and runtime assets are bundled in the extension; it does not download or execute remote code.

## Browser disclosures

The Chrome Web Store policy disclosure describes this transient processing as **Website Content** and **Web History**. In this context, Web History means the URL and domain of the currently open supported page, rather than access to a list of visited pages.

Firefox declares required **`searchTerms`** data handling. It describes the user-initiated transfer of submitted text to your chosen destination engine. It does not mean the developer receives or retains your searches. See [Permissions](/privacy/permissions.md#firefox-searchterms-declaration).

## Your controls

You can clear your preferred engines using **Continue with no preferred engine**, change either preference, or edit and delete custom engines from [Settings](/configuration/settings.md). Clearing preferences leaves custom engines saved. Deleting a custom engine removes its locally stored definition and icon; deleting a selected first custom preference also clears the second preference.

Settings remain until you change or delete them, or remove the extension and its local data through the browser. There is no search-history database to clear in Free Search Switcher.

For privacy questions, [open a GitHub issue](https://github.com/CaptainRatax/Free-Search-Switcher/issues). Issues are public: do not include private search terms, personal information, or browsing details. Read the [original repository policy](https://github.com/CaptainRatax/Free-Search-Switcher/blob/main/PRIVACY.md) or the [documentation Privacy Policy](/privacy/privacy-policy.md) for the full statement.
