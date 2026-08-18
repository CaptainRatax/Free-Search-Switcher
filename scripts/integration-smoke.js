import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { access, mkdir, mkdtemp, rm } from 'node:fs/promises';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const extensionPath = path.join(repositoryRoot, '.output', 'chrome-mv3');
const defaultBravePath = 'C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe';
const browserPath = process.env.FSS_BROWSER_PATH || defaultBravePath;
const storageKey = 'freeSearchSwitcherSettings';
const complexQuery = 'privacidade café & "pesquisa livre" 世界';
const captureScreenshots = process.env.FSS_CAPTURE_SCREENSHOTS === '1';
const emulateMobile = process.env.FSS_MOBILE === '1';
const mobileViewport = { width: 393, height: 852 };
const mobileUserAgent = 'Mozilla/5.0 (Android 15; Mobile; rv:153.0) Gecko/153.0 Firefox/153.0';
const screenshotsPath = path.join(repositoryRoot, 'docs', 'screenshots');
const profilePath = await mkdtemp(path.join(tmpdir(), 'free-search-switcher-'));
let connectedBrowser = null;
let braveProcess = null;
const cdpSessions = new WeakMap();
const configuredMobilePages = new WeakSet();

const builtInPages = [
  {
    id: 'ecosia',
    name: 'Ecosia',
    home: 'https://www.ecosia.org/',
    results: `https://www.ecosia.org/search?q=${encodeURIComponent(complexQuery)}`,
  },
  {
    id: 'startpage',
    name: 'Startpage',
    home: 'https://www.startpage.com/',
    results: null,
  },
  {
    id: 'duckduckgo',
    name: 'DuckDuckGo',
    home: 'https://duckduckgo.com/',
    results: `https://duckduckgo.com/?q=${encodeURIComponent(complexQuery)}`,
  },
  {
    id: 'qwant',
    name: 'Qwant',
    home: 'https://www.qwant.com/',
    results: `https://www.qwant.com/?q=${encodeURIComponent(complexQuery)}`,
  },
  {
    id: 'bing',
    name: 'Bing',
    home: 'https://www.bing.com/',
    results: `https://www.bing.com/search?q=${encodeURIComponent(complexQuery)}`,
  },
  {
    id: 'brave',
    name: 'Brave',
    home: 'https://search.brave.com/',
    results: `https://search.brave.com/search?q=${encodeURIComponent(complexQuery)}`,
  },
  {
    id: 'google',
    name: 'Google',
    home: 'https://www.google.com/',
    results: `https://www.google.com/search?q=${encodeURIComponent(complexQuery)}`,
  },
];

function log(message) {
  process.stdout.write(`[integration] ${message}\n`);
}

async function findAvailablePort() {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      server.close(() => resolve(port));
    });
  });
}

async function launchBrowser() {
  const cdpPort = await findAvailablePort();
  const cdpEndpoint = `http://127.0.0.1:${cdpPort}`;
  braveProcess = spawn(browserPath, [
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check',
    `--remote-debugging-port=${cdpPort}`,
    '--remote-debugging-address=127.0.0.1',
    `--window-size=${emulateMobile ? '430,932' : '1440,900'}`,
    `--user-data-dir=${profilePath}`,
    `--disable-extensions-except=${extensionPath}`,
    `--load-extension=${extensionPath}`,
    'about:blank',
  ], {
    stdio: 'ignore',
    windowsHide: true,
  });

  const deadline = Date.now() + 20_000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${cdpEndpoint}/json/version`);
      if (response.ok) {
        connectedBrowser = await chromium.connectOverCDP(cdpEndpoint);
        const [context] = connectedBrowser.contexts();
        return context;
      }
    } catch {
      // Brave is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 150));
  }

  throw new Error('Brave did not expose its DevTools endpoint within 20 seconds.');
}

async function stopBrowser() {
  await connectedBrowser?.close().catch(() => {});
  connectedBrowser = null;
  if (braveProcess && braveProcess.exitCode === null) {
    braveProcess.kill();
    await Promise.race([
      new Promise((resolve) => braveProcess.once('exit', resolve)),
      new Promise((resolve) => setTimeout(resolve, 3_000)),
    ]);
  }
  braveProcess = null;
}

async function getExtensionId(context) {
  let worker = context.serviceWorkers()[0];
  worker ??= await context.waitForEvent('serviceworker', { timeout: 15_000 });
  return new URL(worker.url()).hostname;
}

async function getOptionsPage(context, extensionId) {
  const expectedUrl = `chrome-extension://${extensionId}/options.html`;
  let page = context.pages().find((candidate) => candidate.url().startsWith(expectedUrl));
  if (!page) {
    page = await context.newPage();
    await page.goto(expectedUrl);
  }
  await page.waitForSelector('h1');
  return page;
}

