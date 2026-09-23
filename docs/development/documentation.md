# Contributing to documentation

Documentation contributions can improve guides, examples, and screenshots. The site uses Docsify 4 to render Markdown directly in the browser, so changes can be previewed without a build.

## Files and navigation

- `index.html` is the Docsify shell, pinned CDN scripts, site configuration, and a small previous/next and footer plugin.
- `README.md` is the homepage; `_coverpage.md` provides the landing cover.
- `_sidebar.md` lists all user and contributor pages. Its alias makes the same sidebar available on nested routes.
- `assets/css/theme.css` gives the cover, navigation, and articles a consistent dark appearance, using the extension's mint, sage, blue accents, and system fonts. The documentation stays dark regardless of the visitor's system colour preference; the extension itself still adapts automatically.
- `assets/images/` contains the packaged 128-pixel logo and 32-pixel favicon.
- `assets/screenshots/` contains real browser captures for these guides. Existing repository screenshots in `screenshots/` remain available to the root README.
- `.nojekyll` allows GitHub Pages to serve the underscore-prefixed navigation files directly.

When adding a page, add it to `_sidebar.md` and the `documentationPages` list in `index.html`. That list also supplies explicit search-index paths and the previous/next sequence.

Use Docsify site-relative Markdown links such as `[Settings](/configuration/settings.md)`. They become hash routes beneath the current hosting location. Image paths are relative to their Markdown page: a guide one directory deep uses `![Description](../assets/screenshots/search-controls.png)`. Avoid hardcoded repository hosting prefixes. HTML asset references in `index.html` are relative to that file.

## Preview without a build

From the repository root, if Python is available:

```bash
python -m http.server 8000 --bind 127.0.0.1 --directory docs
```

Open `http://127.0.0.1:8000/`. Use an HTTP server rather than opening `index.html` through `file://`, because Docsify fetches the Markdown files.

The site loads Docsify, search, image zoom, code-copy support, and syntax highlighting from jsDelivr. Internet access to that CDN is required. Documentation search caches its index locally in the visiting browser; this is separate from the extension's settings. The documentation does not include analytics or externally hosted fonts.

For Docsify's configuration and plugin options, refer to its official [configuration documentation](https://docsify.js.org/#/configuration) and [plugin documentation](https://docsify.js.org/#/plugins).

Before submitting a documentation change, check links, images, sidebar navigation, search, keyboard focus, and the layout at desktop and narrow widths.

## Keep the policy and guides accurate

The current extension implementation is the source of truth for functionality. Review the generated production manifests, settings UI, provider definitions, adapters, and navigation code whenever behavior changes.

`privacy/privacy-policy.md` is an exact copy of the root `PRIVACY.md`. Update it from the original policy when that policy changes; do not introduce additional legal or privacy promises into the copy.

Screenshots should show the current extension running in a clean browser profile, using neutral queries without personal account or browser information. Store PNGs in `assets/screenshots/` and write meaningful alternative text and captions.

To refresh the Settings, custom-engine editor, and popup captures from the packaged Firefox extension:

```powershell
$env:FSS_FIREFOX_PATH = 'C:\Program Files\Mozilla Firefox\firefox.exe'
$env:FSS_GECKODRIVER_PATH = 'C:\tools\geckodriver.exe'
npm run zip:firefox
npm run capture:docs
```

Adjust the executable paths for your installation. The capture script uses a temporary Firefox profile with neutral example configuration and native browser screenshots. It writes the guide images into `docs/assets/screenshots/` and the full Settings image into `docs/screenshots/settings.png`. Review the images before committing them. Narrow viewport captures show the desktop Firefox layout at phone width; they are not physical Android screenshots.

The capture script opens the popup document in a tab for its screenshot. To verify the actual toolbar panel and refresh its documentation image, also run:

```powershell
npm run test:popup:firefox
Copy-Item .output/validation/firefox-toolbar-popup-dark.png docs/assets/screenshots/popup.png
```

The native popup test catches browser sizing problems that a tab screenshot cannot show. Run `npm run test:popup:chromium` after building Chromium to check the Brave/Chromium action panel as well.
