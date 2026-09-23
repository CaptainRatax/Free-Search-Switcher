# Troubleshooting

Most switching issues come from the current website, a missing submitted query, browser website access, or preferred-engine configuration. Start with the symptom below.

## The toolbar icon is missing

Open the browser's extensions menu and look for **Free Search Switcher**. Pin it to the toolbar if your browser offers that option. Verify that the extension is enabled in the browser's extension manager.

On desktop, clicking the icon opens the popup; **Open Settings** opens the full configuration tab. On Firefox Android, the action provides simple Settings access. Search switching still happens beside the supported website's search bar.

If it is not installed, use the [installation guide](/getting-started/installation.md) and the official [Firefox Add-ons listing](https://addons.mozilla.org/en-US/firefox/addon/free-search-switcher/) or [Chrome Web Store listing](https://chromewebstore.google.com/detail/free-search-switcher/djgkkdjcommgeadcjepcdmaogklepkmp).

## No control appears near the search bar

1. Check that the page uses one of the [seven exact supported HTTPS hostnames](/configuration/search-engines.md#built-in-providers). Regional Google domains, alternate subdomains, unrelated websites, and custom-only sites are outside the injection list.
2. In Settings, check the global switch and that engine's switch under **Where Free Search Switcher appears**. Click **Save changes**, then reload the search page. Global/site eligibility is fixed when that page loads.
3. Wait for the page to finish loading and scroll until its search bar is visible. The control hides when the bar is outside the visible viewport.
4. Finish any website consent or verification step through the website's normal UI. Recognized Ecosia consent notices and Qwant verification challenges suppress the controls. Other challenge pages may not expose a usable search bar.
5. Check the browser's extension controls for website access and ensure Free Search Switcher can run on that supported site. See [permissions](/privacy/permissions.md) for the requested scope.
6. Reload the page, particularly if it was already open when the extension was installed, enabled, or manually reloaded.
7. Try the engine's normal homepage or web-results page to distinguish a special layout from a general problem.

Bing Maps and Brave Search Maps use interfaces the current adapters do not recognize. DuckDuckGo's separate map interface can also lack the control. The extension can navigate **to** those destinations while its control is unavailable there. Use another supported search page to switch again.

A search provider can redesign its page or present different markup for a region, device, or experiment. The extension observes changes and tries alternate search-bar selectors, but that cannot guarantee compatibility with every layout. If the checks above fail, [report the affected page](#report-a-problem).

## I see only an arrow

That is the default setup: neither preferred engine is selected. The arrow opens the full engine menu.

With only a first preference, its own website also shows just the arrow because no return destination is configured. Add a different [second preferred engine](/configuration/settings.md#preferred-engines) for a quick button on the first engine.

## Switching opens a homepage instead of search results

The extension transfers only submitted text. Typing in a homepage's search box without submitting does not count as a search. Submit first, then switch.

On a results page, the query normally comes from `q` or Startpage's `query` URL parameter. Google Maps can use its search path. Startpage POST results can provide hidden submitted-query metadata. If none of these yields a nonempty query, switching opens the destination's homepage.

A custom engine's **Home URL** is also the expected destination when there is no submitted query.

## Switching uses an earlier query

If you edited the visible search box without submitting, the extension correctly transfers the previously submitted search. Submit the new query and wait for the results before switching.

The visible text box is never used as proof that a new search was submitted. This avoids transferring unfinished edits or autocomplete text.

## Images, Videos, News, Maps, or Shopping became a web search

Check the [mode compatibility table](/configuration/search-engines.md#search-mode-compatibility). If the extension has no matching destination URL, it deliberately falls back to web while retaining the submitted query. Custom engines always use their one configured template.

On Startpage, using its own mode tabs can change the visible results without updating `cat` in the URL. The extension then sees web mode or an earlier URL mode. See [Startpage's own tabs](/configuration/search-engines.md#startpages-own-tabs).

The destination website may also redirect a requested mode to another page. On Firefox for Android, Google may redirect a Shopping search to web results; the extension cannot force the provider to serve that mode.

## Filters, region, dates, or result-page number changed

Only the submitted query and recognized mode are transferred. SafeSearch, date filters, region, pagination, and provider-specific parameters are not copied. Configure any desired filters on the destination engine after switching.

Search operators remain part of the query text, but each provider decides how to interpret them.

## An engine is missing from the menu

The current built-in engine is intentionally omitted. Preferred destinations are promoted to the top, marked **First** or **Second**, and appear only once.

Built-ins cannot be removed as destinations. Site switches control injection only, so disabling Google injection does not remove Google from the menu or preferred selectors. Apply a custom-engine editor to the draft, then click the page-level **Save changes** before expecting it on search pages. Check any validation or storage error.

## The second preferred engine selector is disabled

Choose a **First preferred engine** first. The second slot cannot exist by itself, and the two preferences must be different.

Clearing the first preference clears both. Deleting a custom first preference also clears both; deleting a custom second preference clears only the second.

## A custom engine will not save

Check each highlighted field:

- **Display name:** required, no more than 80 characters after trimming surrounding whitespace.
- **Home URL:** valid HTTPS URL without a username or password.
- **Search URL template:** valid HTTPS URL with exactly one literal `{query}` after the hostname. Encoded `%7Bquery%7D`, uppercase `{QUERY}`, missing tokens, and repeated tokens are rejected.
- **Icon URL:** optional syntactically valid HTTPS image URL. Clear it to use a letter icon. URL validation does not fetch the image.

See the [complete custom-engine rules and examples](/configuration/search-engines.md#template-rules). Format validation does not verify that a site accepts the URL or offers a working search service.

## A custom icon is rejected or shows a letter

Use an optional HTTPS image URL, such as `https://example.com/icon.png`. Image-file uploads are no longer supported. Validation checks syntax without downloading the image. The browser may contact that external host when it displays the icon; the extension provides no proxy.

A first-letter icon is the normal fallback for a missing or failed image. The engine still works. Change or clear the URL, apply the custom editor, then click **Save changes**. After upgrading from version 1, old uploaded icons use the same fallback while their engines remain intact.

## The popup says the page needs reloading

Global and site eligibility is captured when a supported page loads. A saved change does not create or remove controls in place. Click **Reload page** to apply the saved state.

For a page loaded enabled, switching off shows the warning; switching back on before reloading clears it. The warning describes the page's applied state, not just whether a toggle was touched. It is not shown on unsupported websites. If a page predates extension installation/update, manually reload it so its content script is available.

## My Settings edits disappeared or did not apply

Everything in full Settings stays in a draft until the main **Save changes**: global/site switches, preferences, custom add/edit/delete, and icon URLs. Applying the custom editor alone does not persist the page. Confirm the accessible success message before closing. **Cancel** restores saved configuration, including any draft deletions. Desktop popup controls save immediately.

If another tab, popup, or browser sync changes saved settings, a clean Settings page refreshes. A dirty page keeps your edits and shows an external-change warning. Use its reload/reset action to discard the draft and load the latest saved configuration. Saving your draft instead can replace the newer configuration; there is no automatic merge.

## Settings look different in another browser or device

Configuration uses the browser's native sync service where supported and enabled. Check the browser's account and sync settings and allow its normal synchronization interval. Firefox and Chromium are separate ecosystems. Firefox Android does not synchronize extension settings with Desktop Firefox through a Mozilla account. See [browser support](/getting-started/browser-support.md#browser-native-sync).

When sync storage itself is unavailable, the extension can keep configuration locally. That fallback does not synchronize. No queries, browsing history, drafts, or reload warnings are ever synchronized.

## Saving reports a storage limit or storage error

Configuration contains URL strings, not image bytes. The storage layer splits larger configurations within per-item sync limits, but the browser's total sync quota still applies. Shorten unusually long URLs or reduce unnecessary custom entries if the complete configuration exceeds it. A failed save keeps the existing persisted configuration and leaves the draft available for correction; do not assume an error means your changes were saved.

If the browser cannot provide sync storage, the extension can use a local fallback. A large legacy configuration that cannot migrate within total sync quota is retained locally instead of losing custom engines. Settings shows a notice when this happens. Reduce that configuration and use **Save changes** to retry migration; it stays saved locally if sync still cannot accept it. Once migration succeeds, the extension resumes using sync as its configuration backend.

## The extension does not work in private or incognito windows

Check whether your browser permits the extension to run in private/incognito windows. Browser-managed private access is separate from Free Search Switcher's settings and may need to be enabled in its extension details.

Then check the same supported-hostname, website-access, and visible-search-bar requirements as in a normal window. The extension has no private-mode toggle of its own.

## Keyboard navigation is unclear

There is no global search-switching shortcut or shortcut setting. Focus the on-page arrow with Tab, activate it with Enter or Space, then use Arrow Up/Down, Home, End, and Escape. See the [keyboard reference](/usage/switching-search-engines.md#use-the-keyboard).

## A manually loaded build stops working

Reload the build in Chromium's extension manager, or reload/reinstall the temporary add-on through Firefox's `about:debugging`, then reload the supported website. Firefox temporary add-ons need to be loaded again after a browser restart.

Use the appropriate existing build for each browser. See the [local build and loading instructions](/development/building.md). Development builds may have different runtime requirements from production builds; do not use their generated manifests as a reference for store-install permissions.

## Report a problem

Use the repository's issue tracker linked from this documentation. Include:

- Browser name and version, operating system, and extension version.
- The affected engine and whether the page is a homepage, web-results page, or a particular mode.
- Expected and actual behavior, with clear steps to reproduce.
- Whether a consent notice, verification challenge, or unusual page layout appears.
- Whether installation is from an official store or a manually loaded build.

Use a neutral demonstration query and remove account details, personal queries, and unrelated browser information from screenshots. A description of the URL format is usually enough; avoid posting a URL containing private search terms.
