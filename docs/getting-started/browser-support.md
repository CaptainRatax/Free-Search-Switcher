# Browser support

The current implementation uses one JavaScript codebase and produces two Manifest V3 browser targets.

| Browser target | Manifest | Minimum version declared by the project | Compatibility notes |
| --- | --- | --- | --- |
| Firefox desktop | V3 | 140.0 | Install from Firefox Add-ons. |
| Chrome / Chromium, including Brave | V3 | No `minimum_chrome_version` is set | Chrome Web Store installation requires a browser that permits extensions from that store; individual Chromium browsers may differ. |
| Firefox for Android | V3 | 142.0 | Uses the Firefox package; check Firefox Add-ons availability on your device. |

Use the [Chrome Web Store](https://chromewebstore.google.com/detail/free-search-switcher/djgkkdjcommgeadcjepcdmaogklepkmp) for the Chromium distribution and [Firefox Add-ons](https://addons.mozilla.org/en-US/firefox/addon/free-search-switcher/) for Firefox. See [Installation](/getting-started/installation.md).

The project does not provide a Safari build. A supported browser alone does not make every search domain supported: controls are limited to seven exact HTTPS origins, described in the [engine reference](/configuration/search-engines.md).

## The same controls and settings

Both builds use the same settings page, local storage, built-in engine definitions, query handling, and on-page controls. Light/dark styling follows the system/browser colour preference. Settings are local to each installed browser profile, with no browser-sync storage.

The meaningful differences are installation, Firefox’s search-term declaration, background execution, and Android’s browser menu and layout. See [Chromium browsers](/browsers/chromium.md), [Firefox](/browsers/firefox.md), and [Permissions](/privacy/permissions.md).

## Search sites can affect availability

Controls require a visible search bar that the site adapter recognises. Consent pages, verification challenges, dedicated map interfaces, or a provider redesign can prevent them appearing. This is separate from browser compatibility.