async function waitForInstallOptionsPage(context, extensionId) {
  const expectedUrl = `chrome-extension://${extensionId}/options.html`;
  const deadline = Date.now() + 10_000;

  while (Date.now() < deadline) {
    const page = context.pages().find((candidate) => candidate.url().startsWith(expectedUrl));
    if (page) {
      await page.waitForSelector('h1');
      return page;
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  return null;
}

async function readSettings(optionsPage) {
  return optionsPage.evaluate(async (key) => {
    const stored = await globalThis.chrome.storage.local.get(key);
    return stored[key] ?? null;
  }, storageKey);
}

async function writeSettings(optionsPage, value) {
  await optionsPage.evaluate(async ({ key, settings }) => {
    await globalThis.chrome.storage.local.set({ [key]: settings });
  }, { key: storageKey, settings: value });
}

async function getCdpSession(page) {
  if (!cdpSessions.has(page)) {
    cdpSessions.set(page, page.context().newCDPSession(page));
  }
  return cdpSessions.get(page);
}

async function setMobileViewport(page, viewport = mobileViewport) {
  const cdp = await getCdpSession(page);
  await cdp.send('Emulation.setDeviceMetricsOverride', {
    width: viewport.width,
    height: viewport.height,
    screenWidth: viewport.width,
    screenHeight: viewport.height,
    deviceScaleFactor: 3,
    mobile: true,
  });
  await cdp.send('Emulation.setTouchEmulationEnabled', {
    enabled: true,
    maxTouchPoints: 5,
  });
}

async function configureMobilePage(page) {
  if (!emulateMobile || configuredMobilePages.has(page)) {
    return;
  }

  const cdp = await getCdpSession(page);
  await cdp.send('Network.setUserAgentOverride', {
    userAgent: mobileUserAgent,
    platform: 'Android',
    acceptLanguage: 'en-US,en;q=0.9',
  });
  await setMobileViewport(page);
  configuredMobilePages.add(page);
}

function getNodeAttribute(node, name) {
  const attributes = node.attributes ?? [];
  const index = attributes.indexOf(name);
  return index >= 0 ? attributes[index + 1] : null;
}

function walkNodes(node, visitor) {
  visitor(node);
  for (const child of [
    ...(node.children ?? []),
    ...(node.shadowRoots ?? []),
    ...(node.contentDocument ? [node.contentDocument] : []),
  ]) {
    walkNodes(child, visitor);
  }
}

function nodeHasClass(node, className) {
  return (getNodeAttribute(node, 'class') ?? '').split(/\s+/).includes(className);
}

function getNodeText(node) {
  let text = node.nodeValue ?? '';
  for (const child of node.children ?? []) {
    text += getNodeText(child);
  }
  return text.trim();
}

async function getClosedUiTree(page) {
  const cdp = await getCdpSession(page);
  await cdp.send('DOM.enable');
  const { root } = await cdp.send('DOM.getDocument', { depth: -1, pierce: true });
  const hosts = [];
  walkNodes(root, (node) => {
    if (getNodeAttribute(node, 'data-free-search-switcher-root') !== null) {
      hosts.push(node);
    }
  });
  return { cdp, hosts };
}

async function getControlState(page) {
  const { hosts } = await getClosedUiTree(page);
  const quickLabels = [];
  const menuNames = [];
  let arrowCount = 0;
  let menuExpanded = null;

  if (hosts[0]) {
    walkNodes(hosts[0], (node) => {
      if (nodeHasClass(node, 'quick-button')) {
        quickLabels.push(getNodeAttribute(node, 'aria-label'));
      }
      if (nodeHasClass(node, 'menu-button')) {
        arrowCount += 1;
        menuExpanded = getNodeAttribute(node, 'aria-expanded');
      }
      if (nodeHasClass(node, 'engine-name')) {
        menuNames.push(getNodeText(node));
      }
    });
  }

  return {
    hostCount: hosts.length,
    quickLabels,
    arrowCount,
    menuNames,
    menuExpanded,
  };
}

async function clickClosedControl(page, className) {
  const { cdp, hosts } = await getClosedUiTree(page);
  let control = null;
  if (hosts[0]) {
    walkNodes(hosts[0], (node) => {
      if (!control && nodeHasClass(node, className)) {
        control = node;
      }
    });
  }
  if (!control) {
    throw new Error(`Closed-shadow control .${className} was not found.`);
  }

  const { object } = await cdp.send('DOM.resolveNode', { backendNodeId: control.backendNodeId });
  await cdp.send('Runtime.callFunctionOn', {
    objectId: object.objectId,
    functionDeclaration: 'function () { this.click(); }',
  });
}

async function getClosedMenuMetrics(page, scrollToEnd = false) {
  const { cdp, hosts } = await getClosedUiTree(page);
  let menu = null;
  if (hosts[0]) {
    walkNodes(hosts[0], (node) => {
      if (!menu && nodeHasClass(node, 'menu')) {
        menu = node;
      }
    });
  }
  if (!menu) {
    throw new Error('Closed-shadow engine menu was not found.');
  }

  const { object } = await cdp.send('DOM.resolveNode', { backendNodeId: menu.backendNodeId });
  const response = await cdp.send('Runtime.callFunctionOn', {
    objectId: object.objectId,
    arguments: [{ value: scrollToEnd }],
    returnByValue: true,
    functionDeclaration: `function (shouldScroll) {
      if (shouldScroll) this.scrollTop = this.scrollHeight;
      const rect = this.getBoundingClientRect();
      const lastItem = this.querySelector('[role="menuitem"]:last-child');
      const lastRect = lastItem?.getBoundingClientRect();
      return {
        rect: {
          bottom: rect.bottom,
          height: rect.height,
          left: rect.left,
          right: rect.right,
          top: rect.top,
          width: rect.width
        },
        clientHeight: this.clientHeight,
        scrollHeight: this.scrollHeight,
        scrollTop: this.scrollTop,
        lastItem: lastRect ? {
          bottom: lastRect.bottom,
          top: lastRect.top
        } : null
      };
    }`,
  });
  return response.result.value;
}

async function assertMobileMenuGeometry(page, label) {
  if (!emulateMobile) {
    return;
  }

  await page.waitForTimeout(80);
  const metrics = await getClosedMenuMetrics(page, true);
  const viewport = await page.evaluate(() => ({
    height: window.visualViewport?.height ?? window.innerHeight,
    left: window.visualViewport?.offsetLeft ?? 0,
    top: window.visualViewport?.offsetTop ?? 0,
    width: window.visualViewport?.width ?? window.innerWidth,
  }));
  assert.ok(metrics.rect.left >= viewport.left - 1, `${label}: menu overflows the viewport start.`);
  assert.ok(
    metrics.rect.right <= viewport.left + viewport.width + 1,
    `${label}: menu overflows the viewport end.`,
  );
  assert.ok(metrics.rect.top >= viewport.top - 1, `${label}: menu overflows above the visual viewport.`);
  assert.ok(
    metrics.rect.bottom <= viewport.top + viewport.height + 1,
    `${label}: menu overflows below the visual viewport.`,
  );
  assert.ok(metrics.lastItem, `${label}: menu has no final item.`);
  assert.ok(
    metrics.lastItem.top >= metrics.rect.top - 1
      && metrics.lastItem.bottom <= metrics.rect.bottom + 1,
    `${label}: final menu item is not reachable after scrolling.`,
  );
}

async function waitForControlState(page) {
  const deadline = Date.now() + 20_000;
  let state = null;

  while (Date.now() < deadline) {
    try {
      const automationBlock = await detectAutomationBlock(page);
      if (automationBlock) {
        return {
          ...(state ?? {}),
          automationBlocked: automationBlock,
        };
      }
      state = await getControlState(page);
      const hostVisible = await page.evaluate(() => {
        const host = document.querySelector('[data-free-search-switcher-root]');
        return Boolean(host && getComputedStyle(host).display !== 'none');
      });
      if (state.arrowCount === 1 && hostVisible) {
        return state;
      }
    } catch (error) {
      if (page.isClosed()) {
        throw error;
      }
      // Consent and anti-automation redirects can replace the execution context.
    }
    await page.waitForTimeout(180);
  }

  {
    const diagnostics = await page.evaluate(() => {
      const host = document.querySelector('[data-free-search-switcher-root]');
      return {
        url: location.href,
        title: document.title,
        hostPresent: Boolean(host),
        hostDisplay: host ? getComputedStyle(host).display : null,
        searchForms: document.querySelectorAll('form[role="search"], form[action*="search"]').length,
        namedQueryInputs: document.querySelectorAll('[name="q"], [name="query"]').length,
        bodyText: document.body?.innerText.slice(0, 240),
      };
    });
    log(`Control diagnostics: ${JSON.stringify({ ...diagnostics, state })}`);
    throw new Error('Search-switcher controls did not become visible within 20 seconds.');
  }
}

async function assertMobileControlGeometry(page, label) {
  if (!emulateMobile) {
    return;
  }

  await page.waitForTimeout(120);
  const geometry = await page.evaluate(() => {
    const host = document.querySelector('[data-free-search-switcher-root]');
    const viewport = window.visualViewport;
    const viewportRect = {
      left: viewport?.offsetLeft ?? 0,
      top: viewport?.offsetTop ?? 0,
      width: viewport?.width ?? window.innerWidth,
      height: viewport?.height ?? window.innerHeight,
    };
    const visibleInput = [...document.querySelectorAll('[name="q"], [name="query"]')]
      .find((element) => {
        const rect = element.getBoundingClientRect();
        return rect.width >= 100 && rect.height >= 20 && getComputedStyle(element).visibility !== 'hidden';
      });
    const form = visibleInput?.closest('form') ?? visibleInput?.closest('[role="search"]');
    const inlineSpacer = document.querySelector('[data-free-search-switcher-spacer]');
    let mobileLayoutTarget = form;
    if (location.hostname === 'www.startpage.com' && location.pathname === '/sp/search') {
      mobileLayoutTarget = form?.closest('header') ?? form;
    } else if (location.hostname === 'www.google.com' && location.pathname === '/') {
      mobileLayoutTarget = document.querySelector('#sfcnt') ?? form;
    }
    const hostRect = host?.getBoundingClientRect();
    const inputRect = visibleInput?.getBoundingClientRect();
    const centerElements = hostRect
      ? document.elementsFromPoint(
        hostRect.left + (hostRect.width / 2),
        hostRect.top + (hostRect.height / 2),
      )
      : [];
    const underlyingPageElement = centerElements.find((element) => (
      element !== host
      && !host?.contains(element)
      && element !== document.documentElement
      && element !== document.body
    ));
    const underlyingInteractive = underlyingPageElement?.closest?.(
      'a, button, input, select, textarea, [role="button"], [role="tab"]',
    ) ?? null;

    return {
      reservedMarginBottom: mobileLayoutTarget
        ? Number.parseFloat(getComputedStyle(mobileLayoutTarget).marginBottom)
        : null,
      isQwantResults: location.hostname === 'www.qwant.com'
        && new URL(location.href).searchParams.has('q'),
      isEcosiaResults: location.hostname === 'www.ecosia.org'
        && new URL(location.href).searchParams.has('q'),
      isGoogleResults: location.hostname === 'www.google.com'
        && location.pathname === '/search'
        && new URL(location.href).searchParams.has('q'),
      host: hostRect ? {
        bottom: hostRect.bottom,
        height: hostRect.height,
        left: hostRect.left,
        right: hostRect.right,
        top: hostRect.top,
        width: hostRect.width,
      } : null,
      input: inputRect ? {
        bottom: inputRect.bottom,
        left: inputRect.left,
        right: inputRect.right,
        top: inputRect.top,
      } : null,
      inlineSpacer: inlineSpacer ? (() => {
        const rect = inlineSpacer.getBoundingClientRect();
        return {
          bottom: rect.bottom,
          left: rect.left,
          right: rect.right,
          top: rect.top,
          width: rect.width,
        };
      })() : null,
      placement: host?.getAttribute('data-placement'),
      underlyingInteractive: underlyingInteractive ? (() => {
        const rect = underlyingInteractive.getBoundingClientRect();
        return {
          ariaLabel: underlyingInteractive.getAttribute('aria-label'),
          className: String(underlyingInteractive.className || ''),
          href: underlyingInteractive.getAttribute('href'),
          id: underlyingInteractive.id,
          rect: {
            bottom: rect.bottom,
            left: rect.left,
            right: rect.right,
            top: rect.top,
          },
          tagName: underlyingInteractive.tagName.toLowerCase(),
          text: underlyingInteractive.textContent?.trim().slice(0, 80),
          title: underlyingInteractive.getAttribute('title'),
        };
      })() : null,
      viewport: viewportRect,
    };
  });

  assert.ok(geometry.host, `${label}: mobile control host is missing.`);
  assert.equal(
    geometry.placement,
    geometry.isQwantResults
      ? 'header-gap'
      : ((geometry.isEcosiaResults || geometry.isGoogleResults)
        ? 'inline-slot'
        : 'reserved-below'),
    `${label}: mobile controls need an engine-safe placement.`,
  );
  assert.ok(geometry.host.height >= 47, `${label}: control height is below a 48px touch target.`);
  assert.ok(geometry.host.width >= 47, `${label}: control width is below a 48px touch target.`);
  if (
    !geometry.isQwantResults
    && !geometry.isEcosiaResults
    && !geometry.isGoogleResults
  ) {
    assert.ok(
      geometry.reservedMarginBottom >= 63,
      `${label}: search form did not reserve mobile control space.`,
    );
  }
  if (geometry.isEcosiaResults || geometry.isGoogleResults) {
    assert.ok(geometry.inlineSpacer, `${label}: inline reservation spacer is missing.`);
    assert.ok(
      geometry.inlineSpacer.width >= geometry.host.width + 6,
      `${label}: inline reservation is narrower than the controls.`,
    );
  }
  assert.ok(geometry.host.left >= geometry.viewport.left - 1, `${label}: controls overflow the viewport start.`);
  assert.ok(
    geometry.host.right <= geometry.viewport.left + geometry.viewport.width + 1,
    `${label}: controls overflow the viewport end.`,
  );
  assert.ok(geometry.host.top >= geometry.viewport.top - 1, `${label}: controls overflow above the viewport.`);
  assert.ok(
    geometry.host.bottom <= geometry.viewport.top + geometry.viewport.height + 1,
    `${label}: controls overflow below the viewport.`,
  );
  if (geometry.input) {
    const overlapsInput = geometry.host.left < geometry.input.right
      && geometry.host.right > geometry.input.left
      && geometry.host.top < geometry.input.bottom
      && geometry.host.bottom > geometry.input.top;
    assert.equal(overlapsInput, false, `${label}: controls overlap the search input.`);
  }
  assert.equal(
    geometry.underlyingInteractive,
    null,
    `${label}: controls cover a native interactive element. Geometry: ${JSON.stringify(geometry)}.`,
  );
}

async function assertMobileOptionsLayout(page) {
  if (!emulateMobile) {
    return;
  }

  const layout = await page.evaluate(() => {
    const visibleInteractive = [...document.querySelectorAll(
      'button, select, input:not([type="file"]), label.file-button',
    )].filter((element) => {
      const rect = element.getBoundingClientRect();
      return rect.width > 1 && rect.height > 1 && getComputedStyle(element).display !== 'none';
    });
    return {
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      undersized: visibleInteractive
        .map((element) => ({
          label: element.getAttribute('aria-label') || element.textContent?.trim() || element.id,
          height: element.getBoundingClientRect().height,
        }))
        .filter(({ height }) => height < 47),
    };
  });

  assert.ok(layout.overflow <= 1, `Mobile settings have ${layout.overflow}px of horizontal overflow.`);
  assert.deepEqual(layout.undersized, [], 'Mobile settings contain undersized interactive controls.');
}

async function visit(page, label, url) {
  log(`Opening ${label}: ${url}`);
  await configureMobilePage(page);
  await page.bringToFront();
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45_000 });
  await dismissConsentDialogs(page);
  await page.waitForTimeout(800);
  await dismissConsentDialogs(page);
  await page.waitForTimeout(350);
  const automationBlock = await detectAutomationBlock(page);
  if (automationBlock) {
    log(`Skipping ${label}: ${automationBlock}`);
    return {
      ...(await getControlState(page)),
      automationBlocked: automationBlock,
    };
  }
  const state = await waitForControlState(page);
  if (state.automationBlocked) {
    log(`Skipping ${label}: ${state.automationBlocked}`);
    return state;
  }
  await assertMobileControlGeometry(page, label);
  return state;
}

