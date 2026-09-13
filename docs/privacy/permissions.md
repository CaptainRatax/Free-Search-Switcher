# Permissions and website access

Free Search Switcher requests the `storage` API permission and permission to run its content script on seven specific HTTPS search-engine origins. Website access applies to pages across those origins, not only URLs that contain search results.

The production manifests for Chromium and Firefox use the same API permission and content-script matches. They do not request access to all websites.

## `storage`

| Permission | Why it is needed |
| --- | --- |
| `storage` | Save preferred engines, custom engine definitions, processed custom icons, the settings schema version, and the first-install onboarding marker on your device. Notify open supported pages when saved settings change. |

The implementation uses `storage.local`. It does not use browser sync storage. Submitted queries and current-page URLs are not written to storage.

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

Both production manifests also expose the bundled `engine-icons/*.png` images to these seven origins through `web_accessible_resources`. This allows the injected interface to show its packaged engine icons; it is not permission to load remote icons.

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

The toolbar action opens the settings page through `runtime.openOptionsPage()`. Engine switching uses page navigation in the current tab. These actions do not require the `tabs` permission.

If website access has been withheld in your browser, the in-page controls may not appear. Review access for the affected supported engine in your browser's extension manager, then reload the search page. See [Troubleshooting](/troubleshooting.md).

For data-handling details, read [Privacy in everyday use](/privacy/privacy.md) and the [Privacy Policy](/privacy/privacy-policy.md). Contributors should audit generated **production** manifests: WXT development builds can include additional access for development tooling.
