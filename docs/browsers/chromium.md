# Chromium browsers

<div class="install-buttons"><a class="install-button install-button--primary" href="https://chromewebstore.google.com/detail/free-search-switcher/djgkkdjcommgeadcjepcdmaogklepkmp" target="_blank" rel="noopener">Install from Chrome Web Store <span>Chrome / Chromium</span></a></div>

The Chromium build targets Manifest V3. Chrome and Chromium-based browsers, including Brave, are identified by the repository as supported. Chrome Web Store installation depends on the browser permitting extensions from that store; the project does not declare a Chromium minimum version or separately verify every Chromium browser.

## Open settings

Click the Free Search Switcher toolbar icon. It opens a full settings tab. If the icon is hidden, open your browser’s extensions menu and select or pin it. In Chrome, the extension manager is `chrome://extensions`; in Brave, it is `brave://extensions`.

There is no toolbar popup. The quick-switch button and full engine menu are on supported search pages beside their search bars.

## Switching and local settings

[Switching](/usage/switching-search-engines.md), [preferred engines](/configuration/settings.md), and [custom destinations](/configuration/search-engines.md#custom-engines) use the same implementation as Firefox. Navigation happens in the current tab. Preference changes reach already-open supported pages through storage change events.

Settings use `storage.local` in the current profile. They do not travel through Chrome Sync or another browser’s sync service.

## Website access and incognito

The production manifest requests `storage` and contains static content scripts for seven exact HTTPS origins. It has no broad `host_permissions` declaration. Review the complete scope in [Permissions](/privacy/permissions.md).

If your browser restricts extension access to sites, permit access on the supported origin you want to use and reload the page. Incognito availability is controlled in the browser’s extension details, not in the extension settings.

## For contributors

The background component runs as a Manifest V3 service worker. Use `npm run build` for `.output/chrome-mv3`, or `npm run dev` for WXT’s development workflow. See [Building and testing](/development/building.md) for unpacked loading and live tests.
