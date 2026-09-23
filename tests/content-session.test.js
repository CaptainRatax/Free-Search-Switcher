import { describe, expect, it, vi } from 'vitest';
import { startContentSession } from '../utils/content-session.js';
import { normalizeSettings } from '../utils/settings.js';
import { PAGE_STATE_MESSAGE } from '../utils/page-state.js';

function fixture(raw = {}) {
  const state = {};
  const ui = { start: vi.fn(), stop: vi.fn(), updateSettings: vi.fn() };
  const dependencies = {
    adapter: { id: 'ecosia' },
    context: { onInvalidated: (callback) => { state.invalidate = callback; } },
    runtime: { onMessage: {
      addListener: (callback) => { state.respond = callback; },
      removeListener: vi.fn(),
    } },
    loadSettings: async () => normalizeSettings(raw),
    listenForSettingsChanges: (callback) => { state.change = callback; return state.unsubscribe; },
    createUi: vi.fn(() => ui),
  };
  state.unsubscribe = vi.fn();
  return { state, ui, dependencies };
}

describe('content page-load eligibility', () => {
  it.each([
    [{}, true],
    [{ enabled: false }, false],
    [{ siteEnabled: { ecosia: false } }, false],
    [{ siteEnabled: { google: false } }, true],
  ])('starts only when the detected site and global settings allow: %j', async (raw, eligible) => {
    const { state, ui, dependencies } = fixture(raw);
    await startContentSession(dependencies);
    expect(ui.start).toHaveBeenCalledTimes(eligible ? 1 : 0);
    expect(await state.respond({ type: PAGE_STATE_MESSAGE })).toEqual({
      engineId: 'ecosia', enabled: raw.enabled ?? true,
      siteEnabled: raw.siteEnabled?.ecosia ?? true, eligible,
    });
    expect(state.respond({ type: 'unrelated' })).toBeUndefined();
  });

  it('keeps UI running and its original snapshot while updating destinations/preferences', async () => {
    const { state, ui, dependencies } = fixture();
    await startContentSession(dependencies);
    const next = normalizeSettings({ enabled: false, siteEnabled: { ecosia: false }, firstPreferredEngineId: 'google' });
    state.change(next);
    expect(ui.start).toHaveBeenCalledTimes(1);
    expect(ui.stop).not.toHaveBeenCalled();
    expect(ui.updateSettings).toHaveBeenCalledWith(expect.objectContaining({ enabled: true, firstPreferredEngineId: 'google' }));
    expect((await state.respond({ type: PAGE_STATE_MESSAGE })).eligible).toBe(true);
    state.invalidate();
    expect(ui.stop).toHaveBeenCalledTimes(1);
    expect(state.unsubscribe).toHaveBeenCalledTimes(1);
    expect(dependencies.runtime.onMessage.removeListener).toHaveBeenCalledWith(state.respond);
  });

  it('does not subscribe to dynamically start UI on an ineligible page', async () => {
    const { state, dependencies } = fixture({ enabled: false });
    await startContentSession(dependencies);
    expect(state.change).toBeUndefined();
    expect(dependencies.createUi).not.toHaveBeenCalled();
    expect((await state.respond({ type: PAGE_STATE_MESSAGE })).enabled).toBe(false);
    state.invalidate();
    expect(dependencies.runtime.onMessage.removeListener).toHaveBeenCalled();
  });

  it('answers requests during initialization and never starts after invalidation', async () => {
    const { state, dependencies } = fixture();
    let resolve;
    dependencies.loadSettings = () => new Promise((done) => { resolve = done; });
    const pending = startContentSession(dependencies);
    const response = state.respond({ type: PAGE_STATE_MESSAGE });
    state.invalidate();
    resolve(normalizeSettings());
    await pending;
    expect((await response).eligible).toBe(true);
    expect(dependencies.createUi).not.toHaveBeenCalled();
  });
});
