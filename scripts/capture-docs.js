// Capture the built Firefox UI with native WebDriver screenshots in a temporary
// profile. No UI markup or styles are substituted for the extension's real UI.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createServer } from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const { version } = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'));
const firefox = process.env.FSS_FIREFOX_PATH || 'C:/Program Files/Mozilla Firefox/firefox.exe';
const geckodriver = process.env.FSS_GECKODRIVER_PATH;
assert.ok(geckodriver, 'Set FSS_GECKODRIVER_PATH to the geckodriver executable.');
const port = await new Promise((resolve, reject) => {
  const server = createServer();
  server.once('error', reject);
  server.listen(0, '127.0.0.1', () => {
    const address = server.address();
    server.close(() => resolve(address.port));
  });
});
const driver = spawn(geckodriver, ['--allow-system-access', '--host', '127.0.0.1', '--port', String(port)], { windowsHide: true, stdio: 'ignore' });
const endpoint = `http://127.0.0.1:${port}`;
let sessionId;
async function request(method, suffix, body) {
  const response = await fetch(`${endpoint}${suffix}`, {
    method,
    headers: body === undefined ? undefined : { 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const result = await response.json();
  if (!response.ok || result.value?.error) throw new Error(JSON.stringify(result.value));
  return result.value;
}
async function wait(check, description) {
  const deadline = Date.now() + 20000;
  while (Date.now() < deadline) {
    const result = await check();
    if (result) return result;
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  throw new Error(`Timed out: ${description}`);
}
const settings = {
  schemaVersion: 2,
  enabled: true,
  siteEnabled: { ecosia: true, startpage: true, duckduckgo: true, qwant: true, bing: true, brave: true, google: true },
  firstPreferredEngineId: 'ecosia',
  secondPreferredEngineId: 'google',
  customEngines: [{ id: 'custom-wikipedia', name: 'Wikipedia', homeUrl: 'https://en.wikipedia.org/', searchUrlTemplate: 'https://en.wikipedia.org/w/index.php?search={query}', iconUrl: '' }],
};

try {
  await wait(async () => { try { return (await request('GET', '/status')).ready; } catch { return false; } }, 'geckodriver startup');
  const session = await request('POST', '/session', {
    capabilities: { alwaysMatch: { browserName: 'firefox', 'moz:firefoxOptions': {
      binary: firefox,
      args: ['-headless', '-width', '1180', '-height', '1100'],
      prefs: { 'extensions.install.requireBuiltInCerts': false, 'xpinstall.signatures.required': false, 'layout.css.prefers-color-scheme.content-override': 1 },
    } } },
  });
  sessionId = session.sessionId;
  const route = `/session/${sessionId}`;
  const execute = (script, args = []) => request('POST', `${route}/execute/sync`, { script, args });
  const executeAsync = (script, args = []) => request('POST', `${route}/execute/async`, { script, args });
  const archive = await readFile(path.join(root, '.output', `free-search-switcher-${version}-firefox.zip`));
  assert.equal(await request('POST', `${route}/moz/addon/install`, { addon: archive.toString('base64'), temporary: true }), '{9b6a0b52-51a6-44e1-945d-19209156934e}');
  const options = await wait(async () => {
    for (const handle of await request('GET', `${route}/window/handles`)) {
      await request('POST', `${route}/window`, { handle });
      const url = await request('GET', `${route}/url`);
      if (url.startsWith('moz-extension://') && url.endsWith('/options.html')) return { handle, url };
    }
    return null;
  }, 'onboarding Options page');
  const origin = new URL(options.url).origin;
  // URL.origin is null for Firefox's custom scheme in Node.
  const extensionOrigin = origin === 'null' ? options.url.slice(0, options.url.lastIndexOf('/')) : origin;
  await executeAsync('const done = arguments[arguments.length - 1]; browser.storage.sync.set({ freeSearchSwitcherSettings: arguments[0] }).then(() => done(true), error => done({ error: String(error) }));', [settings]);
  await request('POST', `${route}/refresh`, {});
  await wait(() => execute("return document.querySelector('#first-preference')?.value === 'ecosia' && document.querySelector('#custom-engine-list')?.textContent.includes('Wikipedia');"), 'example settings');
  await mkdir(path.join(root, 'docs/assets/screenshots'), { recursive: true });
  await mkdir(path.join(root, 'docs/screenshots'), { recursive: true });
  async function screenshot(relativePath, selector, fullPage = false) {
    let suffix = `${route}${fullPage ? '/moz/screenshot/full' : '/screenshot'}`;
    if (selector) {
      const element = await request('POST', `${route}/element`, { using: 'css selector', value: selector });
      suffix = `${route}/element/${element['element-6066-11e4-a52e-4f735466cecf']}/screenshot`;
    }
    const data = await request('GET', suffix);
    await writeFile(path.join(root, relativePath), Buffer.from(data, 'base64'));
    console.log(`Captured ${relativePath}`);
  }
  async function fitFullPage() {
    const height = await execute('return document.documentElement.scrollHeight + outerHeight - innerHeight;');
    await request('POST', `${route}/window/rect`, { height });
    await execute('window.scrollTo(0, 0);');
  }
  // A tall native viewport places the sticky Save/Cancel bar at the bottom of
  // full-page captures without hiding or altering any extension UI.
  await fitFullPage();
  await execute('window.scrollTo(0, 0);');
  await screenshot('docs/screenshots/settings.png', null, true);
  // Natural viewport framing includes the header, global/site controls and the
  // preferred-engine selectors. Full-page Settings is available separately.
  await request('POST', `${route}/window/rect`, { width: 1180, height: 1620 });
  await execute('window.scrollTo(0, 0);');
  await screenshot('docs/assets/screenshots/options-preferences.png');

  await request('POST', `${route}/window/rect`, { width: 1180, height: 1100 });
  await execute("document.querySelector('[aria-label=\"Edit Wikipedia\"]').click();");
  await execute(`
    for (const [id, value] of Object.entries(arguments[0])) {
      const field = document.getElementById(id);
      field.value = value;
      field.dispatchEvent(new Event('input', { bubbles: true }));
    }
    document.querySelector('#custom-engine-form').closest('section').scrollIntoView({ block: 'start' });
    document.activeElement.blur();
  `, [{ 'custom-name': 'Wikipedia', 'custom-home-url': 'https://en.wikipedia.org/wiki/Main_Page', 'custom-search-url': 'https://en.wikipedia.org/w/index.php?search={query}', 'custom-icon-url': '' }]);
  await screenshot('docs/assets/screenshots/custom-engine-editor.png');
  await execute("document.querySelector('#cancel-changes').click();");

  await request('POST', `${route}/url`, { url: `${extensionOrigin}/popup.html` });
  await wait(() => execute("return document.querySelector('#first-preference')?.value === 'ecosia' && !document.querySelector('#desktop-controls')?.disabled;"), 'popup controls');
  await screenshot('docs/assets/screenshots/popup.png', 'body');

  await request('POST', `${route}/url`, { url: options.url });
  await wait(() => execute("return document.querySelector('#first-preference')?.value === 'ecosia';"), 'Options reload');
  await request('POST', `${route}/window/rect`, { width: 390, height: 844 });
  await request('POST', `${route}/moz/context`, { context: 'chrome' });
  await execute("Services.prefs.setIntPref('layout.css.prefers-color-scheme.content-override', 0);");
  await request('POST', `${route}/moz/context`, { context: 'content' });
  await wait(() => execute("return matchMedia('(prefers-color-scheme: dark)').matches;"), 'dark color scheme');
  await request('POST', `${route}/refresh`, {});
  await wait(() => execute("return document.querySelector('#first-preference')?.value === 'ecosia';"), 'dark Options reload');
  await fitFullPage();
  await new Promise((resolve) => setTimeout(resolve, 250));
  await execute('window.scrollTo(0, 0);');
  await screenshot('docs/assets/screenshots/options-mobile-dark.png', null, true);
  console.log('Captured real Firefox UI. Narrow screenshot emulates viewport width; it is not a physical Android screenshot.');
} finally {
  if (sessionId) await request('DELETE', `/session/${sessionId}`).catch(() => {});
  driver.kill();
}
