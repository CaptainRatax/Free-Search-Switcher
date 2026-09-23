import { normalizeSettings, STORAGE_KEY, STORAGE_SCHEMA_VERSION } from './settings.js';

export const LOCAL_SETTINGS_KEY = 'freeSearchSwitcherSettingsV2Local';
export const STORAGE_BACKEND_KEY = 'freeSearchSwitcherStorageBackend';
export const CHUNK_KEY_PREFIX = `${STORAGE_KEY}:chunk:`;
const encoder = new TextEncoder();
const DEFAULT_QUOTAS = { QUOTA_BYTES_PER_ITEM: 8_192, QUOTA_BYTES: 102_400, MAX_ITEMS: 512 };
const SYNC_DELIVERY_TIMEOUT_MS = 5_000;

function entrySize(key, value) {
  return encoder.encode(key).length + encoder.encode(JSON.stringify(value)).length;
}

function isV2(value) {
  return value && typeof value === 'object' && value.schemaVersion === STORAGE_SCHEMA_VERSION;
}

function isUnavailable(error) {
  return /not (?:supported|available|implemented)|unavailable|unsupported|disabled|not enabled/i.test(String(error?.message ?? error));
}

function isQuotaError(error) {
  return /quota|MAX_ITEMS|too (?:large|many)|size limit/i.test(String(error?.message ?? error));
}

function quotaError() {
  return new Error('Settings exceed the browser sync storage quota. Shorten URLs or remove unused custom engines, then save again. Your saved settings have not changed.');
}

function encodeSettings(settings, area, existing) {
  const quota = Object.fromEntries(Object.entries(DEFAULT_QUOTAS).map(([key, fallback]) => [key, area[key] || fallback]));
  let entries = { [STORAGE_KEY]: settings };
  if (entrySize(STORAGE_KEY, settings) > quota.QUOTA_BYTES_PER_ITEM) {
    const revision = globalThis.crypto.randomUUID();
    const chunks = [];
    let chunk = '';
    let size = 0;
    // Reserve room for JSON string escaping, the revision envelope and storage key.
    const chunkBudget = quota.QUOTA_BYTES_PER_ITEM - 512;
    if (chunkBudget < 4) throw quotaError();
    for (const character of JSON.stringify(settings)) {
      const characterSize = encoder.encode(JSON.stringify(character)).length - 2;
      if (size + characterSize > chunkBudget) {
        chunks.push(chunk);
        chunk = '';
        size = 0;
      }
      chunk += character;
      size += characterSize;
    }
    if (chunk) chunks.push(chunk);
    const chunkKeys = chunks.map((_, index) => `${CHUNK_KEY_PREFIX}${revision}:${index}`);
    entries = Object.fromEntries(chunks.map((text, index) => [chunkKeys[index], { revision, text }]));
    entries[STORAGE_KEY] = { schemaVersion: STORAGE_SCHEMA_VERSION, storageFormat: 'chunks', revision, chunkKeys };
  }

  // Browser set() must fit before cleanup too, so a failed save never destroys the
  // previous snapshot. Chunks carry a revision to prevent mixed synced snapshots.
  const next = { ...existing, ...entries };
  if (Object.keys(next).length > quota.MAX_ITEMS
    || Object.entries(next).reduce((total, [key, value]) => total + entrySize(key, value), 0) > quota.QUOTA_BYTES
    || Object.entries(entries).some(([key, value]) => entrySize(key, value) > quota.QUOTA_BYTES_PER_ITEM)) {
    throw quotaError();
  }
  return entries;
}

function decodeSettings(stored) {
  const value = stored[STORAGE_KEY];
  if (!isV2(value)) return null;
  if (value.storageFormat !== 'chunks') return normalizeSettings(value);
  if (!Array.isArray(value.chunkKeys) || !value.chunkKeys.length
    || !value.chunkKeys.every((key) => typeof key === 'string' && key.startsWith(CHUNK_KEY_PREFIX)
      && stored[key]?.revision === value.revision && typeof stored[key]?.text === 'string')) {
    throw new Error('Browser sync is still receiving these settings. Please try again shortly.');
  }
  try {
    const settings = JSON.parse(value.chunkKeys.map((key) => stored[key].text).join(''));
    if (!isV2(settings)) throw new Error('Invalid settings version');
    return normalizeSettings(settings);
  } catch {
    throw new Error('The synchronized settings are incomplete. Please try again shortly.');
  }
}