async function detectAutomationBlock(page) {
  return page.evaluate(() => {
    const text = document.body?.textContent ?? '';
    if (location.hostname === 'www.qwant.com') {
      if (document.querySelector(
        'div[id^="ddChallengeContainer"], style[id^="ddStyleCaptchaBody"]',
      )) {
        return 'Qwant DataDome verification challenge';
      }
      if (text.includes('Qwant is temporarily unavailable') && text.includes('HTTP 40')) {
        return 'Qwant returned its temporary HTTP 403 page';
      }
    }
    if (location.hostname === 'www.google.com' && location.pathname.startsWith('/sorry')) {
      return 'Google redirected automation to its /sorry page';
    }
    if (location.hostname === 'consent.google.com') {
      return 'Google consent interstitial could not be dismissed automatically';
    }
    if (location.hostname === 'www.ecosia.org' && /unusual traffic|access denied/i.test(text)) {
      return 'Ecosia blocked the automated browser request';
    }
    return null;
  });
}

async function dismissConsentDialogs(page) {
  const hostname = new URL(page.url()).hostname;
  if (hostname === 'www.ecosia.org') {
    const action = page.locator('#didomi-notice-agree-button');
    try {
      await action.waitFor({ state: 'visible', timeout: 2_500 });
      log('Dismissing the Ecosia consent notice');
      await action.click();
      await page.waitForTimeout(350);
    } catch {
      // No consent notice was shown for this browser profile.
    }
    return;
  }

  if (hostname !== 'www.google.com' && hostname !== 'consent.google.com') {
    return;
  }

  const action = page.getByRole('button', {
    name: /^(reject all|rejeitar tudo|accept all|aceitar tudo)$/i,
  }).first();

  try {
    await action.waitFor({ state: 'visible', timeout: 2_500 });
    log('Dismissing the Google consent interstitial');
    await action.click();
    await page.waitForTimeout(350);
  } catch {
    // No consent interstitial was shown for this browser profile.
  }
}

