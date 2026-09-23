import { describe, expect, it, vi } from 'vitest';
import { normalizeSettings, STORAGE_KEY } from '../utils/settings.js';
import { CHUNK_KEY_PREFIX, createSettingsStorage, LOCAL_SETTINGS_KEY, STORAGE_BACKEND_KEY } from '../utils/settings-storage.js';

const customEngine = (index = 0) => ({
  id: `custom-${index}`, name: `Engine ${index}`, homeUrl: `https://engine${index}.example/`,
  searchUrlTemplate: `https://engine${index}.example/search?q={query}`, creationOrder: index,
});

function fakeStorage({ local = {}, sync = {}, syncAvailable = true } = {}) {
  const listeners = new Set();
  const emit = (changes, areaName) => listeners.forEach((listener) => listener(changes, areaName));
  const makeArea = (initial, areaName) => {
    const data = structuredClone(initial);
    return {
      data,
      get: vi.fn(async (keys) => keys === null ? structuredClone(data) : Object.fromEntries(
        (Array.isArray(keys) ? keys : [keys]).filter((key) => key in data).map((key) => [key, structuredClone(data[key])]),
      )),
      set: vi.fn(async (items) => {
        const changes = Object.fromEntries(Object.entries(items).map(([key, newValue]) => [key, { oldValue: data[key], newValue }]));
        Object.assign(data, structuredClone(items));
        emit(changes, areaName);
      }),
      remove: vi.fn(async (keys) => {
        const changes = {};
        for (const key of Array.isArray(keys) ? keys : [keys]) {
          if (!(key in data)) continue;
          changes[key] = { oldValue: data[key] };
          delete data[key];
        }
        if (Object.keys(changes).length) emit(changes, areaName);
      }),
    };
  };
  return {
    local: makeArea(local, 'local'),
    sync: syncAvailable ? makeArea(sync, 'sync') : undefined,
    onChanged: { addListener: (listener) => listeners.add(listener), removeListener: (listener) => listeners.delete(listener) },
    emit,
  };
}

const legacy = {
  schemaVersion: 1,
  firstPreferredEngineId: 'custom-2', secondPreferredEngineId: 'google',
  customEngines: [{ ...customEngine(2), iconDataUrl: 'data:image/png;base64,aGVsbG8=' }, customEngine(1)],
};

