# Browser support

Free Search Switcher 2.0.0 is Firefox-first. One JavaScript codebase produces two Manifest V3 packages.

| Browser target | Priority | Minimum declared version | Configuration UI |
| --- | --- | --- | --- |
| Firefox Desktop | Primary | 140.0 | Desktop popup and full Settings tab. |
| Firefox for Android | Fully supported | 142.0 | Full Settings page; the action provides simple Settings access. |
| Chrome / Chromium, including Brave | Secondary compatibility | No explicit minimum set | Desktop popup and full Settings tab. |

Desktop and Android use the same Firefox package. Use [Firefox Add-ons](https://addons.mozilla.org/en-US/firefox/addon/free-search-switcher/) for Firefox and the [Chrome Web Store](https://chromewebstore.google.com/detail/free-search-switcher/djgkkdjcommgeadcjepcdmaogklepkmp) for compatible Chromium browsers. Availability depends on the store and browser. See [Installation](/getting-started/installation.md).

There is no Safari build. Browser support does not imply support for every search hostname: controls remain limited to the [seven built-in origins](/configuration/search-engines.md).

## Browser-native sync

Saved configuration uses `storage.sync` where available. Firefox Desktop can synchronize it through Mozilla browser sync when enabled. Firefox for Android does not synchronize extension storage with the user's Mozilla account, so do not expect these settings to transfer between Android and Desktop Firefox. [MDN documents this platform limitation](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/storage/sync).

Chromium support depends on the particular browser's native service and account/settings. Chrome can synchronize configuration when its sync service is enabled. [Chrome storage documentation](https://developer.chrome.com/docs/extensions/reference/api/storage#sync).

Mozilla and Chromium ecosystems are separate. Free Search Switcher has no account or cross-browser sync service. Sync storage can retain usable configuration without active account synchronization, and local fallback is available when the storage API itself is unavailable. Only configuration is synchronized; queries, history, drafts, and temporary UI state are excluded.

## Shared switching behavior

Both packages use the same engine definitions, query transfer, preferred/custom destination rules, and responsive controls. Global/site switches take effect at page load; ordinary saved preferences can update running controls. Settings uses Save/Cancel everywhere. Desktop popup changes save immediately.

Firefox Android retains larger touch targets, narrow-screen Settings, and automatic light/dark layouts. Desktop mobile-layout automation does not replace physical-device checks of browser menus, rotation, keyboard, or TalkBack. See [Firefox](/browsers/firefox.md) and [building/testing](/development/building.md).

## Search-site limitations

Controls require a recognized visible search bar and enabled global/site settings when the page loads. Consent pages, verification challenges, dedicated map interfaces, or provider redesigns can prevent mounting independently of browser compatibility.