async function clickQuickSwitch(page) {
  await clickClosedControl(page, 'quick-button');
}

async function waitForQuickLabel(page, expectedLabel) {
  const deadline = Date.now() + 10_000;
  while (Date.now() < deadline) {
    const state = await getControlState(page);
    if (state.quickLabels[0] === expectedLabel) {
      return;
    }
    await page.waitForTimeout(120);
  }
  throw new Error(`Quick-switch label did not update to ${expectedLabel}.`);
}

async function submitStartpageSearch(page) {
  await configureMobilePage(page);
  await page.goto('https://www.startpage.com/', {
    waitUntil: 'domcontentloaded',
    timeout: 45_000,
  });
  const input = page.locator('form#search input#q[name="query"]');
  await input.waitFor({ timeout: 20_000 });
  await input.fill(complexQuery);
  await Promise.all([
    page.waitForURL((url) => url.pathname.startsWith('/sp/search'), { timeout: 45_000 }),
    input.press('Enter'),
  ]);
  await waitForControlState(page);
  await assertMobileControlGeometry(page, 'Startpage submitted results');
  assert.equal(new URL(page.url()).searchParams.has('query'), false);
}

async function assertNoInjectedUi(page) {
  await page.waitForTimeout(500);
  assert.equal(
    await page.locator('[data-free-search-switcher-root]').count(),
    0,
    'Custom or unrelated pages must not receive controls.',
  );
}