describe('configuration migration and sync persistence', () => {
  it('migrates v1 local settings, preserves preferences and order, and drops uploaded icons only', async () => {
    const storage = fakeStorage({ local: { [STORAGE_KEY]: legacy, freeSearchSwitcherOnboardingOpened: true } });
    const settings = await createSettingsStorage(storage).loadSettings();
    expect(settings).toMatchObject({ schemaVersion: 2, enabled: true, firstPreferredEngineId: 'custom-2', secondPreferredEngineId: 'google' });
    expect(Object.values(settings.siteEnabled).every(Boolean)).toBe(true);
    expect(settings.customEngines.map(({ id }) => id)).toEqual(['custom-1', 'custom-2']);
    expect(settings.customEngines[1].iconUrl).toBeNull();
    expect(settings.customEngines[1]).not.toHaveProperty('iconDataUrl');
    expect(storage.sync.data[STORAGE_KEY]).toEqual(settings);
    expect(storage.local.data[STORAGE_KEY]).toBeUndefined();
    expect(storage.local.data.freeSearchSwitcherOnboardingOpened).toBe(true);
    expect(storage.sync.data).not.toHaveProperty('freeSearchSwitcherOnboardingOpened');
  });

  it('is idempotent across contexts and valid v2 sync always wins over stale v1 local', async () => {
    const current = normalizeSettings({ enabled: false, firstPreferredEngineId: 'bing' });
    const storage = fakeStorage({ local: { [STORAGE_KEY]: legacy }, sync: { [STORAGE_KEY]: current } });
    expect(await createSettingsStorage(storage).loadSettings()).toEqual(current);
    expect(await createSettingsStorage(storage).loadSettings()).toEqual(current);
    expect(storage.sync.set).not.toHaveBeenCalled();
  });

  it('keeps legacy settings safe when migration has a temporary storage failure and retries', async () => {
    const storage = fakeStorage({ local: { [STORAGE_KEY]: legacy } });
    storage.sync.set.mockRejectedValueOnce(new Error('Temporary write failure'));
    const api = createSettingsStorage(storage);
    await expect(api.loadSettings()).rejects.toThrow('Temporary write failure');
    expect(storage.local.data[STORAGE_KEY]).toEqual(legacy);
    expect(storage.local.data).not.toHaveProperty(STORAGE_BACKEND_KEY);
    expect((await api.loadSettings()).firstPreferredEngineId).toBe('custom-2');
  });

  it('selects one persistent local fallback backend when the API is absent', async () => {
    const storage = fakeStorage({ local: { [STORAGE_KEY]: legacy }, syncAvailable: false });
    const first = createSettingsStorage(storage);
    expect((await first.loadSettings()).firstPreferredEngineId).toBe('custom-2');
    expect(await first.getSettingsStorageStatus()).toEqual({ backend: 'local', reason: 'sync-unavailable' });
    await first.updateSettings({ enabled: false });
    const second = createSettingsStorage(storage);
    expect((await second.loadSettings()).enabled).toBe(false);
    expect(storage.local.data[LOCAL_SETTINGS_KEY].customEngines).toHaveLength(2);
  });

  it('falls back on explicitly unsupported sync errors and keeps contexts on that backend', async () => {
    const storage = fakeStorage({ local: { [STORAGE_KEY]: legacy } });
    storage.sync.get.mockRejectedValueOnce(new Error('storage.sync is not supported'));
    const first = createSettingsStorage(storage);
    expect((await first.loadSettings()).customEngines).toHaveLength(2);
    const second = createSettingsStorage(storage);
    await second.updateSettings({ enabled: false });
    expect((await first.loadSettings()).enabled).toBe(false);
    expect(storage.sync.set).not.toHaveBeenCalled();
  });

  it('does not turn transient read failure into a conflicting local source', async () => {
    const storage = fakeStorage({ sync: { [STORAGE_KEY]: normalizeSettings({ enabled: false }) } });
    storage.sync.get.mockRejectedValueOnce(new Error('Temporary read failure'));
    const api = createSettingsStorage(storage);
    await expect(api.loadSettings()).rejects.toThrow('Temporary read failure');
    expect(storage.local.data).not.toHaveProperty(STORAGE_BACKEND_KEY);
    expect((await api.loadSettings()).enabled).toBe(false);
  });

  it('preserves the last complete configuration if sync becomes unavailable after initialization', async () => {
    const current = normalizeSettings({ firstPreferredEngineId: 'google', customEngines: [customEngine()] });
    const storage = fakeStorage({ sync: { [STORAGE_KEY]: current } });
    const api = createSettingsStorage(storage);
    await api.loadSettings();
    storage.sync.get.mockRejectedValueOnce(new Error('storage.sync is not available'));
    const result = await api.updateSettings({ enabled: false });
    expect(result).toEqual({ ...current, enabled: false });
    expect(await api.getSettingsStorageStatus()).toEqual({ backend: 'local', reason: 'sync-unavailable' });
    expect(await createSettingsStorage(storage).loadSettings()).toEqual(result);
  });

  it('checks for a v2 save from another context before committing the migration', async () => {
    const storage = fakeStorage({ local: { [STORAGE_KEY]: legacy } });
    const current = normalizeSettings({ enabled: false, firstPreferredEngineId: 'bing' });
    storage.sync.get.mockImplementationOnce(async () => {
      storage.sync.data[STORAGE_KEY] = current;
      return {};
    });
    expect(await createSettingsStorage(storage).loadSettings()).toEqual(current);
    expect(storage.sync.set).not.toHaveBeenCalled();
  });

  it('stores configuration only even if callers include runtime data', async () => {
    const storage = fakeStorage();
    const api = createSettingsStorage(storage);
    await api.saveSettings({
      enabled: false, query: 'private search', currentUrl: 'https://example.com/private', history: ['private'],
      searchMode: 'images', reloadWarning: true, draft: {}, popup: {},
      customEngines: [{ ...customEngine(), iconUrl: 'https://icons.example/engine.png', query: 'private search' }],
    });
    const stored = storage.sync.data[STORAGE_KEY];
    expect(stored).toEqual(normalizeSettings(stored));
    expect(JSON.stringify(stored)).not.toContain('private');
    expect(stored.customEngines[0].iconUrl).toBe('https://icons.example/engine.png');
    expect(storage.local.data).toEqual({});
  });

  it('merges immediate popup patches with the latest saved configuration and queues writes', async () => {
    const storage = fakeStorage();
    const api = createSettingsStorage(storage);
    await api.loadSettings();
    await storage.sync.set({ [STORAGE_KEY]: normalizeSettings({ customEngines: [customEngine()], siteEnabled: { google: false } }) });
    await Promise.all([api.updateSettings({ enabled: false }), api.updateSettings({ firstPreferredEngineId: 'custom-0' })]);
    expect(await api.loadSettings()).toMatchObject({ enabled: false, firstPreferredEngineId: 'custom-0', siteEnabled: { google: false } });
  });
});

