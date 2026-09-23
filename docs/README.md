<div class="page-eyebrow">The official documentation</div>

# Your search, with another perspective.

Free Search Switcher **2.0.0** is Firefox-first: Firefox Desktop is primary, Firefox for Android remains supported, and Chromium provides secondary compatibility. It adds compact controls beside the search bar on supported search websites. Choose another engine to continue **the same submitted search in your current tab**, without retyping it. Before you submit a search, the same controls take you to another engine’s homepage.

<div class="install-buttons">
  <a class="install-button install-button--primary" href="https://addons.mozilla.org/en-US/firefox/addon/free-search-switcher/" target="_blank" rel="noopener">Install from Firefox Add-ons <span>Mozilla Firefox</span></a>
  <a class="install-button" href="https://chromewebstore.google.com/detail/free-search-switcher/djgkkdjcommgeadcjepcdmaogklepkmp" target="_blank" rel="noopener">Install from Chrome Web Store <span>Chrome / Chromium</span></a>
</div>

![Free Search Switcher quick-switch control beside the Bing search bar, with aurora borealis as a neutral demonstration query](/assets/screenshots/search-controls.png)

*The switching controls appear on the search page itself. The desktop toolbar icon opens a popup with Settings access; Android uses the full Settings page.*

<div class="feature-grid">
  <div><h3>A destination in one click</h3><p>Set a first preferred engine and an optional second for switching back. Or use the complete engine menu with no preferences.</p></div>
  <div><h3>Keep the kind of search</h3><p>Images, Videos, News, Maps, and Shopping carry across when the destination supports that category. Otherwise, you get a web search.</p></div>
  <div><h3>Make it yours</h3><p>Choose where controls appear, add custom HTTPS destinations and icon URLs, and sync configuration through supported browser services.</p></div>
</div>

## Seven engines, one menu

**Ecosia · Startpage · DuckDuckGo · Qwant · Bing · Brave · Google**

Use their supported homepages and results pages as starting points. Custom engines can be destinations; adding one does not expand the seven supported origins. See the [search engine reference](/configuration/search-engines.md) for supported domains, categories, and limitations.

## Start with your next search

1. [Install the extension](/getting-started/installation.md) in your browser.
2. Choose preferred engines in the Settings page that opens, or keep none; click **Save changes** for edits. **Cancel** discards the draft.
3. Submit a search on a supported engine, then use the quick button or menu beside its search bar.

[Learn the switching controls](/usage/switching-search-engines.md) · [Configure settings](/configuration/settings.md) · [Get help](/troubleshooting.md)

## Firefox first, with Chromium compatibility

Free Search Switcher provides Manifest V3 builds for Firefox Desktop and Android, plus Chromium browsers. The Firefox manifest requires **140 or newer on desktop** and **142 or newer on Android**. See [browser support](/getting-started/browser-support.md) for requirements and compatibility limits.

## Understand what happens to your query

Only configuration uses browser-native sync where supported; Firefox and Chromium sync separately, and Firefox Android does not synchronize these extension settings with Desktop Firefox. The extension has no analytics, telemetry, tracking, accounts, or developer server. Queries and browsing history are never saved or synchronized. Choosing a destination sends the submitted query directly to that provider in its HTTPS URL.

Custom icons store only an optional HTTPS URL. The browser may contact its external image host when displaying it; Free Search Switcher does not upload or proxy images. Global/site switches apply after reloading affected pages and never remove destinations.

Read [Privacy explained](/privacy/privacy.md), the [permission reference](/privacy/permissions.md), and the full [Privacy Policy](/privacy/privacy-policy.md).

Free Search Switcher is open source under the [MIT License](https://github.com/CaptainRatax/Free-Search-Switcher/blob/main/LICENSE). [Explore the repository](https://github.com/CaptainRatax/Free-Search-Switcher) or [help improve it](/development/building.md).