export function createSettingsStorage(storage) {
  let initialization;
  let backend = 'sync';
  let fallbackReason = null;
  let lastKnownSettings = null;
  let writes = Promise.resolve();

  function waitForCompleteSync() {
    return new Promise((resolve, reject) => {
      let settled = false;
      const finish = (error, settings) => {
        if (settled) return;
        settled = true;
        clearTimeout(timeout);
        storage.onChanged.removeListener(handleChange);
        if (error) reject(error);
        else resolve(settings);
      };
      const check = async () => {
        try {
          const settings = decodeSettings(await storage.sync.get(null));
          if (settings) finish(null, settings);
        } catch {
          // Individual native-sync events can contain only part of a revision.
          // A new context has no trustworthy configuration until it is complete.
        }
      };
      const handleChange = (changes, areaName) => {
        if (areaName === 'sync' && Object.keys(changes).some((key) => key === STORAGE_KEY || key.startsWith(CHUNK_KEY_PREFIX))) {
          void check();
        }
      };
      const timeout = setTimeout(() => finish(new Error('Browser sync is still receiving these settings. Please try again shortly.')), SYNC_DELIVERY_TIMEOUT_MS);
      storage.onChanged.addListener(handleChange);
      // Close the gap between the initial read and installing the listener.
      void check();
    });
  }

  async function useLocal(settings, reason, keepLegacy = false) {
    const normalized = normalizeSettings(settings);
    await storage.local.set({
      [LOCAL_SETTINGS_KEY]: normalized,
      [STORAGE_BACKEND_KEY]: { backend: 'local', reason },
    });
    backend = 'local';
    fallbackReason = reason;
    lastKnownSettings = normalized;
    if (!keepLegacy) await storage.local.remove(STORAGE_KEY).catch(() => {});
    return normalized;
  }

  async function writeSync(settings, existing) {
    const stored = existing ?? await storage.sync.get(null);
    const entries = encodeSettings(settings, storage.sync, stored);
    await storage.sync.set(entries);
    const previousChunks = stored[STORAGE_KEY]?.storageFormat === 'chunks'
      && Array.isArray(stored[STORAGE_KEY].chunkKeys) ? stored[STORAGE_KEY].chunkKeys : [];
    const obsolete = previousChunks.filter((key) => typeof key === 'string' && key.startsWith(CHUNK_KEY_PREFIX) && !(key in entries));
    // Cleanup is best effort. The manifest always names the complete committed
    // snapshot. Unknown chunks may belong to an incoming revision whose manifest
    // has not arrived yet, so only remove the snapshot we actually replaced.
    if (obsolete.length) await storage.sync.remove(obsolete).catch(() => {});
    return settings;
  }

  async function initialize() {
    const local = await storage.local.get([STORAGE_BACKEND_KEY, LOCAL_SETTINGS_KEY, STORAGE_KEY]);
    const marker = local[STORAGE_BACKEND_KEY];
    if (marker?.backend === 'local' && isV2(local[LOCAL_SETTINGS_KEY])) {
      backend = 'local';
      fallbackReason = marker.reason;
      lastKnownSettings = normalizeSettings(local[LOCAL_SETTINGS_KEY]);
      return;
    }
    const localSettings = isV2(local[LOCAL_SETTINGS_KEY]) ? local[LOCAL_SETTINGS_KEY] : local[STORAGE_KEY];
    if (!storage.sync?.get || !storage.sync?.set) {
      await useLocal(localSettings, 'sync-unavailable');
      return;
    }
    let synced;
    try {
      synced = await storage.sync.get(null);
    } catch (error) {
      if (!isUnavailable(error)) throw error;
      await useLocal(localSettings, 'sync-unavailable');
      return;
    }
    let current;
    try {
      current = decodeSettings(synced);
    } catch {
      // Defaults or stale v1 data must not enable injection while a saved v2
      // configuration is still arriving. Only a complete snapshot is eligible.
      current = await waitForCompleteSync();
    }
    if (current) {
      lastKnownSettings = current;
      // A valid v2 sync record wins over any stale v1 local record.
      await storage.local.remove(STORAGE_KEY).catch(() => {});
      return;
    }
    const migrated = normalizeSettings(localSettings ?? synced[STORAGE_KEY]);
    try {
      // Other extension contexts can initialize concurrently. Re-read before
      // committing a migration so newly saved v2 configuration takes priority.
      const latest = await storage.sync.get(null);
      const latestSettings = decodeSettings(latest);
      if (latestSettings) {
        lastKnownSettings = latestSettings;
        return;
      }
      await writeSync(migrated, latest);
      lastKnownSettings = migrated;
      await storage.local.remove(STORAGE_KEY).catch(() => {});
    } catch (error) {
      if (isUnavailable(error)) {
        await useLocal(migrated, 'sync-unavailable');
      } else if (isQuotaError(error) && localSettings) {
        // An exceptionally large v1 collection remains usable on this device.
        // There is no successful v2 sync source to fork, and the original is kept.
        await useLocal(migrated, 'migration-quota', true);
      } else {
        throw error;
      }
    }
  }

  async function ready() {
    initialization ??= initialize().catch((error) => {
      initialization = null;
      throw error;
    });
    await initialization;
    // A shared local marker keeps independent popup/content/options contexts on
    // the same fallback backend instead of allowing conflicting normal sources.
    const marker = (await storage.local.get(STORAGE_BACKEND_KEY))[STORAGE_BACKEND_KEY];
    if (marker?.backend === 'local') {
      backend = 'local';
      fallbackReason = marker.reason;
    } else {
      backend = 'sync';
      fallbackReason = null;
    }
  }

  async function loadSettings() {
    await ready();
    if (backend === 'local') {
      const stored = await storage.local.get(LOCAL_SETTINGS_KEY);
      lastKnownSettings = normalizeSettings(stored[LOCAL_SETTINGS_KEY]);
    } else {
      let stored;
      try {
        stored = await storage.sync.get(null);
      } catch (error) {
        if (!isUnavailable(error)) throw error;
        return useLocal(lastKnownSettings, 'sync-unavailable');
      }
      try {
        lastKnownSettings = decodeSettings(stored) ?? normalizeSettings();
      } catch (error) {
        // Sync may deliver chunks in separate change events. Never publish half
        // a configuration or clear preferred custom engines during that window.
        if (!lastKnownSettings) throw error;
      }
    }
    return normalizeSettings(lastKnownSettings);
  }

  async function persist(settings, retryMigration = false) {
    await ready();
    const normalized = normalizeSettings(settings);
    if (backend === 'local') {
      await storage.local.set({ [LOCAL_SETTINGS_KEY]: normalized });
      if (retryMigration && fallbackReason === 'migration-quota' && storage.sync?.get && storage.sync?.set) {
        try {
          const stored = await storage.sync.get(null);
          // Explicit Save selects this draft, but must still wait for a remote
          // revision to finish arriving before replacing its manifest.
          decodeSettings(stored);
          await writeSync(normalized, stored);
          // Other contexts follow the shared marker. Delete it only after the
          // complete sync snapshot commits; until then local stays authoritative.
          await storage.local.remove([STORAGE_BACKEND_KEY, LOCAL_SETTINGS_KEY, STORAGE_KEY]);
          backend = 'sync';
          fallbackReason = null;
        } catch {
          // The explicit save already succeeded locally. A failed sync retry
          // keeps that configuration and marker intact for a future Save.
        }
      }
    } else {
      try {
        const stored = await storage.sync.get(null);
        // An explicit Save cannot replace a snapshot still being received with
        // the provisional in-memory view shown while sync finishes.
        decodeSettings(stored);
        await writeSync(normalized, stored);
      } catch (error) {
        if (!isUnavailable(error)) throw error;
        await useLocal(normalized, 'sync-unavailable');
      }
    }
    lastKnownSettings = normalized;
    return normalizeSettings(normalized);
  }

  function queueWrite(operation) {
    const pending = writes.then(operation);
    writes = pending.catch(() => {});
    return pending;
  }

  function saveSettings(settings) {
    return queueWrite(() => persist(settings, true));
  }

  function updateSettings(patch) {
    return queueWrite(async () => {
      const current = await loadSettings();
      return persist({ ...current, ...patch });
    });
  }

  function listenForSettingsChanges(listener) {
    let active = true;
    let notification = 0;
    const handleChange = (changes, areaName) => {
      const relevant = (areaName === 'sync' && backend === 'sync'
        && Object.keys(changes).some((key) => key === STORAGE_KEY || key.startsWith(CHUNK_KEY_PREFIX)))
        || (areaName === 'local' && (changes[STORAGE_BACKEND_KEY] || (backend === 'local' && changes[LOCAL_SETTINGS_KEY])));
      if (!relevant) return;
      const sequence = ++notification;
      loadSettings().then((settings) => {
        if (active && sequence === notification) listener(settings);
      }).catch(() => {
        // A failed/incomplete remote update leaves the last displayed settings
        // intact. A later storage event retries; no raw values reach callers.
      });
    };
    storage.onChanged.addListener(handleChange);
    return () => {
      active = false;
      storage.onChanged.removeListener(handleChange);
    };
  }

  async function getSettingsStorageStatus() {
    await ready();
    return { backend, reason: fallbackReason };
  }

  return { loadSettings, saveSettings, updateSettings, listenForSettingsChanges, getSettingsStorageStatus };
}
