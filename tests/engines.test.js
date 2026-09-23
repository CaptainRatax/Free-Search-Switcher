import { describe, expect, it } from 'vitest';
import {
  BUILT_IN_ENGINE_ORDER,
  BUILT_IN_ENGINES,
  buildEngineMenu,
  getSelectableEngines,
  selectQuickTarget,
} from '../utils/engines.js';
import { normalizeSettings } from '../utils/settings.js';

const customEngine = {
  id: 'custom-example',
  name: 'Example Search',
  homeUrl: 'https://example.com/',
  searchUrlTemplate: 'https://example.com/search?q={query}',
  iconUrl: null,
  creationOrder: 0,
  kind: 'custom',
};

function settings(overrides = {}) {
  return normalizeSettings({
    firstPreferredEngineId: null,
    secondPreferredEngineId: null,
    customEngines: [customEngine],
    ...overrides,
  });
}

describe('built-in engine ordering', () => {
  it('keeps the required built-in order with Google last', () => {
    expect(BUILT_IN_ENGINES.map((engine) => engine.id)).toEqual(BUILT_IN_ENGINE_ORDER);
    expect(BUILT_IN_ENGINE_ORDER.at(-1)).toBe('google');
  });

  it('places Google immediately before custom engines in selectors', () => {
    const orderedIds = getSelectableEngines([customEngine]).map((engine) => engine.id);
    expect(orderedIds.slice(-2)).toEqual(['google', 'custom-example']);
  });
});

describe('quick target selection', () => {
  it('returns no target when no preferred engine is configured', () => {
    expect(selectQuickTarget('bing', settings())).toBeNull();
  });

  it('uses the first preferred engine everywhere except on that engine', () => {
    const onePreferred = settings({ firstPreferredEngineId: 'ecosia' });
    expect(selectQuickTarget('bing', onePreferred)).toBe('ecosia');
    expect(selectQuickTarget('ecosia', onePreferred)).toBeNull();
  });

  it('switches from the first preference to the second and otherwise to the first', () => {
    const twoPreferred = settings({
      firstPreferredEngineId: 'ecosia',
      secondPreferredEngineId: 'google',
    });
    expect(selectQuickTarget('ecosia', twoPreferred)).toBe('google');
    expect(selectQuickTarget('google', twoPreferred)).toBe('ecosia');
    expect(selectQuickTarget('bing', twoPreferred)).toBe('ecosia');
  });

  it('allows a custom engine to be the quick target', () => {
    const customPreferred = settings({ firstPreferredEngineId: customEngine.id });
    expect(selectQuickTarget('google', customPreferred)).toBe(customEngine.id);
  });
});

describe('engine menu ordering', () => {
  it('places preferences first, removes the current engine, and removes duplicates', () => {
    const menu = buildEngineMenu('bing', settings({
      firstPreferredEngineId: 'google',
      secondPreferredEngineId: customEngine.id,
    }));
    const ids = menu.map(({ engine }) => engine.id);

    expect(ids.slice(0, 2)).toEqual(['google', customEngine.id]);
    expect(ids).not.toContain('bing');
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.filter((id) => id === 'google')).toHaveLength(1);
    expect(ids.filter((id) => id === customEngine.id)).toHaveLength(1);
    expect(menu[0].preferenceRank).toBe(1);
    expect(menu[1].preferenceRank).toBe(2);
  });

  it('keeps Google as the final remaining built-in immediately before the custom tail', () => {
    const menu = buildEngineMenu('ecosia', settings());
    const ids = menu.map(({ engine }) => engine.id);
    const googleIndex = ids.indexOf('google');
    const customIndex = ids.indexOf(customEngine.id);

    expect(googleIndex).toBeGreaterThan(-1);
    expect(customIndex).toBe(googleIndex + 1);
    expect(menu[googleIndex].engine.kind).toBe('built-in');
  });
});
