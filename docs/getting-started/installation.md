# Installation

Version 2.0.0 prioritizes Firefox Desktop, fully supports Firefox for Android, and retains Chromium compatibility. Install the published extension from your browser's store; store availability may lag the repository release. Local development builds are covered separately in [Building and testing](/development/building.md).

<div class="install-buttons">
  <a class="install-button install-button--primary" href="https://addons.mozilla.org/en-US/firefox/addon/free-search-switcher/" target="_blank" rel="noopener">Firefox Add-ons <span>Install for Mozilla Firefox</span></a>
  <a class="install-button" href="https://chromewebstore.google.com/detail/free-search-switcher/djgkkdjcommgeadcjepcdmaogklepkmp" target="_blank" rel="noopener">Chrome Web Store <span>Install for Chrome / Chromium</span></a>
</div>

## Mozilla Firefox

1. Open the [official Firefox Add-ons listing](https://addons.mozilla.org/en-US/firefox/addon/free-search-switcher/).
2. Select **Add to Firefox**, then review and confirm Firefox’s installation prompt.
3. Review website access and any search-term consent Firefox presents. The Firefox manifest declares `searchTerms` because switching sends your submitted query to the provider you choose. The developer does not receive it. See [Permissions](/privacy/permissions.md).
4. The settings page opens on first installation.

The manifest requires Firefox **140 or newer on desktop** and **142 or newer on Android**. Firefox for Android uses the same build; store availability on a particular device is determined by Firefox Add-ons. See [Firefox](/browsers/firefox.md).

## Chrome and Chromium browsers

1. Open the [official Chrome Web Store listing](https://chromewebstore.google.com/detail/free-search-switcher/djgkkdjcommgeadcjepcdmaogklepkmp) in Chrome or a Chromium browser that permits installing Chrome Web Store extensions.
2. Choose the store’s install button (**Add to Chrome** in Chrome).
3. Review the requested access and confirm installation. Website access is limited to the seven supported search origins; `storage` saves configuration using browser-native sync where supported and retains onboarding locally. See [Permissions](/privacy/permissions.md).
4. The Free Search Switcher settings page opens on first installation.
5. Optionally pin the icon from your browser’s extensions menu for easier access to the popup and Settings.

The repository explicitly supports Chrome/Chromium and Brave. Other Chromium browsers may permit the same store extension; their store access and browser-specific interface should be checked individually. See [Chromium browsers](/browsers/chromium.md).

## Set up your first switch

In the full Settings page, choose a **First preferred engine**, optionally choose a different **Second preferred engine**, and click **Save changes**. The desktop popup provides the same preferred selectors with immediate saving. On Android, use full Settings from the extension action.

You can also click **Continue with no preferred engine**. Supported search pages will show the menu arrow, so you can choose a destination each time. Custom engines, if you have any, are kept by this button. Click **Save changes** to persist the draft.

Open a supported search page and submit a neutral search such as `aurora borealis`. Click the preferred-engine icon or open the arrow menu and choose another provider. The destination opens in the same tab with your submitted query.

Global and all seven site switches default on. Save a switch change and reload affected pages to apply it; existing pages retain their eligibility at load. If a page was open before installation, reload it so the content script can attach.

[Configure settings](/configuration/settings.md) · [Use the switching controls](/usage/switching-search-engines.md)

## Update or remove

Store installations use the browser's normal update mechanism. Upgrading from version 1 preserves preferred engines, custom engines, and their order. Legacy uploaded icons become first-letter icons; add an optional HTTPS Icon URL if desired. Global/site switches default on, and valid v2 configuration is not overwritten by stale legacy data.

Manage or remove the extension through your browser. Browser-native sync may retain configuration elsewhere; use the browser's own controls to manage those copies. Firefox and Chromium sync separately. Firefox Android does not synchronize these extension settings with Desktop Firefox. See [browser support](/getting-started/browser-support.md#browser-native-sync).

Private/incognito use is controlled by your browser’s extension permissions. It is not enabled by an option inside Free Search Switcher. Review the access you want to allow in your browser’s extension manager.
