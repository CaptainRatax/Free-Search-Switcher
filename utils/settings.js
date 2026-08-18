import { BUILT_IN_ENGINES, getEngineById, sortCustomEngines } from './engines.js';
import { validateCustomEngine } from './validation.js';

export const STORAGE_KEY = 'freeSearchSwitcherSettings';
export const STORAGE_SCHEMA_VERSION = 1;

export const DEFAULT_SETTINGS = Object.freeze({
  schemaVersion: STORAGE_SCHEMA_VERSION,
  firstPreferredEngineId: null,
  secondPreferredEngineId: null,
  customEngines: Object.freeze([]),
});

function normalizeCustomEngines(customEngines) {
  if (!Array.isArray(customEngines)) {
    return [];
  }

  const builtInIds = new Set(BUILT_IN_ENGINES.map((engine) => engine.id));
  const seen = new Set();
  const normalized = [];

  customEngines.forEach((engine, index) => {
    if (!engine || typeof engine.id !== 'string' || !engine.id.startsWith('custom-')) {
      return;
    }

    if (seen.has(engine.id) || builtInIds.has(engine.id)) {
      return;
    }

    const validation = validateCustomEngine(engine);
    if (!validation.valid) {
      return;
    }

    seen.add(engine.id);
    normalized.push({
      id: engine.id,
      name: validation.value.name,
      homeUrl: validation.value.homeUrl,
      searchUrlTemplate: validation.value.searchUrlTemplate,
      iconDataUrl: validation.value.iconDataUrl,
      creationOrder: Number.isFinite(Number(engine.creationOrder))
        ? Number(engine.creationOrder)
        : index,
      kind: 'custom',
    });
  });

  return sortCustomEngines(normalized);
}

export function normalizeSettings(rawSettings = {}) {
  const customEngines = normalizeCustomEngines(rawSettings.customEngines);
  const validEngineIds = new Set([
    ...BUILT_IN_ENGINES.map((engine) => engine.id),
    ...customEngines.map((engine) => engine.id),
  ]);

  let firstPreferredEngineId = validEngineIds.has(rawSettings.firstPreferredEngineId)
    ? rawSettings.firstPreferredEngineId
    : null;
  let secondPreferredEngineId = validEngineIds.has(rawSettings.secondPreferredEngineId)
    ? rawSettings.secondPreferredEngineId
    : null;

  if (!firstPreferredEngineId) {
    firstPreferredEngineId = null;
    secondPreferredEngineId = null;
  } else if (secondPreferredEngineId === firstPreferredEngineId) {
    secondPreferredEngineId = null;
  }

  return {
    schemaVersion: STORAGE_SCHEMA_VERSION,
    firstPreferredEngineId,
    secondPreferredEngineId,
    customEngines,
  };
}

export function deleteCustomEngine(settings, engineId) {
  const next = normalizeSettings(settings);
  next.customEngines = next.customEngines.filter((engine) => engine.id !== engineId);

  if (next.firstPreferredEngineId === engineId) {
    next.firstPreferredEngineId = null;
    next.secondPreferredEngineId = null;
  } else if (next.secondPreferredEngineId === engineId) {
    next.secondPreferredEngineId = null;
  }

  return normalizeSettings(next);
}

export function upsertCustomEngine(settings, input, existingId = null) {
  const current = normalizeSettings(settings);
  const validation = validateCustomEngine(input);
  if (!validation.valid) {
    return { settings: current, validation };
  }

  const existing = existingId
    ? current.customEngines.find((engine) => engine.id === existingId)
    : null;
  const largestCreationOrder = current.customEngines.reduce(
    (largest, engine) => Math.max(largest, Number(engine.creationOrder)),
    -1,
  );
  const id = existing?.id ?? `custom-${globalThis.crypto.randomUUID()}`;
  const customEngine = {
    id,
    ...validation.value,
    creationOrder: existing?.creationOrder ?? largestCreationOrder + 1,
    kind: 'custom',
  };

  current.customEngines = existing
    ? current.customEngines.map((engine) => (engine.id === existing.id ? customEngine : engine))
    : [...current.customEngines, customEngine];

  return {
    settings: normalizeSettings(current),
    validation,
    engine: customEngine,
  };
}

export function hasEngine(settings, engineId) {
  return Boolean(getEngineById(engineId, normalizeSettings(settings).customEngines));
}

