import { describe, expect, it, vi } from 'vitest';
import { normalizeSettings } from '../utils/settings.js';
import { createPageState, needsPageReload, PAGE_STATE_MESSAGE } from '../utils/page-state.js';
import { isAndroid, PopupController } from '../utils/popup-controller.js';

function fixture(raw = {}, engineId = 'ecosia') {
  let saved = normalizeSettings(raw);
  let snapshot = engineId ? createPageState(engineId, saved) : null;
  const state = {};
  const storage = {
    loadSettings: async () => saved,
    updateSettings: vi.fn(async (patch) => { saved = normalizeSettings({ ...saved, ...patch }); return saved; }),
    listenForSettingsChanges: (callback) => { state.external = callback; return vi.fn(); },
  };
  const browser = {
    tabs: {
      query: vi.fn(async () => [{ id: 12 }]),
      sendMessage: vi.fn(async () => {
        if (!snapshot) throw new Error('No receiver');
        return snapshot;
      }),
      reload: vi.fn(async () => { snapshot = createPageState(engineId, saved); }),
    },
    runtime: { openOptionsPage: vi.fn(async () => {}) },
  };
  const controller = new PopupController({ browser, storage });
  return { controller, browser, storage, state, saved: () => saved };
}

describe('desktop popup', () => {
  it('persists global changes immediately and compares against the actual loaded page across popup sessions', async () => {
    const { controller, storage, browser, saved } = fixture();
    await controller.start();
    expect(controller.reloadRequired).toBe(false);
    await controller.change({ enabled: false });
    expect(saved().enabled).toBe(false);
    expect(controller.reloadRequired).toBe(true);
    await controller.change({ enabled: true });
    expect(controller.reloadRequired).toBe(false);
    await controller.change({ enabled: false });
    expect(controller.reloadRequired).toBe(true);
    const reopened = new PopupController({ browser, storage });
    await reopened.start();
    expect(reopened.reloadRequired).toBe(true);
    expect(browser.tabs.query).toHaveBeenCalledWith({ active: true, currentWindow: true });
    expect(browser.tabs.sendMessage).toHaveBeenCalledWith(12, { type: PAGE_STATE_MESSAGE }, { frameId: 0 });
    await reopened.reloadPage();
    expect(browser.tabs.reload).toHaveBeenCalledWith(12);
    await reopened.refreshPageState();
    expect(reopened.reloadRequired).toBe(false);
    expect(reopened.pageState.eligible).toBe(false);
  });

  it('handles a page that originally loaded disabled', async () => {
    const { controller } = fixture({ enabled: false });
    await controller.start();
    await controller.change({ enabled: true });
    expect(controller.reloadRequired).toBe(true);
    await controller.change({ enabled: false });
    expect(controller.reloadRequired).toBe(false);
  });

  it('does not show misleading warnings or reload unsupported pages', async () => {
    const { controller, browser } = fixture({}, null);
    await controller.start();
    await controller.change({ enabled: false });
    expect(controller.reloadRequired).toBe(false);
    await controller.reloadPage();
    expect(browser.tabs.reload).not.toHaveBeenCalled();
  });

  it('requires no reload if injection stays disabled for the current site', async () => {
    const { controller } = fixture({ siteEnabled: { ecosia: false } });
    await controller.start();
    await controller.change({ enabled: false });
    expect(controller.reloadRequired).toBe(false);
  });

  it('immediately saves preferences including custom destinations and enforces preferred invariants', async () => {
    const custom = { id: 'custom-one', name: 'Custom', homeUrl: 'https://example.com/', searchUrlTemplate: 'https://example.com/?q={query}', iconUrl: null };
    const { controller, saved } = fixture({ customEngines: [custom] });
    await controller.start();
    await controller.change({ firstPreferredEngineId: custom.id });
    await controller.change({ secondPreferredEngineId: 'google' });
    expect(saved().firstPreferredEngineId).toBe(custom.id);
    expect(saved().secondPreferredEngineId).toBe('google');
    await controller.change({ firstPreferredEngineId: 'google' });
    expect(saved().secondPreferredEngineId).toBeNull();
    await controller.change({ firstPreferredEngineId: null });
    expect(saved().firstPreferredEngineId).toBeNull();
    expect(controller.reloadRequired).toBe(false);
  });

  it('opens the full Options page and refreshes externally saved settings', async () => {
    const { controller, browser, state } = fixture();
    await controller.start();
    state.external(normalizeSettings({ enabled: false }));
    expect(controller.reloadRequired).toBe(true);
    await controller.openSettings();
    expect(browser.runtime.openOptionsPage).toHaveBeenCalledTimes(1);
  });

  it('propagates save failure without claiming the setting was persisted', async () => {
    const { controller, storage } = fixture();
    await controller.start();
    storage.updateSettings.mockRejectedValueOnce(new Error('quota'));
    await expect(controller.change({ enabled: false })).rejects.toThrow('quota');
    expect(controller.settings.enabled).toBe(true);
    expect(controller.reloadRequired).toBe(false);
  });

  it('rejects malformed/unrelated page snapshots', () => {
    expect(needsPageReload(normalizeSettings(), { engineId: 'custom-one', eligible: false })).toBe(false);
    expect(needsPageReload(normalizeSettings(), { engineId: 'google' })).toBe(false);
  });
});

describe('Android popup routing', () => {
  it('uses platform detection with a user-agent fallback', async () => {
    expect(await isAndroid({ getPlatformInfo: async () => ({ os: 'android' }) })).toBe(true);
    expect(await isAndroid({ getPlatformInfo: async () => ({ os: 'win' }) })).toBe(false);
    expect(await isAndroid({}, 'Mozilla/5.0 Android')).toBe(true);
  });
});
