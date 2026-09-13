# Build, load, and test the extension

The extension uses one Vanilla JavaScript codebase with WXT to produce Manifest V3 packages for Chromium and Firefox. Firefox desktop and Firefox for Android use the same Firefox build.

This page is for contributors. For normal installation, use the [official store listings](/getting-started/installation.md).

## Requirements

- **Node.js 22.13.0 or newer**, as declared in `package.json`.
- **npm** to install the extension's development dependencies.
- A Chromium-family browser for Chromium development; the live integration suite defaults to Brave on Windows.
- Firefox for Firefox development and temporary loading; geckodriver is also required for the packaged Firefox smoke tests.
- For physical Android development: Firefox for Android 142 or newer, a connected Android device with USB debugging enabled, and Android SDK Platform Tools (`adb`).

Clone the [repository](https://github.com/CaptainRatax/Free-Search-Switcher), open its root directory, and install dependencies:

```bash
npm install
```

The `postinstall` script runs `wxt prepare`. The repository has a committed npm lockfile. The extension toolchain includes WXT, Vite, ESLint, Vitest, `playwright-core`, and `web-ext`; application code uses JavaScript, HTML, and CSS.

## Development and production builds

| Command | Result |
| --- | --- |
| `npm run dev` | Start WXT development for Chrome/Chromium, using Manifest V3. |
| `npm run dev:firefox` | Start WXT development for Firefox, using Manifest V3. |
| `npm run build` | Create the production Chromium build in `.output/chrome-mv3/`. |
| `npm run build:firefox` | Create the production Firefox build in `.output/firefox-mv3/`. |
| `npm run zip` | Build and package the Chromium extension under `.output/`. |
| `npm run zip:firefox` | Build and package the Firefox extension under `.output/`, including a source archive for review workflows. |
| `npm run dev:firefox-android` | Build Firefox MV3, then run it on a connected Firefox for Android device with `web-ext`. |

The current version is `1.0.0`; the Firefox smoke test defaults to `.output/free-search-switcher-1.0.0-firefox.zip`. Build output and WXT-generated metadata are ignored by Git.

There is one manifest configuration in `wxt.config.js`. WXT generates browser-specific manifests from this configuration and the entrypoints. Both production builds use Manifest V3. Chromium runs a background service worker; Firefox uses a module background script. See [Architecture](/development/architecture.md).

## Load Chromium locally

1. Run `npm run build`.
2. Open `chrome://extensions` in Chrome or `brave://extensions` in Brave.
3. Enable **Developer mode**, then choose **Load unpacked**.
4. Select the `.output/chrome-mv3/` directory.
5. The settings tab opens for first-install onboarding. Click the extension toolbar action to reopen it later.
6. Open or reload a [supported search-engine page](/configuration/search-engines.md) and inspect the in-page switching controls.

After changing source and rebuilding, reload the extension in the browser's extension manager and reload affected search tabs. WXT's `dev` command is available for the development workflow.

## Load Firefox locally

For a WXT development session:

```bash
npm run dev:firefox
```

To inspect a production build as a temporary extension:

1. Run `npm run build:firefox`.
2. Open `about:debugging#/runtime/this-firefox`.
3. Choose **Load Temporary Add-on**.
4. Select `.output/firefox-mv3/manifest.json`.
5. Check onboarding, settings, and controls on a supported search page.

Firefox removes temporary add-ons when it exits. Use the official [Firefox Add-ons listing](https://addons.mozilla.org/en-US/firefox/addon/free-search-switcher/) for a regular installation.

## Run on a physical Android device

1. Install Firefox for Android 142 or newer and connect the device with USB debugging enabled.
2. Confirm the device is listed by `adb devices`.
3. Run:

   ```bash
   npm run dev:firefox-android
   ```

4. Approve installation and the declared access on the device.
5. Open a supported engine and inspect the touch controls. Open settings using Free Search Switcher's action in Firefox's **Add-ons** menu.

The existing script targets the release Android package `org.mozilla.firefox` and passes `--no-reload` to `web-ext`. A different Firefox channel requires that channel's package name when invoking `web-ext`. The mobile automation below uses desktop browsers with mobile layouts; it does not replace a physical-device check.

## Checks

| Command | What it checks |
| --- | --- |
| `npm run lint` | ESLint rules across JavaScript, including tests. Rules prohibit `eval`, implied eval, and `new Function`. |
| `npm test` | Vitest tests for engine ordering and quick targets, navigation and query encoding, settings invariants, custom validation, adapters, positioning, and search-mode construction/detection/fallback. |
| `npm run lint:firefox` | `web-ext lint` against `.output/firefox-mv3/`, with warnings treated as errors. Build Firefox first. |
| `npm run test:integration` | Live Chromium production-build integration checks through Playwright and the browser's DevTools endpoint. Build Chromium first. |
| `npm run test:mobile` | The same live suite with touch emulation, Android-sized viewports, and a Firefox Android user agent. |
| `npm run test:firefox` | Temporarily install the packaged Firefox build and run geckodriver/WebDriver smoke checks. Package Firefox first. |
| `npm run test:firefox:mobile` | The packaged Firefox smoke checks using a small desktop window and Firefox Android user agent. |

There is no formatting command defined in `package.json`.

### Chromium integration environment

The default executable is `C:\Program Files\BraveSoftware\Brave-Browser\Application\brave.exe`. Set `FSS_BROWSER_PATH` to another executable when necessary. The selected browser must support the script's extension-loading and DevTools command-line flags.

Example in PowerShell, with the executable path adjusted for your installation:

```powershell
$env:FSS_BROWSER_PATH = 'C:\Program Files\BraveSoftware\Brave-Browser\Application\brave.exe'
npm run build
npm run test:integration
npm run test:mobile
```

The suite starts an isolated temporary profile. It exercises onboarding, settings and icons, preferences, menu behavior, live updates, search transfer, unsubmitted edits, custom destinations, dynamic layout recovery, excluded origins, and representative search-mode switches. Mobile mode adds portrait/landscape placement and touch-target checks.

Setting `FSS_CAPTURE_SCREENSHOTS=1` enables the repository's existing screenshot capture into `docs/screenshots/`. Public documentation images should be reviewed for clean content before use.

### Firefox smoke environment

Set both executable paths before running the smoke tests. Adjust these example paths to your machine:

```powershell
$env:FSS_FIREFOX_PATH = 'C:\Program Files\Mozilla Firefox\firefox.exe'
$env:FSS_GECKODRIVER_PATH = 'C:\tools\geckodriver.exe'
npm run zip:firefox
npm run test:firefox
npm run test:firefox:mobile
```

`FSS_FIREFOX_EXTENSION` can override the default Firefox ZIP path. The tests check temporary installation, first-install settings, closed-shadow controls on Bing, submitted Unicode query transfer, Images mode transfer, ignored unsubmitted homepage text, and no controls on an unrelated origin. The mobile wrapper also checks mobile placement and control sizing.

Live suites contact the actual search engines. Consent screens, anti-bot challenges, network access, and provider layout changes can affect results. Record skipped or blocked checks explicitly instead of treating them as successful validation.

## Review the manifests

After production builds, inspect both generated `manifest.json` files. Expected API access is `storage`; content scripts and packaged engine icons are restricted to the seven supported origins. Custom engines do not add origins. Firefox additionally contains its minimum versions and required `searchTerms` declaration. See the [permission reference](/privacy/permissions.md).
