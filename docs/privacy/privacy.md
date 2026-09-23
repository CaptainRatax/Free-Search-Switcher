# Privacy in everyday use

Free Search Switcher has no analytics, telemetry, tracking, advertising, developer account, or developer server. The developer does not receive your queries, page context, or saved configuration.

## Your search stays transient

The extension reads a submitted query and recognized mode from the current supported search page only to support switching. It ignores unfinished edits. Choosing an engine navigates directly to that provider's HTTPS search URL; without a submitted query it opens the provider's homepage.

Queries, current URLs, modes, and history are never saved in local or sync storage, logged, or sent to developer services. The provider you choose processes the search under its own privacy policy. The popup's reload check uses only the supported engine ID and enabled-state snapshot, not search text or a URL.

## What is saved

| Information | Where and why |
| --- | --- |
| Global and seven site switches | Configuration in `storage.sync`; controls injection at the next page load. |
| Preferred engine IDs | Configuration in `storage.sync`; selects quick destinations. |
| Custom engine names, IDs, homepage/search templates, order, and optional icon URL strings | Configuration in `storage.sync`; builds your destinations. |
| Schema/configuration metadata | Configuration in `storage.sync`; supports normalization and upgrades. |
| First-install onboarding marker | `storage.local` only; prevents repeat onboarding on that installation. |
| Options drafts, popup state, page snapshots, reload warnings | Temporary memory only; never synchronized. |

If sync storage is unavailable, a local configuration fallback can keep the extension usable. Browser-native sync may transfer configuration through a browser account where supported and enabled. The browser provider operates that service; Free Search Switcher does not receive its contents or provide cross-browser synchronization.

Firefox and Chromium use separate sync ecosystems. Firefox for Android supports the extension and its full Settings page, but does not synchronize extension settings with Desktop Firefox through Mozilla accounts. See [MDN's platform note](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/storage/sync).

## Optional remote icons

Built-in icons are bundled. A custom **Icon URL** is an optional HTTPS string. Validation checks URL syntax without downloading an image. When an icon is rendered, the browser may contact the external image host and expose normal request information, such as its IP address, to that host. Free Search Switcher does not upload images, run a proxy, or receive those requests.

Without a usable image the engine shows its first letter and remains functional. Upgrading from version 1 preserves custom engines and preferences but removes legacy uploaded icon data from the migrated configuration.

## Your controls

The popup saves changes immediately. Full Settings keeps all edits in a draft until **Save changes**; **Cancel** restores saved values. Global/site injection settings take effect on reload. Turning off a site's injection never removes that engine as a destination.

You can delete custom engines and their icon URLs, clear preferences, manage browser sync, or remove the extension. Browser-provider sync controls determine what happens to synchronized copies; uninstalling on one device does not necessarily remove them everywhere. There is no retained search history to delete.

Read the complete [Privacy Policy](/privacy/privacy-policy.md) and [permission reference](/privacy/permissions.md).