await access(path.join(extensionPath, 'manifest.json'));
await access(browserPath);
if (captureScreenshots) {
  await mkdir(screenshotsPath, { recursive: true });
}

let context;
try {
  log(`Launching Brave with ${extensionPath}`);
  context = await launchBrowser();
  const extensionId = await getExtensionId(context);
  const installOptionsPage = await waitForInstallOptionsPage(context, extensionId);
  assert.ok(installOptionsPage, 'The settings page should open on first install.');
  let optionsPage = installOptionsPage ?? await getOptionsPage(context, extensionId);
  await configureMobilePage(optionsPage);
  if (emulateMobile) {
    await optionsPage.reload({ waitUntil: 'domcontentloaded' });
    await optionsPage.waitForSelector('h1');
  }

  const builtInNames = await optionsPage
    .locator('#built-in-engine-list .engine-chip > span:last-child')
    .allTextContents();
  assert.deepEqual(builtInNames, [
    'Ecosia',
    'Startpage',
    'DuckDuckGo',
    'Qwant',
    'Bing',
    'Brave',
    'Google',
  ]);
  assert.equal(await optionsPage.locator('#second-preference').isDisabled(), true);
  await assertMobileOptionsLayout(optionsPage);

  log('Creating a custom engine through the settings UI');
  await optionsPage.locator('#add-custom-engine').click();
  await assertMobileOptionsLayout(optionsPage);
  await optionsPage.locator('#custom-name').fill('Example Search');
  await optionsPage.locator('#custom-home-url').fill('https://example.com/');
  await optionsPage.locator('#custom-search-url').fill('https://example.com/search?q={query}');
  await optionsPage.locator('#custom-icon-file').setInputFiles(
    path.join(repositoryRoot, 'public', 'icons', 'icon-32.png'),
  );
  await optionsPage.locator('#custom-engine-form button[type="submit"]').click();
  await optionsPage.locator('.custom-card', { hasText: 'Example Search' }).waitFor();
  let storedSettings = await readSettings(optionsPage);
  assert.equal(storedSettings.customEngines.length, 1);
  assert.match(storedSettings.customEngines[0].iconDataUrl, /^data:image\/png;base64,/);
  const customEngineId = storedSettings.customEngines[0].id;

  await optionsPage.locator('#first-preference').selectOption(customEngineId);
  await optionsPage.waitForFunction(
    async ({ key, engineId }) => (await globalThis.chrome.storage.local.get(key))[key]?.firstPreferredEngineId === engineId,
    { key: storageKey, engineId: customEngineId },
  );
  assert.equal(await optionsPage.locator('#second-preference').isEnabled(), true);
  await optionsPage.locator('#second-preference').selectOption('google');
  await optionsPage.waitForFunction(
    async (key) => (await globalThis.chrome.storage.local.get(key))[key]?.secondPreferredEngineId === 'google',
    storageKey,
  );
  assert.equal(
    await optionsPage
      .locator('#second-preference option[value="' + customEngineId + '"]')
      .evaluate((option) => option.disabled),
    true,
  );
  await optionsPage.locator('#continue-without-preference').click();
  await optionsPage.waitForFunction(
    async (key) => !(await globalThis.chrome.storage.local.get(key))[key]?.firstPreferredEngineId,
    storageKey,
  );

  if (captureScreenshots) {
    await optionsPage.screenshot({
      path: path.join(screenshotsPath, 'settings.png'),
      fullPage: true,
    });
  }

  const searchPage = await context.newPage();
  storedSettings = await readSettings(optionsPage);
  await writeSettings(optionsPage, {
    ...storedSettings,
    firstPreferredEngineId: null,
    secondPreferredEngineId: null,
  });

  log('Checking no-preference controls on every homepage and results page');
  for (const engine of builtInPages) {
    const homeState = await visit(searchPage, `${engine.name} homepage`, engine.home);
    if (homeState.automationBlocked) {
      continue;
    }
    assert.equal(homeState.hostCount, 1);
    assert.equal(homeState.arrowCount, 1);
    assert.deepEqual(homeState.quickLabels, []);

    if (engine.id === 'startpage') {
      await submitStartpageSearch(searchPage);
    } else {
      const resultState = await visit(searchPage, `${engine.name} results`, engine.results);
      if (resultState.automationBlocked) {
        continue;
      }
      assert.equal(resultState.hostCount, 1);
      assert.equal(resultState.arrowCount, 1);
      assert.deepEqual(resultState.quickLabels, []);
    }
  }

  const ecosiaState = await visit(searchPage, 'Ecosia menu-order check', builtInPages[0].home);
  assert.deepEqual(ecosiaState.menuNames, [
    'Startpage',
    'DuckDuckGo',
    'Qwant',
    'Bing',
    'Brave',
    'Google',
    'Example Search',
  ]);

  log('Checking menu keyboard behavior and dynamic DOM recovery');
  await clickClosedControl(searchPage, 'menu-button');
  assert.equal((await getControlState(searchPage)).menuExpanded, 'true');
  await assertMobileMenuGeometry(searchPage, 'Portrait engine menu');
  await searchPage.keyboard.press('Escape');
  assert.equal((await getControlState(searchPage)).menuExpanded, 'false');

  if (emulateMobile) {
    for (const viewport of [
      { width: 360, height: 640, label: 'Compact portrait' },
      { width: 640, height: 360, label: 'Landscape' },
    ]) {
      await setMobileViewport(searchPage, viewport);
      await searchPage.waitForTimeout(450);
      await waitForControlState(searchPage);
      await assertMobileControlGeometry(searchPage, `${viewport.label} controls`);
      await clickClosedControl(searchPage, 'menu-button');
      assert.equal((await getControlState(searchPage)).menuExpanded, 'true');
      await assertMobileMenuGeometry(searchPage, `${viewport.label} engine menu`);
      await searchPage.keyboard.press('Escape');
    }
    await setMobileViewport(searchPage);
    await searchPage.waitForTimeout(450);
    await waitForControlState(searchPage);
  }

  await searchPage.evaluate(() => {
    const form = document.querySelector('form[role="search"][action="/search"]');
    const marker = document.createComment('search-form-marker');
    form.before(marker);
    form.remove();
    setTimeout(() => marker.replaceWith(form), 450);
  });
  await searchPage.waitForTimeout(1_000);
  const recoveredState = await waitForControlState(searchPage);
  assert.equal(recoveredState.hostCount, 1);

  const beforeLayoutShift = await searchPage.evaluate(() => ({
    anchorTop: document.querySelector('form[role="search"][action="/search"]').getBoundingClientRect().top,
    hostTop: document.querySelector('[data-free-search-switcher-root]').getBoundingClientRect().top,
  }));
  await searchPage.evaluate(() => {
    const style = document.createElement('style');
    style.id = 'free-search-switcher-layout-shift-test';
    style.textContent = 'form[role="search"][action="/search"] { transform: translateY(72px) !important; }';
    document.head.append(style);
  });
  await searchPage.waitForFunction((before) => {
    const form = document.querySelector('form[role="search"][action="/search"]');
    const host = document.querySelector('[data-free-search-switcher-root]');
    return form.getBoundingClientRect().top > before.anchorTop + 50
      && host.getBoundingClientRect().top > before.hostTop + 50;
  }, beforeLayoutShift);
  await searchPage.evaluate(() => {
    document.querySelector('#free-search-switcher-layout-shift-test').remove();
  });
  await searchPage.waitForFunction((before) => (
    document.querySelector('[data-free-search-switcher-root]').getBoundingClientRect().top
      < before.hostTop + 10
  ), beforeLayoutShift);

  if (captureScreenshots) {
    await clickClosedControl(searchPage, 'menu-button');
    assert.equal((await getControlState(searchPage)).menuExpanded, 'true');
    await searchPage.screenshot({
      path: path.join(screenshotsPath, 'search-controls.png'),
      fullPage: false,
    });
    await searchPage.keyboard.press('Escape');
  }

  log('Checking zero-, one-, and two-preference quick-target rules');
  await writeSettings(optionsPage, {
    ...storedSettings,
    firstPreferredEngineId: 'ecosia',
    secondPreferredEngineId: null,
  });
  assert.deepEqual((await visit(searchPage, 'Ecosia with one preference', builtInPages[0].home)).quickLabels, []);
  assert.deepEqual(
    (await visit(searchPage, 'Bing with one preference', builtInPages[4].home)).quickLabels,
    ['Switch to Ecosia'],
  );

  await writeSettings(optionsPage, {
    ...storedSettings,
    firstPreferredEngineId: 'ecosia',
    secondPreferredEngineId: 'google',
  });
  assert.deepEqual(
    (await visit(searchPage, 'Ecosia with two preferences', builtInPages[0].home)).quickLabels,
    ['Switch to Google'],
  );
  assert.deepEqual(
    (await visit(searchPage, 'Google with two preferences', builtInPages[6].home)).quickLabels,
    ['Switch to Ecosia'],
  );
  const bingTwoPreferenceState = await visit(searchPage, 'Bing with two preferences', builtInPages[4].home);
  assert.deepEqual(bingTwoPreferenceState.quickLabels, ['Switch to Ecosia']);

  await writeSettings(optionsPage, {
    ...storedSettings,
    firstPreferredEngineId: 'google',
    secondPreferredEngineId: null,
  });
  await waitForQuickLabel(searchPage, 'Switch to Google');

  log('Checking homepage navigation for every engine');
  await writeSettings(optionsPage, {
    ...storedSettings,
    firstPreferredEngineId: customEngineId,
    secondPreferredEngineId: null,
  });

  log('Checking immediate SPA URL changes before the navigation poll');
  await visit(searchPage, 'Ecosia SPA home-to-results check', builtInPages[0].home);
  await searchPage.evaluate((query) => {
    history.pushState({}, '', `/search?q=${encodeURIComponent(query)}`);
  }, complexQuery);
  await Promise.all([
    searchPage.waitForURL((url) => url.hostname === 'example.com', { timeout: 30_000 }),
    clickQuickSwitch(searchPage),
  ]);
  assert.equal(new URL(searchPage.url()).searchParams.get('q'), complexQuery);

  await visit(searchPage, 'Ecosia SPA results-to-home check', builtInPages[0].results);
  await searchPage.evaluate(() => history.pushState({}, '', '/'));
  await Promise.all([
    searchPage.waitForURL((url) => url.hostname === 'example.com', { timeout: 30_000 }),
    clickQuickSwitch(searchPage),
  ]);
  assert.equal(new URL(searchPage.url()).pathname, '/');
  assert.equal(new URL(searchPage.url()).search, '');

  log('Checking typed-but-unsubmitted homepage text is not transferred');
  await visit(searchPage, 'Ecosia unsubmitted-text check', builtInPages[0].home);
  await searchPage.locator('form[role="search"] [name="q"]').fill(complexQuery);
  await Promise.all([
    searchPage.waitForURL((url) => url.hostname === 'example.com', { timeout: 30_000 }),
    clickQuickSwitch(searchPage),
  ]);
  assert.equal(new URL(searchPage.url()).pathname, '/');
  assert.equal(new URL(searchPage.url()).search, '');

  for (const engine of builtInPages) {
    const homeState = await visit(searchPage, `${engine.name} homepage navigation`, engine.home);
    if (homeState.automationBlocked) {
      continue;
    }
    await Promise.all([
      searchPage.waitForURL((url) => url.hostname === 'example.com', { timeout: 30_000 }),
      clickQuickSwitch(searchPage),
    ]);
    const target = new URL(searchPage.url());
    assert.equal(target.pathname, '/');
    assert.equal(target.search, '');
    await assertNoInjectedUi(searchPage);
  }

  log('Checking submitted-query navigation for every engine');
  for (const engine of builtInPages) {
    if (engine.id === 'startpage') {
      await submitStartpageSearch(searchPage);
      await searchPage.locator('form#search input#q[name="query"]').fill('UNSUBMITTED EDIT');
    } else {
      const resultState = await visit(searchPage, `${engine.name} query transfer`, engine.results);
      if (resultState.automationBlocked) {
        continue;
      }
      if (engine.id === 'ecosia') {
        await searchPage.locator('form[role="search"] [name="q"]').fill('UNSUBMITTED EDIT');
      }
    }
    await Promise.all([
      searchPage.waitForURL((url) => url.hostname === 'example.com', { timeout: 30_000 }),
      clickQuickSwitch(searchPage),
    ]);
    assert.equal(new URL(searchPage.url()).searchParams.get('q'), complexQuery);
    await assertNoInjectedUi(searchPage);
  }

  log('Checking unrelated pages receive no controls');
  await searchPage.goto('https://example.org/', { waitUntil: 'domcontentloaded', timeout: 30_000 });
  await assertNoInjectedUi(searchPage);

  log('Checking settings persistence across a browser restart');
  const persistedBeforeRestart = await readSettings(optionsPage);
  const restartMarkerPage = await context.newPage();
  await restartMarkerPage.goto('about:blank');
  await Promise.all(
    context.pages()
      .filter((page) => page !== restartMarkerPage)
      .map((page) => page.close()),
  );
  await stopBrowser();
  context = await launchBrowser();
  const restartedExtensionId = await getExtensionId(context);
  assert.equal(restartedExtensionId, extensionId);
  await new Promise((resolve) => setTimeout(resolve, 1_500));
  assert.equal(
    context.pages().some((page) => page.url() === `chrome-extension://${extensionId}/options.html`),
    false,
    'The onboarding page must not open again on browser restart.',
  );
  optionsPage = await getOptionsPage(context, extensionId);
  await configureMobilePage(optionsPage);
  if (emulateMobile) {
    await optionsPage.reload({ waitUntil: 'domcontentloaded' });
    await optionsPage.waitForSelector('h1');
  }
  assert.deepEqual(await readSettings(optionsPage), persistedBeforeRestart);

  log('Checking custom-engine edit and preference-safe deletion');
  await optionsPage.reload();
  const customCard = optionsPage.locator('.custom-card', { hasText: 'Example Search' });
  await customCard.getByRole('button', { name: 'Edit Example Search' }).click();
  await optionsPage.locator('#custom-name').fill('Example Search Renamed');
  await optionsPage.locator('#custom-engine-form button[type="submit"]').click();
  await optionsPage.locator('.custom-card', { hasText: 'Example Search Renamed' }).waitFor();
  storedSettings = await readSettings(optionsPage);
  assert.equal(storedSettings.customEngines[0].id, customEngineId);

  await optionsPage.locator('#first-preference').selectOption(customEngineId);
  await optionsPage.locator('#second-preference').selectOption('google');
  optionsPage.once('dialog', (dialog) => dialog.accept());
  await optionsPage.getByRole('button', { name: 'Delete Example Search Renamed' }).click();
  await optionsPage.waitForFunction(
    async (key) => (await globalThis.chrome.storage.local.get(key))[key]?.customEngines?.length === 0,
    storageKey,
  );
  storedSettings = await readSettings(optionsPage);
  assert.equal(storedSettings.firstPreferredEngineId, null);
  assert.equal(storedSettings.secondPreferredEngineId, null);

  log('All Brave integration checks passed.');
} finally {
  await stopBrowser();
  const safeTempParent = path.resolve(tmpdir());
  const resolvedProfile = path.resolve(profilePath);
  if (
    resolvedProfile.startsWith(`${safeTempParent}${path.sep}`)
    && path.basename(resolvedProfile).startsWith('free-search-switcher-')
  ) {
    await rm(resolvedProfile, { recursive: true, force: true });
  }
}