describe('sync quotas and complete snapshots', () => {
  it('migrates a collection exceeding the per-item quota without dropping engines', async () => {
    const source = { ...legacy, customEngines: Array.from({ length: 80 }, (_, index) => ({ ...customEngine(index), name: `Unicode café 世界 ${index}` })) };
    const storage = fakeStorage({ local: { [STORAGE_KEY]: source } });
    const api = createSettingsStorage(storage);
    const settings = await api.loadSettings();
    expect(settings.customEngines).toHaveLength(80);
    expect(storage.sync.data[STORAGE_KEY].storageFormat).toBe('chunks');
    for (const [key, value] of Object.entries(storage.sync.data)) {
      expect(new TextEncoder().encode(key + JSON.stringify(value)).length).toBeLessThanOrEqual(8192);
    }
    expect(await createSettingsStorage(storage).loadSettings()).toEqual(settings);
  });

  it('preserves oversized v1 collections locally when total native sync quota cannot hold them', async () => {
    const source = { ...legacy, customEngines: Array.from({ length: 600 }, (_, index) => customEngine(index)) };
    const storage = fakeStorage({ local: { [STORAGE_KEY]: source } });
    const api = createSettingsStorage(storage);
    expect((await api.loadSettings()).customEngines).toHaveLength(600);
    expect(await api.getSettingsStorageStatus()).toEqual({ backend: 'local', reason: 'migration-quota' });
    expect(storage.local.data[STORAGE_KEY]).toEqual(source);
    expect(storage.sync.data).toEqual({});
  });

  it('recovers a reduced migration-quota draft on explicit Save and switches existing contexts to sync', async () => {
    const source = { ...legacy, customEngines: Array.from({ length: 600 }, (_, index) => customEngine(index)) };
    const storage = fakeStorage({ local: { [STORAGE_KEY]: source } });
    const options = createSettingsStorage(storage);
    await options.loadSettings();
    const otherContext = createSettingsStorage(storage);
    await otherContext.loadSettings();
    const listener = vi.fn();
    const stop = otherContext.listenForSettingsChanges(listener);
    const saved = await options.saveSettings({ enabled: false, customEngines: [customEngine()], firstPreferredEngineId: 'custom-0' });
    expect(await options.getSettingsStorageStatus()).toEqual({ backend: 'sync', reason: null });
    expect(await otherContext.getSettingsStorageStatus()).toEqual({ backend: 'sync', reason: null });
    expect(await otherContext.loadSettings()).toEqual(saved);
    expect(storage.sync.data[STORAGE_KEY]).toEqual(saved);
    expect(storage.local.data).not.toHaveProperty(STORAGE_BACKEND_KEY);
    expect(storage.local.data).not.toHaveProperty(LOCAL_SETTINGS_KEY);
    expect(storage.local.data).not.toHaveProperty(STORAGE_KEY);
    await vi.waitFor(() => expect(listener).toHaveBeenCalledWith(saved));
    await storage.sync.set({ [STORAGE_KEY]: { ...saved, enabled: true } });
    await vi.waitFor(() => expect(listener).toHaveBeenLastCalledWith({ ...saved, enabled: true }));
    stop();
  });

  it('keeps explicit saves local when migration recovery still exceeds sync quota or fails', async () => {
    const source = { ...legacy, customEngines: Array.from({ length: 600 }, (_, index) => customEngine(index)) };
    const storage = fakeStorage({ local: { [STORAGE_KEY]: source } });
    const api = createSettingsStorage(storage);
    const initial = await api.loadSettings();
    const largeSave = await api.saveSettings({ ...initial, enabled: false });
    expect(largeSave.enabled).toBe(false);
    expect(await api.getSettingsStorageStatus()).toEqual({ backend: 'local', reason: 'migration-quota' });
    expect(storage.sync.data).toEqual({});
    storage.sync.set.mockRejectedValueOnce(new Error('Temporary write failure'));
    const smallSave = await api.saveSettings({ firstPreferredEngineId: 'bing' });
    expect(await api.loadSettings()).toEqual(smallSave);
    expect(storage.local.data[LOCAL_SETTINGS_KEY]).toEqual(smallSave);
    expect(storage.local.data[STORAGE_KEY]).toEqual(source);
    expect(await api.getSettingsStorageStatus()).toEqual({ backend: 'local', reason: 'migration-quota' });
  });

  it('does not move migration-quota fallback to sync during immediate popup updates', async () => {
    const saved = normalizeSettings({ firstPreferredEngineId: 'bing' });
    const storage = fakeStorage({ local: {
      [LOCAL_SETTINGS_KEY]: saved,
      [STORAGE_BACKEND_KEY]: { backend: 'local', reason: 'migration-quota' },
    } });
    const api = createSettingsStorage(storage);
    await api.updateSettings({ enabled: false });
    expect(storage.sync.set).not.toHaveBeenCalled();
    expect(await api.getSettingsStorageStatus()).toEqual({ backend: 'local', reason: 'migration-quota' });
  });

  it('rejects oversized saves without forking to local or changing saved settings', async () => {
    const current = normalizeSettings({ firstPreferredEngineId: 'google' });
    const storage = fakeStorage({ sync: { [STORAGE_KEY]: current } });
    const api = createSettingsStorage(storage);
    await expect(api.saveSettings({ customEngines: Array.from({ length: 600 }, (_, index) => customEngine(index)) })).rejects.toThrow('quota');
    expect(await api.loadSettings()).toEqual(current);
    expect(storage.local.data).not.toHaveProperty(STORAGE_BACKEND_KEY);
  });

  it('keeps saved data unchanged when the API rejects a write for quota/rate reasons', async () => {
    const storage = fakeStorage({ sync: { [STORAGE_KEY]: normalizeSettings() } });
    const api = createSettingsStorage(storage);
    await api.loadSettings();
    storage.sync.set.mockRejectedValueOnce(new Error('QUOTA_BYTES quota exceeded'));
    await expect(api.updateSettings({ enabled: false })).rejects.toThrow('quota');
    expect((await api.loadSettings()).enabled).toBe(true);
    expect(await api.getSettingsStorageStatus()).toEqual({ backend: 'sync', reason: null });
  });

  it('never publishes partial incoming chunk snapshots', async () => {
    const storage = fakeStorage({ sync: { [STORAGE_KEY]: normalizeSettings() } });
    const api = createSettingsStorage(storage);
    const before = await api.loadSettings();
    const remote = fakeStorage();
    await createSettingsStorage(remote).saveSettings({ enabled: false, customEngines: Array.from({ length: 80 }, (_, index) => customEngine(index)) });
    const manifest = remote.sync.data[STORAGE_KEY];
    await storage.sync.set({ [STORAGE_KEY]: manifest });
    expect(await api.loadSettings()).toEqual(before);
    const fresh = createSettingsStorage(storage);
    const published = vi.fn();
    const loading = fresh.loadSettings().then((settings) => { published(settings); return settings; });
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(published).not.toHaveBeenCalled();
    await expect(api.saveSettings(normalizeSettings())).rejects.toThrow('still receiving');
    expect(storage.sync.data[STORAGE_KEY]).toEqual(manifest);
    await storage.sync.set(Object.fromEntries(Object.entries(remote.sync.data).filter(([key]) => key.startsWith(CHUNK_KEY_PREFIX))));
    expect(await loading).toMatchObject({ enabled: false, customEngines: expect.any(Array) });
    expect((await api.loadSettings()).customEngines).toHaveLength(80);
    expect((await api.loadSettings()).enabled).toBe(false);
  });

  it('times out an incomplete first load without applying defaults, stale v1 settings, or overwriting sync', async () => {
    vi.useFakeTimers();
    try {
      const manifest = { schemaVersion: 2, storageFormat: 'chunks', revision: 'receiving', chunkKeys: [`${CHUNK_KEY_PREFIX}receiving:0`] };
      const storage = fakeStorage({ local: { [STORAGE_KEY]: legacy }, sync: { [STORAGE_KEY]: manifest } });
      const api = createSettingsStorage(storage);
      const loading = expect(api.loadSettings()).rejects.toThrow('still receiving');
      await vi.advanceTimersByTimeAsync(5_000);
      await loading;
      expect(storage.local.data[STORAGE_KEY]).toEqual(legacy);
      expect(storage.sync.set).not.toHaveBeenCalled();
      expect(storage.sync.data[STORAGE_KEY]).toEqual(manifest);
      const complete = normalizeSettings({ enabled: false });
      await storage.sync.set({ [STORAGE_KEY]: complete });
      expect(await api.loadSettings()).toEqual(complete);
    } finally {
      vi.useRealTimers();
    }
  });

  it('cleans obsolete chunks only after successful replacement', async () => {
    const storage = fakeStorage();
    const api = createSettingsStorage(storage);
    await api.saveSettings({ customEngines: Array.from({ length: 80 }, (_, index) => customEngine(index)) });
    expect(Object.keys(storage.sync.data).some((key) => key.startsWith(CHUNK_KEY_PREFIX))).toBe(true);
    storage.sync.set.mockRejectedValueOnce(new Error('Write failed'));
    await expect(api.saveSettings(normalizeSettings())).rejects.toThrow('Write failed');
    expect((await api.loadSettings()).customEngines).toHaveLength(80);
    await api.saveSettings(normalizeSettings());
    expect(Object.keys(storage.sync.data)).toEqual([STORAGE_KEY]);
  });

  it('preserves incoming chunks whose manifest has not arrived when saving another configuration', async () => {
    const storage = fakeStorage();
    const api = createSettingsStorage(storage);
    await api.saveSettings({ customEngines: Array.from({ length: 80 }, (_, index) => customEngine(index)) });
    const replacedChunks = storage.sync.data[STORAGE_KEY].chunkKeys;
    const remote = fakeStorage();
    const incoming = await createSettingsStorage(remote).saveSettings({ enabled: false, customEngines: Array.from({ length: 80 }, (_, index) => customEngine(index)) });
    const manifest = remote.sync.data[STORAGE_KEY];
    const incomingChunks = Object.fromEntries(Object.entries(remote.sync.data).filter(([key]) => key.startsWith(CHUNK_KEY_PREFIX)));
    await storage.sync.set(incomingChunks);
    await api.saveSettings(normalizeSettings());
    expect(storage.sync.data).toMatchObject(incomingChunks);
    expect(replacedChunks.every((key) => !(key in storage.sync.data))).toBe(true);
    await storage.sync.set({ [STORAGE_KEY]: manifest });
    expect(await api.loadSettings()).toEqual(incoming);
  });
});

