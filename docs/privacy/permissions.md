# Permissions and website access

Free Search Switcher requests the `storage` API permission and permission to run its content script on seven specific HTTPS search-engine origins. Website access applies to pages across those origins, not only URLs that contain search results.

The production manifests for Chromium and Firefox use the same API permission and content-script matches. They do not request access to all websites.

## `storage`

| Permission | Why it is needed |
| --- | --- |
| `storage` | Save global/site switches, preferences, ordered custom definitions with icon URL strings, and schema metadata through browser-native sync. Keep onboarding and fallback metadata local; notify open interfaces of saved changes. |

The normal configuration backend is `storage.sync`. `storage.local` remains intentional for the onboarding marker, legacy migration, fallback-backend metadata, and fallback configuration when sync storage is unavailable or a legacy configuration exceeds the migration quota. There are no competing normal settings copies. Queries, current URLs, search modes, history, drafts, and reload warnings are not synchronized; queries and current URLs are never written to either storage area.

## Supported website access

| Content-script match pattern | Supported engine |
| --- | --- |
| `https://www.ecosia.org/*` | Ecosia |
| `https://www.startpage.com/*` | Startpage |
| `https://duckduckgo.com/*` | DuckDuckGo |
| `https://www.qwant.com/*` | Qwant |
| `https://www.bing.com/*` | Bing |
| `https://search.brave.com/*` | Brave Search |
| `https://www.google.com/*` | Google |

This access lets the extension read the current supported URL, identify a submitted textual query and search mode, inspect the relevant search-page structure, and display its controls beside the search bar. For Startpage POST results, the submitted query may be read from hidden form metadata.

The exact HTTPS hostnames matter. Other domains, country-specific Google domains, HTTP pages, and unrelated websites are outside the content-script matches. Adding a custom engine saves a navigation destination; it does not grant website access to that destination or add controls there.

Both production manifests also expose the bundled `engine-icons/*.png` images to these seven origins through `web_accessible_resources`. This allows the injected interface to show its packaged engine icons; custom HTTPS icon URLs use normal browser image rendering without arbitrary custom-engine host permissions. The browser may contact the selected external image host; Free Search Switcher runs no icon proxy.

Technically, site access comes from the static `content_scripts.matches` declarations. The current generated production manifests do not have a separate `host_permissions` or `optional_host_permissions` entry, and the extension does not request further access at runtime.

## Firefox `searchTerms` declaration

The Firefox manifest includes:

```json
"data_collection_permissions": {
  "required": ["searchTerms"]
}
```

This is Firefox's data-handling declaration, separate from the `storage` API permission. It describes sending a submitted query directly to the search engine you explicitly choose. The developer does not receive the query, and the extension does not retain it.

The manifest sets Firefox desktop **140.0** and Firefox for Android **142.0** as minimum versions to support Firefox's built-in data-consent handling. Chromium has no corresponding `searchTerms` manifest declaration.

## Access the extension does not request

The production manifests do not request `tabs`, `activeTab`, `scripting`, browser history, cookies, bookmarks, web requests, downloads, clipboard access, or arbitrary HTTP/HTTPS access. There is no `<all_urls>` match.

The desktop action opens the popup. Its Settings button uses `runtime.openOptionsPage()`. The popup can query the active tab identifier, message the already-permitted content script for its page-load state, and reload that tab without broad `tabs` permission or inspecting every tab URL. Engine switching still navigates the current page. On Android the action provides simple access to full Settings.

If website access has been withheld in your browser, the in-page controls may not appear. Review access for the affected supported engine in your browser's extension manager, then reload the search page. See [Troubleshooting](/troubleshooting.md).

For data-handling details, read [Privacy in everyday use](/privacy/privacy.md) and the [Privacy Policy](/privacy/privacy-policy.md). Contributors should audit generated **production** manifests: WXT development builds can include additional access for development tooling.
