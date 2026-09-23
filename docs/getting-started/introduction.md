# Introduction

Different search engines can give you different results for the same question. Free Search Switcher lets you move a search you have already submitted to another provider without typing the query again.

It adds two kinds of controls beside supported search bars:

- A **quick-switch button** showing your preferred destination’s icon, when a preference gives you somewhere to switch.
- A **menu arrow** for choosing any other built-in or custom engine.

The extension uses your current tab. On desktop its toolbar icon opens a popup with immediate global/preference controls and Settings access. Full Settings opens on first installation and uses Save/Cancel; it is the main configuration interface on Firefox Android. Global and per-site switches apply on the next page load.

## A submitted search is the starting point

After you submit `aurora borealis` on Bing, choosing DuckDuckGo opens a DuckDuckGo search for `aurora borealis`. When you switch from an Images search to another engine with Images support, the destination opens its Images results.

Text you have typed but **have not submitted** is ignored. If you edit the search box on a results page, switching still transfers the last submitted search. If you type on a homepage without submitting, switching opens the destination’s homepage.

Only the query and a supported search category carry across. Result filters, pages, date ranges, region, and SafeSearch parameters do not. Each destination applies its own settings and policies.

## Choose how much to configure

| Configuration | What you see |
| --- | --- |
| No preferred engine (the default) | The menu arrow on supported pages. |
| One preferred engine | A quick button to that engine on other supported engines; only the arrow when already on the preference. |
| Two preferred engines | On the first preference, a quick button to the second. Everywhere else, a quick button to the first. |

Preferences can be built-in or custom. Custom engines are destinations only; adding one does not expand the extension’s supported website origins.

## Fits into your existing browser

Free Search Switcher does not change the browser’s default search engine, address-bar search, or new-tab page. It activates only on the [seven supported HTTPS origins](/configuration/search-engines.md), when it can locate a usable search bar. Browser settings pages and unrelated websites receive no controls.

The interface follows your system’s light/dark preference and supports keyboard operation. There are no extension-wide shortcut commands or appearance settings to configure.

[Install Free Search Switcher](/getting-started/installation.md), then follow the [switching guide](/usage/switching-search-engines.md).
