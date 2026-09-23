// Deterministic browser checks: real built extension, synthetic supported pages,
// no search-provider/network dependency. The action document is opened as a tab.
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const extension = path.join(root, '.output', 'chrome-mv3');
const profile = await mkdtemp(path.join(tmpdir(), 'fss-v2-smoke-'));
const browserPath = process.env.FSS_BROWSER_PATH || 'C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe';
const key = 'freeSearchSwitcherSettings';
let context;

async function poll(check, message) {
  const deadline = Date.now() + 10_000;
  while (Date.now() < deadline) {
    if (await check()) return;
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  assert.fail(message);
}

try {
  context = await chromium.launchPersistentContext(profile, {
    executablePath: browserPath,
    headless: true,
    args: [`--disable-extensions-except=${extension}`, `--load-extension=${extension}`],
  });
  const worker = context.serviceWorkers()[0] ?? await context.waitForEvent('serviceworker');
  const workerUrl = new URL(worker.url());
  const origin = `${workerUrl.protocol}//${workerUrl.host}`;
  let iconRequests = 0;
  await context.route('https://**/*', async (route) => {
    if (route.request().url().startsWith('https://icons.example/')) {
      iconRequests++;
      return route.abort();
    }
    return route.fulfill({ contentType: 'text/html', body: `<!doctype html><html><head><title>Search fixture</title><style>body{margin:30px}form{width:600px;max-width:90vw;position:relative}input{width:80%;height:50px}</style></head><body><form role="search" action="/search"><input name="q" aria-label="Search" value="caf&#233; &#19990;&#30028;"><button>Search</button></form></body></html>` });
  });
  // Use the first-install page rather than racing openOptionsPage with our own
  // navigation to a duplicate Options document.
  await poll(() => context.pages().some((page) => page.url() === `${origin}/options.html`), 'Onboarding opens Options');
  const options = context.pages().find((page) => page.url() === `${origin}/options.html`);
  await options.locator('#site-google').waitFor();
  const saved = () => options.evaluate(async (storageKey) => (await globalThis.chrome.storage.sync.get(storageKey))[storageKey], key);
  const save = options.getByRole('button', { name: 'Save changes', exact: true });
  const cancel = options.locator('#cancel-changes');
  await poll(async () => Boolean(await saved()), 'Settings initialize');
  const baseline = await saved();
  assert.equal(baseline.schemaVersion, 2);
  assert.equal(baseline.enabled, true);
  assert.equal(Object.values(baseline.siteEnabled).every(Boolean), true);
  assert.equal(await save.isDisabled(), true);

  // All draft categories can be cancelled together, including custom editor input.
  const globalToggle = options.locator('#enabled');
  const googleToggle = options.locator('#site-google');
  await globalToggle.uncheck();
  await googleToggle.uncheck();
  await options.locator('#first-preference').selectOption('google');
  await options.locator('#second-preference').selectOption('bing');
  await options.locator('#add-custom-engine').click();
  await options.locator('#custom-name').fill('Draft engine');
  await options.locator('#custom-home-url').fill('https://example.com/');
  await options.locator('#custom-search-url').fill('https://example.com/?q={query}');
  await options.locator('#custom-icon-url').fill('https://icons.example/icon.png');
  assert.deepEqual(await saved(), baseline);
  assert.equal(iconRequests, 0, 'Typing/validation does not download the icon');
  await cancel.first().click();
  assert.equal(await globalToggle.isChecked(), true);
  assert.equal(await googleToggle.isChecked(), true);
  assert.equal(await options.locator('#first-preference').inputValue(), '');
  assert.equal(await save.isDisabled(), true);
  assert.equal(await options.locator('#custom-engine-form').isHidden(), true);

  await globalToggle.uncheck();
  const unsavedDialog = options.waitForEvent('dialog');
  const attemptedReload = options.reload({ timeout: 2_000 }).catch(() => {});
  const dialog = await unsavedDialog;
  assert.equal(dialog.type(), 'beforeunload');
  await dialog.dismiss();
  await attemptedReload;
  assert.equal(await globalToggle.isChecked(), false, 'Leaving warning keeps the unsaved draft');
  await cancel.click();

  await globalToggle.uncheck();
  await googleToggle.uncheck();
  await options.locator('#first-preference').selectOption('google');
  await options.locator('#add-custom-engine').click();
  await options.locator('#custom-name').fill('Custom destination');
  await options.locator('#custom-home-url').fill('https://example.com/');
  await options.locator('#custom-search-url').fill('https://example.com/?q={query}');
  await options.locator('#custom-icon-url').fill('https://icons.example/icon.png');
  await save.click();
  await poll(async () => (await saved()).customEngines.length === 1, 'Main Save applies the editor and full draft');
  const withCustom = await saved();
  assert.equal(withCustom.enabled, false);
  assert.equal(withCustom.siteEnabled.google, false);
  assert.equal(withCustom.firstPreferredEngineId, 'google');
  assert.equal(withCustom.customEngines[0].iconUrl, 'https://icons.example/icon.png');
  await poll(async () => iconRequests > 0, 'Browser displays the remote icon');
  await poll(async () => (await options.locator('.custom-card .engine-icon img').count()) === 0, 'Failed icon falls back');

  await options.getByRole('button', { name: 'Edit Custom destination', exact: true }).click();
  await options.locator('#custom-name').fill('Unsaved edit');
  await options.locator('#custom-icon-url').fill('https://icons.example/other.png');
  await options.locator('#custom-engine-form button[type="submit"]').click();
  assert.deepEqual(await saved(), withCustom);
  await cancel.first().click();
  await options.getByRole('button', { name: 'Delete Custom destination', exact: true }).click();
  assert.deepEqual(await saved(), withCustom);
  await cancel.first().click();
  assert.equal(await options.getByRole('button', { name: 'Edit Custom destination', exact: true }).count(), 1);

  // External sync updates refresh clean Options, but preserve a dirty draft.
  const external = async (patch) => options.evaluate(async ({ storageKey, patch }) => {
    const current = (await globalThis.chrome.storage.sync.get(storageKey))[storageKey];
    await globalThis.chrome.storage.sync.set({ [storageKey]: { ...current, ...patch } });
  }, { storageKey: key, patch });
  await external({ enabled: true, firstPreferredEngineId: 'bing' });
  await poll(async () => (await options.locator('#first-preference').inputValue()) === 'bing', 'Clean Options refreshes');
  await globalToggle.uncheck();
  await external({ firstPreferredEngineId: 'ecosia' });
  await poll(async () => await options.locator('#external-warning').isVisible(), 'Dirty Options warns about external changes');
  assert.equal(await globalToggle.isChecked(), false);
  await cancel.first().click();
  assert.equal(await options.locator('#first-preference').inputValue(), 'ecosia');
  assert.equal(await globalToggle.isChecked(), true);

  const search = await context.newPage();
  await search.goto('https://www.ecosia.org/search?q=caf%C3%A9%20%E4%B8%96%E7%95%8C');
  const hostCount = () => search.locator('[data-free-search-switcher-root]').count();
  await poll(async () => (await hostCount()) === 1, 'Enabled supported page injects controls');
  const popup = await context.newPage();
  await popup.goto(`${origin}/popup.html`);
  await search.bringToFront();
  const warning = popup.locator('#reload-warning');
  const toggle = async () => {
    // HTMLElement.click() does not wait for a disabled fieldset like a real
    // user action would; wait for startup/the previous immediate save to finish.
    await popup.waitForFunction(() => !document.querySelector('#enabled').matches(':disabled'));
    await popup.evaluate(() => document.querySelector('#enabled').click());
  };
  await poll(async () => await popup.locator('#enabled').isEnabled(), 'Desktop popup loads');
  await toggle();
  try {
    await poll(async () => (await saved()).enabled === false && await warning.isVisible(), 'OFF saves and warns');
  } catch (error) {
    console.error('Popup diagnostic:', await popup.evaluate(async () => {
      const [tab] = await globalThis.chrome.tabs.query({ active: true, currentWindow: true });
      let snapshot;
      try { snapshot = await globalThis.chrome.tabs.sendMessage(tab.id, { type: 'free-search-switcher:page-state' }, { frameId: 0 }); }
      catch (error) { snapshot = error.message; }
      return { snapshot, checked: document.querySelector('#enabled').checked, error: document.querySelector('#error').textContent };
    }));
    throw error;
  }
  assert.equal(await hostCount(), 1, 'Existing UI stays until reload');
  await toggle();
  await poll(async () => (await saved()).enabled === true && await warning.isHidden(), 'Undo clears warning');
  await toggle();
  await poll(async () => await warning.isVisible(), 'OFF warns again');
  await popup.evaluate(() => document.querySelector('#reload-page').click());
  await poll(async () => (await hostCount()) === 0 && await warning.isHidden(), 'Reload removes UI and warning');
  await toggle();
  await poll(async () => (await saved()).enabled === true && await warning.isVisible(), 'Disabled page can request re-enable');
  await popup.evaluate(() => document.querySelector('#reload-page').click());
  await poll(async () => (await hostCount()) === 1, 'Reload re-enables UI');

  await search.goto('https://www.google.com/search?q=test');
  await poll(async () => await warning.isHidden(), 'New site snapshot arrives');
  assert.equal(await hostCount(), 0, 'Google injection remains disabled');
  assert.equal(await popup.locator('#first-preference option[value="google"]').count(), 1, 'Google remains a destination');
  assert.equal(await popup.locator(`#first-preference option[value="${withCustom.customEngines[0].id}"]`).count(), 1);
  await popup.locator('#first-preference').selectOption(withCustom.customEngines[0].id);
  await poll(async () => (await saved()).firstPreferredEngineId === withCustom.customEngines[0].id, 'Popup preferences save immediately');
  await search.goto('https://example.com/');
  await toggle();
  await poll(async () => (await saved()).enabled === false, 'Unsupported-page toggle saved');
  assert.equal(await warning.isHidden(), true);

  if (process.env.FSS_CAPTURE_SCREENSHOTS === '1') {
    const captures = path.join(root, '.output', 'validation');
    await mkdir(captures, { recursive: true });
    await popup.screenshot({ path: path.join(captures, 'popup-light.png') });
    await options.screenshot({ path: path.join(captures, 'options-light.png'), fullPage: true });
    await popup.emulateMedia({ colorScheme: 'dark' });
    await popup.screenshot({ path: path.join(captures, 'popup-dark.png') });
  }

  // Narrow layouts and Android fallback use the full Settings page.
  await options.setViewportSize({ width: 360, height: 800 });
  await options.emulateMedia({ colorScheme: 'dark' });
  assert.equal(await options.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  if (process.env.FSS_CAPTURE_SCREENSHOTS === '1') {
    await options.screenshot({ path: path.join(root, '.output', 'validation', 'options-mobile-dark.png'), fullPage: true });
  }
  await popup.addInitScript(() => { globalThis.chrome.runtime.getPlatformInfo = async () => ({ os: 'android' }); });
  await popup.reload();
  await popup.locator('#android-help').waitFor();
  await popup.setViewportSize({ width: 320, height: 640 });
  assert.equal(await popup.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, 'Android Settings access fits a narrow viewport');
  assert.equal(await popup.locator('#desktop-controls').isHidden(), true);
  assert.equal(await popup.locator('#open-settings').isVisible(), true);
  const popupClosed = popup.waitForEvent('close');
  await popup.locator('#open-settings').click();
  await popupClosed;
  assert.ok(context.pages().some((page) => page.url() === `${origin}/options.html`));
  const sync = await options.evaluate(() => globalThis.chrome.storage.sync.get(null));
  assert.deepEqual(Object.keys(sync), [key]);
  assert.equal(JSON.stringify(sync).includes('café'), false, 'Queries never enter storage');
  console.log('V2 browser smoke passed: Save/Cancel, custom icons, external changes, popup snapshots/reload, site controls, narrow/dark Options, Android popup routing.');
} finally {
  await context?.close();
  const resolved = path.resolve(profile);
  if (resolved.startsWith(`${path.resolve(tmpdir())}${path.sep}`) && path.basename(resolved).startsWith('fss-v2-smoke-')) {
    await rm(resolved, { recursive: true, force: true });
  }
}
