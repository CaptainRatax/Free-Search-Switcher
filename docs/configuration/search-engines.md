# Search engines

Free Search Switcher recognizes seven built-in HTTPS search websites. It can also navigate to user-defined custom engines.

## Built-in providers

The following order is fixed. Selecting preferred engines promotes those destinations to the start of the menu; it does not change the underlying list.

| Order | Engine | Supported website | Web-search template | Submitted query source |
| ---: | --- | --- | --- | --- |
| 1 | Ecosia | [www.ecosia.org](https://www.ecosia.org/) | `https://www.ecosia.org/search?q={query}` | URL parameter `q` |
| 2 | Startpage | [www.startpage.com](https://www.startpage.com/) | `https://www.startpage.com/sp/search?query={query}` | URL parameter `query`; hidden submitted-query metadata on `/sp/search` when the parameter is absent |
| 3 | DuckDuckGo | [duckduckgo.com](https://duckduckgo.com/) | `https://duckduckgo.com/?q={query}` | URL parameter `q` |
| 4 | Qwant | [www.qwant.com](https://www.qwant.com/) | `https://www.qwant.com/?q={query}` | URL parameter `q` |
| 5 | Bing | [www.bing.com](https://www.bing.com/) | `https://www.bing.com/search?q={query}` | URL parameter `q` |
| 6 | Brave | [search.brave.com](https://search.brave.com/) | `https://search.brave.com/search?q={query}` | URL parameter `q` |
| 7 | Google | [www.google.com](https://www.google.com/) | `https://www.google.com/search?q={query}` | URL parameter `q`; decoded `/maps/search/…` path for Google Maps |

The extension runs only on these exact HTTPS hostnames. Regional domains and alternate subdomains are outside this list: for example, `www.google.co.uk`, `google.com`, and `html.duckduckgo.com` do not receive the controls. Adding one as a custom destination does not expand website access.

The controls need a visible search bar recognized by the provider's adapter. Consent pages, verification challenges, and special layouts can lack that bar. The extension explicitly hides controls over recognized Ecosia consent notices and Qwant verification challenges.

## Search-mode compatibility

This table describes destination URLs implemented by the extension. **Web fallback** means the submitted query is retained in a normal web search when switching from that mode. It does not imply the provider has no other products or search features.

| Engine | Web | Images | Videos | News | Maps | Shopping |
| --- | --- | --- | --- | --- | --- | --- |
| Ecosia | Supported | Supported | Supported | Supported | Web fallback | Web fallback |
| Startpage | Supported | Supported | Supported | Supported | Web fallback | Web fallback |
| DuckDuckGo | Supported | Supported | Supported | Supported | Supported destination; source control limited | Web fallback |
| Qwant | Supported | Supported | Supported | Supported | Web fallback | Web fallback |
| Bing | Supported | Supported | Supported | Supported | Supported destination; source control unavailable | Supported |
| Brave | Supported | Supported | Supported | Supported | Supported destination; source control unavailable | Web fallback |
| Google | Supported | Supported | Supported | Supported | Supported, subject to a recognized search bar | Supported, subject to provider redirects |
| Custom engine | Configured template | Configured template | Configured template | Configured template | Configured template | Configured template |

The mode is read from the source URL when you switch. Unrecognized modes become web searches. The extension transfers no pagination, date filters, region, SafeSearch, or other engine-specific search settings.

### Provider-specific handling

- **Ecosia:** Images, Videos, and News use `/images`, `/videos`, and `/news` with `q`. The extension has no Ecosia Maps or Shopping destination. Switching without a query opens its usual homepage for every mode.
- **Startpage:** Images use `cat=images`, Videos use the singular `cat=video`, and News uses `cat=news`. A query submitted with POST can be read from hidden results metadata rather than the editable search box. See the tab limitation below.
- **DuckDuckGo:** Images and Videos use `ia` with `iax`; News uses `ia=news&iar=news`; Maps uses `iaxm=maps`. Map layouts can use a separate interface whose search bar is not recognized reliably. Switching to Maps remains supported, but an on-page switcher there is not guaranteed.
- **Qwant:** Images, Videos, and News use `t=images`, `t=videos`, and `t=news`.
- **Bing:** Images, Videos, News, and Maps use dedicated paths; Shopping uses `/shop/topics?q=…`. Its dedicated Maps interface does not receive the on-page switcher with the current adapter.
- **Brave:** Images, Videos, and News use dedicated paths, and Maps uses `/maps/search?q=…`. Its dedicated Maps interface does not receive the on-page switcher with the current adapter.
- **Google:** Images and Videos use `udm=2` and `udm=7`; detection also recognizes legacy `tbm=isch` and `tbm=vid`. News uses `tbm=nws`, Shopping uses `udm=3`, and Maps puts the query in `/maps/search/{query}`. A provider redirect can change the mode actually served; Google may redirect Shopping searches to web results on Firefox for Android.

### Startpage's own tabs

Startpage's Images, Videos, and News tabs can change the visible results without adding or updating `cat` in the address bar. The extension reads that URL parameter, not the active-tab styling. As a result, switching after using Startpage's own tabs can use web mode when `cat` is absent, or an earlier mode when the URL still carries an older `cat` value.

Switching **to** Startpage's supported modes constructs the appropriate `cat` parameter. Switching **from** Startpage can preserve the mode when the URL accurately identifies it. The limitation concerns later tab changes that are not reflected in that URL.

### Homepages without a submitted query

When switching without a query, these dedicated mode homepages are configured:

| Destination | Dedicated mode homepages |
| --- | --- |
| Bing | Images `/images`, Videos `/videos`, News `/news`, Maps `/maps` |
| Brave | Maps `/maps/search` |
| Google | Images `/imghp`, Maps `/maps` |

All other mode/engine combinations open the destination's normal homepage. No empty search URL is created.

## Custom engines

A custom engine is a saved navigation destination. It has one homepage and one search template. It can appear in the engine menu or either preferred slot.

### Add a destination

1. Open [settings](/configuration/settings.md) using the toolbar icon.
2. In **Custom search engines**, click **Add custom engine**.
3. Enter a **Display name**, **Home URL**, and **Search URL template**.
4. Optionally click **Choose image** and select a local icon.
5. Click **Save custom engine**. Correct any highlighted fields if validation fails.

The screenshot shows the real editor filled with a Wikipedia destination:

![The actual custom-engine editor with Wikipedia as the display name, its HTTPS homepage, and a search template containing the literal query placeholder](../assets/screenshots/custom-engine-editor.png)

The values in this example are:

```text
Display name: Wikipedia
Home URL: https://en.wikipedia.org/
Search URL template: https://en.wikipedia.org/w/index.php?search={query}
```

Adapt this format to another site only after confirming its actual HTTPS search URL. Custom entries are separate destinations; they do not replace or edit a built-in definition.

### Template rules

| Requirement | Accepted or rejected example |
| --- | --- |
| Use a valid HTTPS homepage and search URL. | `https://example.com/` is a valid illustrative homepage; `http://example.com/` is rejected. |
| Include exactly one literal, lowercase `{query}`. | `https://example.com/search?q={query}` is valid syntax. A missing placeholder, `{QUERY}`, or two `{query}` placeholders is rejected. |
| Place the placeholder after the URL hostname. | `https://example.com/find/{query}` is valid syntax. `https://{query}.example.com/` is rejected. |
| Do not include URL usernames or passwords. | `https://user:password@example.com/` is rejected. |
| Give the engine a nonempty name of at most 80 characters. | Surrounding whitespace is removed. |
| Keep URLs within validation limits. | Home URLs are limited to 2,048 characters. Very long search templates are also rejected during URL validation. |

The `example.com` URLs illustrate parser syntax; they are not working search services. A real target must accept its query through a URL. The extension cannot submit a custom POST form or discover a site's search format for you.

The homepage and search template do not have to share a hostname. Both are independently checked as HTTPS URLs. Other schemes, including `javascript:`, `data:`, `file:`, and browser-internal URLs, are rejected.

The extension replaces `{query}` with the submitted text encoded once for a URL. For `café & tea`, a template ending in `?q={query}` becomes `?q=caf%C3%A9%20%26%20tea`. Do not pre-encode the placeholder as `%7Bquery%7D`; the literal token is required.

Validation checks the format, not whether the target service is online or returns the intended results. Test your saved engine with a neutral query.

### Icons

Custom icons are optional. Choose a local PNG, JPEG, WebP, or ICO of no more than 2 MB. The browser decodes the image, preserves its aspect ratio, and centers it in a transparent 128 × 128 PNG. That processed image is saved locally with the engine; the original file is not uploaded.

There is no remote icon URL field or automatic favicon download. Without an icon, the engine's first letter is shown. An undecodable file or unsupported MIME type produces a message; choose another supported image or save without an icon.

### Edit, delete, and ordering

Click **Edit** beside a saved engine, change its fields, and click **Save custom engine**. Its saved identity and creation order remain unchanged, so preferred selections still refer to the edited entry.

Click **Delete** and confirm to remove it. If it was your first preference, both preferences are cleared. If it was your second, only the second is cleared. Deleted entries cannot be restored through an undo command.

Custom engines are listed in creation order after built-ins unless promoted by a preference. There is no manual reorder control.

### Website access and modes

Adding a custom entry does not create an adapter for its website. Controls are injected only on the seven built-in origins, even when you navigate to a custom destination. If a custom destination happens to use one of those built-in origins, the usual built-in adapter still applies there.

Custom engines always receive their configured template, with no automatic Images, Videos, News, Maps, or Shopping mapping. You may configure a site's particular mode URL as the single template, but that same template is then used regardless of the source mode.

Preferences and custom definitions stay in this browser profile. Read [privacy and data handling](/privacy/privacy.md) before adding a target whose privacy practices you have not reviewed.
