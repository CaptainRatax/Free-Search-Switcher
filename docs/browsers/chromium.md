# Chromium browsers

<div class="install-buttons"><a class="install-button install-button--primary" href="https://chromewebstore.google.com/detail/free-search-switcher/djgkkdjcommgeadcjepcdmaogklepkmp" target="_blank" rel="noopener">Install from Chrome Web Store <span>Chrome / Chromium</span></a></div>

Chromium is the secondary compatibility target in Free Search Switcher 2.0.0; Firefox Desktop is primary and Firefox for Android remains fully supported. The Chromium build targets Manifest V3. Chrome and Chromium-based browsers, including Brave, are identified by the repository as supported. Chrome Web Store installation depends on the browser permitting extensions from that store; the project does not declare a Chromium minimum version or separately verify every Chromium browser.

## Open settings

Click the Free Search Switcher toolbar icon to open the popup, then choose **Open Settings** for the full configuration page. If the icon is hidden, open your browser’s extensions menu and select or pin it. In Chrome, the extension manager is `chrome://extensions`; in Brave, it is `brave://extensions`.

The popup saves global/preferred-engine changes immediately and offers a reload action when a supported page's loaded state differs. Full Settings uses a draft with **Save changes** and **Cancel**. The quick-switch button and engine menu remain beside supported search bars.

## Switching and browser sync

[Switching](/usage/switching-search-engines.md), [preferred engines](/configuration/settings.md), and [custom destinations](/configuration/search-engines.md#custom-engines) use the same implementation as Firefox. Navigation happens in the current tab. Preference changes reach already-open supported pages through storage change events.

Configuration normally uses `storage.sync`. The browser's native service may synchronize it when supported and enabled; [Chrome's storage API reference](https://developer.chrome.com/docs/extensions/reference/api/storage#sync) describes Chrome's behavior. Chromium implementations can differ. Firefox uses a separate Mozilla ecosystem, and Free Search Switcher has no cross-browser sync service. Local fallback keeps configuration usable when sync storage is unavailable.

Only configuration synchronizes: queries, current URLs, history, modes, drafts, and reload warnings never enter sync. Global/site changes require a reload; site switches do not remove destinations.

## Website access and incognito

The production manifest requests `storage` and contains static content scripts for seven exact HTTPS origins. It has no broad `host_permissions` declaration. Review the complete scope in [Permissions](/privacy/permissions.md).

If your browser restricts extension access to sites, permit access on the supported origin you want to use and reload the page. Incognito availability is controlled in the browser’s extension details, not in the extension settings.

## For contributors

The background component runs as a Manifest V3 service worker. Use `npm run build` for `.output/chrome-mv3`, or `npm run dev` for WXT’s development workflow. See [Building and testing](/development/building.md) for unpacked loading and live tests.
