# Mozilla Firefox

<div class="install-buttons"><a class="install-button install-button--primary" href="https://addons.mozilla.org/en-US/firefox/addon/free-search-switcher/" target="_blank" rel="noopener">Install from Firefox Add-ons <span>Mozilla Firefox</span></a></div>

Firefox Desktop is the primary target for Free Search Switcher 2.0.0; Firefox for Android remains fully supported. The Firefox build uses Manifest V3 and declares Firefox **140.0 or newer on desktop** and **142.0 or newer on Android**. Desktop and Android share the same packaged extension.

## Settings and switching

On desktop, the toolbar action opens a compact popup with a global switch, both preferred-engine selectors, and **Open Settings**. Popup changes save immediately. Its reload warning compares saved state with the supported page's state when loaded; reverting the toggle clears an unnecessary warning. Manage the extension through `about:addons`.

Full Settings keeps every edit in a draft until **Save changes**; **Cancel** restores saved values. Global and individual site switches determine injection on the next page load, without removing destinations. [Read the settings guide](/configuration/settings.md).

![Free Search Switcher running in Firefox on Bing results for aurora borealis, with its real engine menu open and Google marked as the first preference](../assets/screenshots/firefox-engine-menu.png)

*The packaged Firefox extension in a clean profile. The dark control and menu reflect the browser's colour preference; Bing is omitted as the current engine.*

## Why Firefox mentions search terms

The manifest includes a required `searchTerms` data declaration. Choosing a destination transfers the submitted query to that search provider in its HTTPS URL, which is the extension’s core function. The developer does not receive the query, and the extension does not store it.

This declaration is separate from the `storage` API permission and seven static search-site matches. Firefox’s prompt wording can vary by version. See [Permissions](/privacy/permissions.md), [Privacy explained](/privacy/privacy.md), and the [Privacy Policy](/privacy/privacy-policy.md).

## Firefox for Android

Use the extension action in Firefox's **Add-ons** menu to access the full Settings page. Android does not depend on the desktop popup; where a popup is presented, it gives simple Settings access. The full page supports global/site switches, preferences, custom engines, HTTPS icon URLs, and Save/Cancel.

The interface adapts to a narrow viewport and coarse pointers with larger touch controls. Depending on the search site, switching controls can occupy a safe inline slot, a header gap, or reserved space below the search form. The menu fits within the available viewport and can open upward.

There is no mobile appearance setting. Layout and light/dark styling adapt automatically. Google’s mobile responses can use legacy Images/Videos URL parameters; the Google adapter recognises both current and legacy forms. Google may redirect a Shopping search to web results on Firefox for Android.

[Preview Settings at a narrow width in dark mode](../assets/screenshots/options-mobile-dark.png). This capture uses Firefox Desktop with a narrow viewport; it is not a screenshot from a physical Android device.

Check the [Firefox Add-ons listing](https://addons.mozilla.org/en-US/firefox/addon/free-search-switcher/) for availability on your Android device.

## Browser-native sync

Configuration uses `storage.sync`. Firefox Desktop can synchronize it through Mozilla browser sync when supported and enabled; the stable extension ID remains `{9b6a0b52-51a6-44e1-945d-19209156934e}`. Firefox for Android does not synchronize these extension settings with Desktop Firefox through a Mozilla account. [MDN storage.sync](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/storage/sync).

Queries, current URLs, history, modes, drafts, and reload warnings are never synchronized. The first-install marker remains local. Chromium uses a separate sync ecosystem; Free Search Switcher operates no sync server. See [Privacy](/privacy/privacy.md).

## Private windows

Firefox controls whether the extension is allowed in private windows through its add-on settings. Free Search Switcher has no separate private-window setting. If you allow it, switching still sends the submitted query to the selected provider; private mode does not change that navigation requirement.

## For contributors

The generated Firefox manifest uses module background scripts instead of Chromium’s service worker field. Build with `npm run build:firefox`; package with `npm run zip:firefox`. Temporary loading through `about:debugging` lasts until Firefox exits. See [Building and testing](/development/building.md).
