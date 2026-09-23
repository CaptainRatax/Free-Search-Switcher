import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const { version } = JSON.parse(await readFile(path.join(repositoryRoot, 'package.json'), 'utf8'));
const firefoxPath = process.env.FSS_FIREFOX_PATH;
const geckodriverPath = process.env.FSS_GECKODRIVER_PATH;
const extensionArchive = process.env.FSS_FIREFOX_EXTENSION
  || path.join(repositoryRoot, '.output', `free-search-switcher-${version}-firefox.zip`);
const complexQuery = 'privacidade café & "pesquisa livre" 世界';
const storageKey = 'freeSearchSwitcherSettings';
const emulateMobile = process.env.FSS_FIREFOX_MOBILE === '1';
const mobileUserAgent = 'Mozilla/5.0 (Android 15; Mobile; rv:153.0) Gecko/153.0 Firefox/153.0';
const preferredEngineId = emulateMobile ? 'ecosia' : 'google';
const preferredHostname = emulateMobile ? 'www.ecosia.org' : 'www.google.com';

if (!firefoxPath || !geckodriverPath) {
  throw new Error('Set FSS_FIREFOX_PATH and FSS_GECKODRIVER_PATH before running the Firefox smoke test.');
}

function log(message) {
  process.stdout.write(`[firefox] ${message}\n`);
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

const port = await findAvailablePort();
const endpoint = `http://127.0.0.1:${port}`;
const driver = spawn(geckodriverPath, [
  '--allow-system-access',
  '--host',
  '127.0.0.1',
  '--port',
  String(port),
], {
  stdio: ['ignore', 'pipe', 'pipe'],
  windowsHide: true,
});

let driverOutput = '';
driver.stdout.on('data', (chunk) => {
  driverOutput += chunk.toString();
});
driver.stderr.on('data', (chunk) => {
  driverOutput += chunk.toString();
});

async function webdriver(method, route, body) {
  const response = await fetch(`${endpoint}${route}`, {
    method,
    headers: body === undefined ? undefined : { 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const payload = await response.json();
  if (!response.ok || payload.value?.error) {
    throw new Error(`WebDriver ${method} ${route} failed: ${JSON.stringify(payload.value)}`);
  }
  return payload.value;
}

async function waitForDriver() {
  const deadline = Date.now() + 20_000;
  while (Date.now() < deadline) {
    try {
      const status = await webdriver('GET', '/status');
      if (status.ready) {
        return;
      }
    } catch {
      // geckodriver is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 120));
  }
  throw new Error(`geckodriver did not become ready.\n${driverOutput}`);
}

async function waitForCondition(check, message, timeout = 20_000) {
  const deadline = Date.now() + timeout;
  let latest;
  while (Date.now() < deadline) {
    latest = await check();
    if (latest) {
      return latest;
    }
    await new Promise((resolve) => setTimeout(resolve, 180));
  }
  throw new Error(`${message}. Latest value: ${JSON.stringify(latest)}`);
}

let sessionId = null;
try {
  await waitForDriver();
  log('Launching Firefox through geckodriver');
  const session = await webdriver('POST', '/session', {
    capabilities: {
      alwaysMatch: {
        browserName: 'firefox',
        acceptInsecureCerts: true,
        'moz:firefoxOptions': {
          binary: firefoxPath,
          args: emulateMobile
            ? ['-width', '393', '-height', '852']
            : ['-width', '1440', '-height', '900'],
          prefs: {
            'extensions.install.requireBuiltInCerts': false,
            'xpinstall.signatures.required': false,
            ...(emulateMobile ? { 'general.useragent.override': mobileUserAgent } : {}),
          },
        },
      },
    },
  });
  sessionId = session.sessionId;
  const route = `/session/${sessionId}`;
  const initialHandle = await webdriver('GET', `${route}/window`);

  log('Installing the Firefox Manifest V3 archive temporarily');
  const archiveBase64 = (await readFile(extensionArchive)).toString('base64');
  const installedId = await webdriver('POST', `${route}/moz/addon/install`, {
    addon: archiveBase64,
    temporary: true,
  });
  assert.equal(installedId, '{9b6a0b52-51a6-44e1-945d-19209156934e}');

  const optionsWindow = await waitForCondition(async () => {
    const handles = await webdriver('GET', `${route}/window/handles`);
    for (const handle of handles) {
      await webdriver('POST', `${route}/window`, { handle });
      const url = await webdriver('GET', `${route}/url`);
      if (url.startsWith('moz-extension://') && url.endsWith('/options.html')) {
        return { handle, url };
      }
    }
    return null;
  }, 'Firefox onboarding did not open after temporary installation');
  log(`Onboarding opened at ${optionsWindow.url}`);

  await webdriver('POST', `${route}/execute/async`, {
    script: `
      const done = arguments[arguments.length - 1];
      globalThis.browser.storage.sync.set({
        '${storageKey}': {
          schemaVersion: 2,
          enabled: true,
          siteEnabled: { ecosia: true, startpage: true, duckduckgo: true, qwant: true, bing: true, brave: true, google: true },
          firstPreferredEngineId: '${preferredEngineId}',
          secondPreferredEngineId: null,
          customEngines: []
        }
      }).then(() => done(true), (error) => done({ error: String(error) }));
    `,
    args: [],
  });

  await webdriver('POST', `${route}/window`, { handle: initialHandle });
  const bingResults = `https://www.bing.com/search?q=${encodeURIComponent(complexQuery)}`;
  await webdriver('POST', `${route}/url`, { url: bingResults });

  const hostState = await waitForCondition(async () => webdriver('POST', `${route}/execute/sync`, {
    script: `
      const host = document.querySelector('[data-free-search-switcher-root]');
      if (!host || getComputedStyle(host).display === 'none') return null;
      const rect = host.getBoundingClientRect();
      return {
        count: document.querySelectorAll('[data-free-search-switcher-root]').length,
        shadowClosed: host.shadowRoot === null,
        placement: host.getAttribute('data-placement'),
        width: rect.width,
        height: rect.height,
        viewportWidth: innerWidth,
        formMarginBottom: Number.parseFloat(getComputedStyle(document.querySelector('#sb_form')).marginBottom)
      };
    `,
    args: [],
  }), 'Firefox controls did not appear on Bing results');
  assert.equal(hostState.count, 1);
  assert.equal(hostState.shadowClosed, true);
  assert.ok(hostState.width >= 60, `Expected quick button and arrow, got ${hostState.width}px.`);
  if (emulateMobile) {
    assert.equal(hostState.placement, 'reserved-below');
    assert.ok(hostState.height >= 47, `Expected a 48px mobile touch target, got ${hostState.height}px.`);
    assert.ok(hostState.formMarginBottom >= 63, 'Expected reserved mobile space after the Bing form.');
    assert.ok(hostState.viewportWidth <= 700, `Expected a mobile viewport, got ${hostState.viewportWidth}px.`);
  }
  log(`Closed-shadow controls mounted (${Math.round(hostState.width)} × ${Math.round(hostState.height)} px)`);

  async function clickQuickControl() {
    const rect = await webdriver('POST', `${route}/execute/sync`, {
      script: `
        const host = document.querySelector('[data-free-search-switcher-root]');
        const bounds = host.getBoundingClientRect();
        return { x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height };
      `,
      args: [],
    });
    await webdriver('POST', `${route}/actions`, {
      actions: [
        {
          type: 'pointer',
          id: 'mouse',
          parameters: { pointerType: 'mouse' },
          actions: [
            {
              type: 'pointerMove',
              duration: 0,
              origin: 'viewport',
              x: Math.round(rect.x + Math.min(24, rect.width / 4)),
              y: Math.round(rect.y + (rect.height / 2)),
            },
            { type: 'pointerDown', button: 0 },
            { type: 'pointerUp', button: 0 },
          ],
        },
      ],
    });
    await webdriver('DELETE', `${route}/actions`);
  }

  await clickQuickControl();
  const transferredUrl = await waitForCondition(async () => {
    const url = await webdriver('GET', `${route}/url`);
    return new URL(url).hostname === preferredHostname ? url : null;
  }, 'Firefox quick switch did not navigate to the preferred engine', 30_000);
  assert.equal(new URL(transferredUrl).searchParams.get('q'), complexQuery);
  log(`Firefox transferred the complex submitted query to ${preferredEngineId}`);

  log('Checking search-mode preservation on the packaged Firefox build');
  const bingImagesResults = `https://www.bing.com/images/search?q=${encodeURIComponent(complexQuery)}`;
  await webdriver('POST', `${route}/url`, { url: bingImagesResults });
  await waitForCondition(async () => webdriver('POST', `${route}/execute/sync`, {
    script: `
      const host = document.querySelector('[data-free-search-switcher-root]');
      return Boolean(host && getComputedStyle(host).display !== 'none');
    `,
    args: [],
  }), 'Firefox controls did not appear on Bing Images results');
  await clickQuickControl();
  const modeTransferredUrl = await waitForCondition(async () => {
    const url = await webdriver('GET', `${route}/url`);
    return new URL(url).hostname === preferredHostname ? url : null;
  }, 'Firefox mode-preserving quick switch did not navigate to the preferred engine', 30_000);
  const modeUrl = new URL(modeTransferredUrl);
  assert.equal(modeUrl.searchParams.get('q'), complexQuery);
  if (emulateMobile) {
    // Ecosia supports Images at /images?q=.
    assert.equal(modeUrl.pathname, '/images');
  } else {
    assert.equal(modeUrl.searchParams.get('udm'), '2');
  }
  log(`Firefox preserved the images search mode when switching to ${preferredEngineId}`);

  await webdriver('POST', `${route}/url`, { url: 'https://www.bing.com/' });
  await waitForCondition(async () => webdriver('POST', `${route}/execute/sync`, {
    script: `
      const host = document.querySelector('[data-free-search-switcher-root]');
      return Boolean(host && getComputedStyle(host).display !== 'none');
    `,
    args: [],
  }), 'Firefox controls did not appear on the Bing homepage');
  await webdriver('POST', `${route}/execute/sync`, {
    script: `
      const input = document.querySelector('#sb_form_q');
      input.value = 'UNSUBMITTED EDIT';
      input.dispatchEvent(new Event('input', { bubbles: true }));
      return input.value;
    `,
    args: [],
  });
  await clickQuickControl();
  const homepageTarget = await waitForCondition(async () => {
    const url = await webdriver('GET', `${route}/url`);
    return new URL(url).hostname === preferredHostname ? url : null;
  }, 'Firefox homepage quick switch did not navigate to the preferred engine', 30_000);
  const homepageUrl = new URL(homepageTarget);
  assert.equal(homepageUrl.pathname, '/');
  assert.equal(homepageUrl.search, '');
  log('Firefox ignored typed-but-unsubmitted homepage text');

  await webdriver('POST', `${route}/url`, { url: 'https://example.org/' });
  const unrelatedCount = await webdriver('POST', `${route}/execute/sync`, {
    script: `return document.querySelectorAll('[data-free-search-switcher-root]').length;`,
    args: [],
  });
  assert.equal(unrelatedCount, 0);
  log('Firefox injected no controls on an unrelated origin');
  log(`All Firefox Manifest V3${emulateMobile ? ' mobile-layout' : ''} smoke checks passed.`);
} finally {
  if (sessionId) {
    await webdriver('DELETE', `/session/${sessionId}`).catch(() => {});
  }
  if (driver.exitCode === null) {
    driver.kill();
  }
}