describe('settings change subscription', () => {
  it('publishes normalized sync configuration, ignores local onboarding, and supports unsubscribe', async () => {
    const storage = fakeStorage({ sync: { [STORAGE_KEY]: normalizeSettings() } });
    const api = createSettingsStorage(storage);
    await api.loadSettings();
    const listener = vi.fn();
    const stop = api.listenForSettingsChanges(listener);
    await storage.local.set({ freeSearchSwitcherOnboardingOpened: true, [STORAGE_KEY]: legacy });
    expect(listener).not.toHaveBeenCalled();
    await storage.sync.set({ [STORAGE_KEY]: { schemaVersion: 2, enabled: false, secondPreferredEngineId: 'google' } });
    await vi.waitFor(() => expect(listener).toHaveBeenCalledWith(normalizeSettings({ enabled: false })));
    stop();
    listener.mockClear();
    await storage.sync.set({ [STORAGE_KEY]: normalizeSettings() });
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(listener).not.toHaveBeenCalled();
  });

  it('listens to the selected local backend when sync is unavailable', async () => {
    const storage = fakeStorage({ syncAvailable: false });
    const api = createSettingsStorage(storage);
    await api.loadSettings();
    const listener = vi.fn();
    const stop = api.listenForSettingsChanges(listener);
    await api.updateSettings({ enabled: false });
    await vi.waitFor(() => expect(listener).toHaveBeenCalledWith(normalizeSettings({ enabled: false })));
    stop();
  });
});
