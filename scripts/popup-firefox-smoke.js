import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createServer } from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Exercise the browser's real toolbar panel. Opening popup.html in a tab does
// not exercise browser-action sizing and cannot catch collapsed native panels.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const { version } = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'));
const firefox = process.env.FSS_FIREFOX_PATH || 'C:/Program Files/Mozilla Firefox/firefox.exe';
const geckodriver = process.env.FSS_GECKODRIVER_PATH;
assert.ok(geckodriver, 'Set FSS_GECKODRIVER_PATH to the geckodriver executable.');
const archivePath = process.env.FSS_FIREFOX_EXTENSION || path.join(root, '.output', `free-search-switcher-${version}-firefox.zip`);
const extensionId = '{9b6a0b52-51a6-44e1-945d-19209156934e}';
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
  const context = (name) => request('POST', `${route}/moz/context`, { context: name });
  const archive = await readFile(archivePath);
  assert.equal(await request('POST', `${route}/moz/addon/install`, { addon: archive.toString('base64'), temporary: true }), extensionId);
  await wait(async () => {
    for (const handle of await request('GET', `${route}/window/handles`)) {
      await request('POST', `${route}/window`, { handle });
      if ((await request('GET', `${route}/url`)).endsWith('/options.html')) return true;
    }
    return false;
  }, 'onboarding Options page');
  await context('chrome');
  const buttonId = await execute(`
    const policy = WebExtensionPolicy.getByID(arguments[0]);
    const id = policy.id.toLowerCase().replace(/[^a-z0-9_-]/g, '_') + '-browser-action';
    CustomizableUI.addWidgetToArea(id, CustomizableUI.AREA_NAVBAR);
    return id;
  `, [extensionId]);
  await mkdir(path.join(root, '.output/validation'), { recursive: true });
  for (const theme of ['light', 'dark']) {
    await context('chrome');
    await execute(`
      const dark = arguments[0] === 'dark';
      Services.prefs.setIntPref('ui.systemUsesDarkTheme', dark ? 1 : 0);
      Services.prefs.setIntPref('layout.css.prefers-color-scheme.content-override', dark ? 0 : 1);
      Services.prefs.setIntPref('browser.theme.content-theme', dark ? 0 : 1);
      Services.prefs.setIntPref('browser.theme.toolbar-theme', dark ? 0 : 1);
    `, [theme]);
    if (theme === 'dark') {
      await context('content');
      assert.equal(await executeAsync(`
        const done = arguments[arguments.length - 1];
        browser.storage.sync.set({ freeSearchSwitcherSettings: {
          schemaVersion: 2,
          enabled: true,
          siteEnabled: { ecosia: true, startpage: true, duckduckgo: true, qwant: true, bing: true, brave: true, google: true },
          firstPreferredEngineId: 'ecosia',
          secondPreferredEngineId: 'google',
          customEngines: [],
        } }).then(() => done(true), error => done(String(error)));
      `), true);
      await context('chrome');
    }
    const button = await request('POST', `${route}/element`, { using: 'css selector', value: `#${buttonId} .unified-extensions-item-action-button` });
    await request('POST', `${route}/element/${button['element-6066-11e4-a52e-4f735466cecf']}/click`, {});
    await wait(() => execute("return [...document.querySelectorAll('panel')].some(panel => panel.state === 'open' && panel.querySelector('browser.webextension-popup-browser'));"), 'native toolbar popup panel');
    await context('content');
    await wait(() => execute(`
      const popup = browser.extension.getViews({ type: 'popup' })[0];
      return popup && !popup.document.querySelector('#desktop-controls').disabled
        && popup.document.querySelector('#first-preference').options.length >= 8;
    `), 'popup configuration loaded');
    const layout = await execute(`
      const popup = browser.extension.getViews({ type: 'popup' })[0];
      const doc = popup.document;
      return {
        width: popup.innerWidth,
        height: popup.innerHeight,
        bodyWidth: doc.body.getBoundingClientRect().width,
        scrollWidth: doc.documentElement.scrollWidth,
        scrollHeight: doc.documentElement.scrollHeight,
        dark: popup.matchMedia('(prefers-color-scheme: dark)').matches,
        first: doc.querySelector('#first-preference').value,
        second: doc.querySelector('#second-preference').value,
        controls: ['#enabled', '#first-preference', '#second-preference', '#open-settings'].map(selector => {
          const element = doc.querySelector(selector);
          const rect = element.getBoundingClientRect();
          return { selector, x: rect.x, right: rect.right, y: rect.y, bottom: rect.bottom, width: rect.width, height: rect.height };
        }),
      };
    `);
    assert.ok(layout.width >= 360 && layout.width <= 500, `Readable popup width: ${JSON.stringify(layout)}`);
    assert.equal(layout.bodyWidth, 380);
    assert.ok(layout.height >= 300 && layout.height <= 600, 'Popup height fits the toolbar panel.');
    assert.ok(layout.scrollWidth <= layout.width, 'Popup has no horizontal overflow.');
    assert.ok(layout.scrollHeight <= layout.height, 'Default popup does not require vertical scrolling.');
    assert.equal(layout.dark, theme === 'dark', `${theme} color scheme applied.`);
    assert.equal(layout.first, theme === 'dark' ? 'ecosia' : '');
    assert.equal(layout.second, theme === 'dark' ? 'google' : '');
    for (const control of layout.controls) {
      assert.ok(control.x >= 0 && control.right <= layout.width && control.y >= 0 && control.bottom <= layout.height, `${control.selector} is fully visible.`);
      assert.ok(control.height >= 24, `${control.selector} remains usable.`);
      if (control.selector !== '#enabled') assert.ok(control.width >= 300, `${control.selector} has a readable width.`);
    }
    await context('chrome');
    const nativeWidth = await execute("return document.querySelector('panel[panelopen] browser.webextension-popup-browser').getBoundingClientRect().width;");
    assert.equal(nativeWidth, layout.width, 'The actual native popup viewport matches its content.');
    // WebDriver element screenshots in chrome context capture the underlying
    // browser window instead of this floating panel. Firefox's compositor
    // snapshots the live popup browsing context without changing its UI.
    const image = await executeAsync(`
      const done = arguments[arguments.length - 1];
      const popupBrowser = document.querySelector('panel[panelopen] browser.webextension-popup-browser');
      const width = popupBrowser.clientWidth;
      const height = popupBrowser.clientHeight;
      popupBrowser.browsingContext.currentWindowGlobal.drawSnapshot(new DOMRect(0, 0, width, height), 1, 'white').then(bitmap => {
        const canvas = document.createElementNS('http://www.w3.org/1999/xhtml', 'canvas');
        canvas.width = width;
        canvas.height = height;
        canvas.getContext('2d').drawImage(bitmap, 0, 0);
        bitmap.close();
        done(canvas.toDataURL('image/png').split(',')[1]);
      }, error => done({ error: String(error) }));
    `);
    assert.equal(typeof image, 'string', JSON.stringify(image));
    await writeFile(path.join(root, `.output/validation/firefox-toolbar-popup-${theme}.png`), Buffer.from(image, 'base64'));
    console.log(`[firefox popup] ${theme}: native toolbar viewport ${layout.width} x ${layout.height}; controls visible; no overflow.`);
    await execute("document.querySelector('panel[panelopen] browser.webextension-popup-browser').closest('panel').hidePopup();");
    await wait(() => execute("return !document.querySelector('panel[panelopen] browser.webextension-popup-browser');"), 'popup closed');
  }
} finally {
  if (sessionId) await request('DELETE', `/session/${sessionId}`).catch(() => {});
  driver.kill();
}
