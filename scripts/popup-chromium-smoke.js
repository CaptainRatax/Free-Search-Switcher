// Measure the native action panel opened by action.openPopup(), not a popup tab.
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const extension = process.env.FSS_EXTENSION_PATH || path.join(root, '.output/chrome-mv3');
const profile = await mkdtemp(path.join(tmpdir(), 'fss-native-popup-'));
const browserPath = process.env.FSS_BROWSER_PATH || 'C:/Program Files/BraveSoftware/Brave-Browser/Application/brave.exe';
const captures = path.join(root, '.output/validation');
let context;

async function waitFor(check, message) {
  const deadline = Date.now() + 10000;
  while (Date.now() < deadline) {
    const result = await check();
    if (result) return result;
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  assert.fail(message);
}

try {
  context = await chromium.launchPersistentContext(profile, {
    executablePath: browserPath,
    headless: true,
    viewport: null,
    args: ['--window-size=1280,1000', `--disable-extensions-except=${extension}`, `--load-extension=${extension}`],
  });
  const worker = context.serviceWorkers()[0] ?? await context.waitForEvent('serviceworker');
  const options = await waitFor(() => context.pages().find(page => page.url().endsWith('/options.html')), 'Onboarding Options opens');
  await options.locator('#enabled').waitFor({ state: 'visible' });
  await options.waitForFunction(() => !document.querySelector('#enabled').disabled);
  const cdp = await context.browser().newBrowserCDPSession();
  await mkdir(captures, { recursive: true });

  // Supported page fixture enables a real reload warning without network access.
  await context.route('https://www.ecosia.org/**', route => route.fulfill({
    contentType: 'text/html',
    body: '<!doctype html><html><head><title>Popup fixture</title></head><body><form role="search"><input name="q" aria-label="Search" style="width:500px;height:45px"></form></body></html>',
  }));
  const search = await context.newPage();
  await search.goto('https://www.ecosia.org/');
  await search.locator('[data-free-search-switcher-root]').waitFor({ state: 'attached' });

  for (const theme of ['light', 'dark']) {
    await search.bringToFront();
    await worker.evaluate(() => globalThis.chrome.action.openPopup());
    const target = await waitFor(async () => (await cdp.send('Target.getTargets')).targetInfos.find(target => target.url.endsWith('/popup.html')), 'Native action target opens');
    assert.equal(context.pages().some(page => page.url() === target.url), false, 'Action panel is not an ordinary page opened by the test');
    const { sessionId } = await cdp.send('Target.attachToTarget', { targetId: target.targetId, flatten: false });
    let nextId = 0;
    const command = (method, params = {}) => new Promise((resolve, reject) => {
      const id = ++nextId;
      const timer = setTimeout(() => { cdp.off('Target.receivedMessageFromTarget', listener); reject(new Error(`Timed out: ${method}`)); }, 10000);
      const listener = event => {
        if (event.sessionId !== sessionId) return;
        const message = JSON.parse(event.message);
        if (message.id !== id) return;
        clearTimeout(timer);
        cdp.off('Target.receivedMessageFromTarget', listener);
        if (message.error) reject(new Error(JSON.stringify(message.error)));
        else resolve(message.result);
      };
      cdp.on('Target.receivedMessageFromTarget', listener);
      cdp.send('Target.sendMessageToTarget', { sessionId, message: JSON.stringify({ id, method, params }) }).catch(error => {
        clearTimeout(timer);
        cdp.off('Target.receivedMessageFromTarget', listener);
        reject(error);
      });
    });
    await command('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: theme }] });
    const metrics = () => options.evaluate(() => {
      const popup = globalThis.chrome.extension.getViews({ type: 'popup' })[0];
      if (!popup || popup.document.querySelector('#enabled')?.matches(':disabled')) return null;
      const doc = popup.document;
      const button = doc.querySelector('#open-settings').getBoundingClientRect();
      return { width: popup.innerWidth, height: popup.innerHeight, scrollWidth: doc.documentElement.scrollWidth, scrollHeight: doc.documentElement.scrollHeight, buttonBottom: button.bottom, warning: !doc.querySelector('#reload-warning').hidden, enabled: doc.querySelector('#enabled').checked };
    });
    let initial;
    await waitFor(async () => { initial = await metrics(); return initial && initial.height > 300; }, 'Native panel loads its controls');
    assert.ok(initial.width >= 360 && initial.width <= 420, JSON.stringify(initial));
    assert.ok(initial.scrollWidth <= initial.width, 'No horizontal scroll in the native panel');
    assert.ok(initial.buttonBottom <= initial.height, 'Settings button is visible without scrolling');
    const regular = await command('Page.captureScreenshot');
    await writeFile(path.join(captures, `popup-brave-native-${theme}.png`), Buffer.from(regular.data, 'base64'));

    await options.evaluate(() => globalThis.chrome.extension.getViews({ type: 'popup' })[0].document.querySelector('#enabled').click());
    const warning = await waitFor(async () => { const value = await metrics(); return value?.warning && !value.enabled && value.height > initial.height ? value : null; }, 'Reload warning expands the native panel');
    // A browser can add scrollbar space when its panel reaches the available
    // screen height. Verify readable width and reachable controls in that case.
    assert.ok(warning.width >= 360 && warning.width <= 420, JSON.stringify(warning));
    assert.ok(warning.scrollWidth <= warning.width, 'Expanded panel has no horizontal overflow');
    await options.evaluate(() => globalThis.chrome.extension.getViews({ type: 'popup' })[0].document.querySelector('#open-settings').focus());
    await waitFor(async () => { const value = await metrics(); return value && value.buttonBottom <= value.height; }, 'Settings remains reachable when the warning needs vertical scrolling');
    const expanded = await command('Page.captureScreenshot');
    await writeFile(path.join(captures, `popup-brave-native-${theme}-reload.png`), Buffer.from(expanded.data, 'base64'));
    await options.evaluate(() => globalThis.chrome.extension.getViews({ type: 'popup' })[0].document.querySelector('#enabled').click());
    await waitFor(async () => { const value = await metrics(); return value && value.enabled && !value.warning && value.width >= 360 && value.width <= 420 && value.scrollWidth <= value.width; }, 'Undo removes the warning without collapsing');
    console.log(`Native Chromium popup (${theme}): ${initial.width}×${initial.height}; reload warning ${warning.width}×${warning.height}; no horizontal overflow.`);
    await cdp.send('Target.detachFromTarget', { sessionId });
    await options.evaluate(() => globalThis.chrome.extension.getViews({ type: 'popup' })[0].close());
    await waitFor(async () => !(await cdp.send('Target.getTargets')).targetInfos.some(target => target.url.endsWith('/popup.html')), 'Native panel finishes closing');
  }
} finally {
  await context?.close();
  const resolved = path.resolve(profile);
  if (path.dirname(resolved) === path.resolve(tmpdir()) && path.basename(resolved).startsWith('fss-native-popup-')) {
    await rm(resolved, { recursive: true, force: true });
  }
}
