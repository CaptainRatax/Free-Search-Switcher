# Settings

Free Search Switcher 2.0.0 uses a full Settings page for configuration. It opens on first installation. On desktop, click the toolbar icon and choose **Open Settings** in the popup. On Firefox for Android, use the extension action in the browser menu to access Settings; the full page is the main configuration interface.

![Free Search Switcher 2.0.0 Settings showing global and site controls, preferred engines, and the page-level Save changes and Cancel buttons](../assets/screenshots/options-preferences.png)

## Save changes or Cancel

Everything you change in Settings stays in an unsaved draft until you click the page-level **Save changes** button. This includes the global switch, site switches, preferred engines, custom engine additions, edits, deletions, and icon URLs.

- **Save changes** validates the complete draft and saves it together. An accessible success message confirms completion.
- **Cancel** discards all unsaved changes and restores the latest saved configuration, including custom engines you deleted in the draft.
- The buttons are disabled when there are no unsaved changes. Leaving with unsaved changes requests the browser's normal confirmation, where supported.

If saved settings change through the popup, another Settings tab, or browser sync, a clean page refreshes automatically. A page with unsaved edits keeps your draft and shows a warning with **Reload saved settings** to load the newest configuration. There is no automatic merge; reloading the saved configuration discards the draft.

## Enable Free Search Switcher

The prominent global switch is **on** by default. Turn it off and save to prevent controls from appearing on supported pages loaded afterwards. Existing pages retain the eligibility state they had when they loaded: reload them to apply global or site changes.

## Where Free Search Switcher appears

Each built-in site has its own switch, initially **on**:

**Ecosia / Startpage / DuckDuckGo / Qwant / Bing / Brave Search / Google**

These switches control where the extension appears. They do not remove destinations or prevent an engine being preferred. For example, turn Google off, click **Save changes**, then reload Google: its controls disappear, while Google remains available in every destination selector and menu.

Custom engines are destinations only and do not have injection switches. The global switch and the current site's switch must both be on when a supported page loads for its controls to start.

## Preferred engines

| Control | Default | Effect |
| --- | --- | --- |
| **First preferred engine** | **No preferred engine** | Choose any built-in or custom engine as the usual quick destination. It appears first in the menu when it is not the current engine. |
| **Second preferred engine** | **No second preferred engine** | Available only after selecting a first preference. Choose a different engine for the return destination from the first. |
| **Continue with no preferred engine** | No action until clicked | Clears both preferred slots in the draft and retains custom engines. Click **Save changes** to keep this choice. |

Choose a first engine, optionally choose a different second, then click **Save changes**. With Ecosia first and Google second, the quick button on Ecosia goes to Google; on other supported engines it goes to Ecosia. With no preferences, use the full menu arrow.

Clearing the first preference also clears the second. Selecting the current second preference as first clears the duplicate second slot. Saved preference changes update an already-running switcher without a reload. Preferences do not change your browser's default search engine.

## Desktop popup

The popup offers the global switch, both preferred-engine selectors, and **Open Settings**. Popup changes save immediately, unlike Settings drafts. Custom engines appear in both selectors with the same preference rules.

![The desktop popup with Free Search Switcher enabled, Ecosia first, and Google second](../assets/screenshots/popup.png)

On a supported search page, **Reload page** appears when the saved global/site settings would change whether its controls run compared with page load. For a page loaded with controls enabled: off shows the warning, on clears it, and off shows it again. Reloading applies the saved state and clears the warning. Unsupported websites, and sites whose injection stays disabled, do not show a misleading warning.

## Custom search engines

**Add custom engine** opens an editor with these fields:

| Field | Requirement |
| --- | --- |
| **Display name** | Required; at most 80 characters after trimming. |
| **Home URL** | Required HTTPS homepage, used when there is no submitted query. |
| **Search URL template** | Required HTTPS URL with exactly one literal `{query}` after its hostname. |
| **Icon URL** | Optional HTTPS image URL, such as `https://example.com/icon.png`. Clear it to use the first-letter icon. |

**Apply to draft** updates only the Settings draft. Click the page-level **Save changes** to persist it. **Discard engine edit** discards that editor's pending changes; page-level **Cancel** discards the entire draft. Editing retains the custom engine's identity and creation order. Deleting a custom first preference clears both preferred slots in the draft; deleting the second clears that slot only.

URL validation does not download the image. Only its URL string is stored. When an icon is displayed, the browser may contact its external image host; Free Search Switcher does not upload or proxy images. Missing or broken icons fall back to the engine's first letter without affecting navigation. See [custom engines](/configuration/search-engines.md#custom-engines) for templates and examples.

## Browser sync

Saved configuration normally uses the browser's `storage.sync` API. Firefox Desktop can synchronize it through Mozilla browser sync; Chromium support depends on that browser's native sync service and settings. Firefox and Chromium use separate ecosystems. No Free Search Switcher account or server exists.

Firefox for Android remains fully usable with its saved settings, but does not synchronize extension settings with Desktop Firefox through a Mozilla account. See [browser support](/getting-started/browser-support.md#browser-native-sync). If sync storage is unavailable, the extension can fall back to local storage. Unsaved drafts, current pages, queries, and reload warnings are never synchronized.

## Appearance and accessibility

Settings, the popup, and injected controls follow the browser's light/dark preference, support visible keyboard focus, and adapt to narrow screens. Status and validation messages are announced through accessible regions. No manual theme setting is required.

The extension has no full-reset, import, or export control. To restore menu-only behavior, clear both preferences and save. To remove custom destinations, delete them in the draft and save. See [privacy and data handling](/privacy/privacy.md).
