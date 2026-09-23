import { describe, expect, it, vi } from 'vitest';
import {
  DEFAULT_SETTINGS,
  deleteCustomEngine,
  normalizeSettings,
  upsertCustomEngine,
} from '../utils/settings.js';
import { isSafeIconUrl, validateCustomEngine } from '../utils/validation.js';
import { BUILT_IN_ENGINES } from '../utils/engines.js';

const firstCustom = {
  id: 'custom-first',
  name: 'First Custom',
  homeUrl: 'https://first.example/',
  searchUrlTemplate: 'https://first.example/search?q={query}',
  iconUrl: null,
  creationOrder: 0,
  kind: 'custom',
};

const secondCustom = {
  id: 'custom-second',
  name: 'Second Custom',
  homeUrl: 'https://second.example/',
  searchUrlTemplate: 'https://second.example/search/{query}',
  iconUrl: null,
  creationOrder: 1,
  kind: 'custom',
};

describe('custom engine validation', () => {
  it.each([null, undefined, false, 123, 'engine'])('handles malformed input %s', (input) => {
    expect(validateCustomEngine(input).valid).toBe(false);
  });

  it('accepts an optional HTTPS icon URL without making a request', () => {
    const request = vi.spyOn(globalThis, 'fetch');
    expect(validateCustomEngine({ ...firstCustom, iconUrl: ' https://icons.example/icon.png ' })).toMatchObject({
      valid: true, value: { iconUrl: 'https://icons.example/icon.png' },
    });
    expect(validateCustomEngine({ ...firstCustom, iconUrl: '' }).value.iconUrl).toBeNull();
    expect(request).not.toHaveBeenCalled();
    request.mockRestore();
  });

  it.each(['http://example.com/icon.png', 'data:image/png;base64,aGVsbG8=', 'javascript:alert(1)', 'not a URL', 'https://user:pass@example.com/icon.png', 123])('rejects unsafe icon URL %s', (iconUrl) => {
    expect(validateCustomEngine({ ...firstCustom, iconUrl }).errors.iconUrl).toBeTruthy();
    expect(isSafeIconUrl(iconUrl)).toBe(false);
  });
  it('accepts a complete HTTPS engine with exactly one placeholder', () => {
    expect(validateCustomEngine(firstCustom)).toMatchObject({ valid: true, errors: {} });
  });

  it.each([
    ['javascript:alert(1)', 'https://example.com/?q={query}'],
    ['data:text/html,unsafe', 'https://example.com/?q={query}'],
    ['file:///tmp/search', 'https://example.com/?q={query}'],
    ['http://example.com/', 'https://example.com/?q={query}'],
  ])('rejects an unsafe home URL: %s', (homeUrl, searchUrlTemplate) => {
    const result = validateCustomEngine({
      ...firstCustom,
      homeUrl,
      searchUrlTemplate,
    });
    expect(result.valid).toBe(false);
    expect(result.errors.homeUrl).toBeTruthy();
  });

  it.each([
    'https://example.com/search',
    'https://example.com/{query}/again/{query}',
  ])('rejects a template without exactly one literal placeholder: %s', (searchUrlTemplate) => {
    const result = validateCustomEngine({ ...firstCustom, searchUrlTemplate });
    expect(result.valid).toBe(false);
    expect(result.errors.searchUrlTemplate).toContain('exactly one');
  });

  it('rejects non-HTTPS search templates', () => {
    const result = validateCustomEngine({
      ...firstCustom,
      searchUrlTemplate: 'javascript:{query}',
    });
    expect(result.valid).toBe(false);
    expect(result.errors.searchUrlTemplate).toContain('HTTPS');
  });

  it('rejects a query placeholder in the URL authority', () => {
    const result = validateCustomEngine({
      ...firstCustom,
      searchUrlTemplate: 'https://{query}.example.com/',
    });
    expect(result.valid).toBe(false);
    expect(result.errors.searchUrlTemplate).toContain('after the URL hostname');
  });
});

describe('settings invariants', () => {
  it('defaults to schema v2, globally enabled, with every built-in site enabled', () => {
    const defaults = normalizeSettings();
    expect(defaults).toEqual(DEFAULT_SETTINGS);
    expect(defaults.schemaVersion).toBe(2);
    expect(defaults.enabled).toBe(true);
    expect(Object.keys(defaults.siteEnabled)).toEqual(BUILT_IN_ENGINES.map(({ id }) => id));
    expect(Object.values(defaults.siteEnabled).every(Boolean)).toBe(true);
  });

  it.each([null, undefined, false, true, 123, 'bad', []])('normalizes malformed top-level value %s', (input) => {
    expect(normalizeSettings(input)).toEqual(DEFAULT_SETTINGS);
  });

  it('accepts only booleans for enabled and supported site toggles', () => {
    const result = normalizeSettings({ enabled: 'false', siteEnabled: { google: false, bing: 0, ecosia: null, unknown: false, 'custom-first': false } });
    expect(result.enabled).toBe(true);
    expect(result.siteEnabled.google).toBe(false);
    expect(result.siteEnabled.bing).toBe(true);
    expect(result.siteEnabled.ecosia).toBe(true);
    expect(result.siteEnabled).not.toHaveProperty('unknown');
    expect(result.siteEnabled).not.toHaveProperty('custom-first');
    expect(normalizeSettings({ enabled: false }).enabled).toBe(false);
  });

  it('keeps disabled injection sites available as preferred destinations', () => {
    const settings = normalizeSettings({ siteEnabled: { google: false }, firstPreferredEngineId: 'google' });
    expect(settings.firstPreferredEngineId).toBe('google');
  });

  it('removes legacy uploaded icons without losing valid custom engines or preferences', () => {
    const result = normalizeSettings({
      schemaVersion: 1,
      firstPreferredEngineId: firstCustom.id,
      secondPreferredEngineId: secondCustom.id,
      customEngines: [{ ...secondCustom, iconDataUrl: 'data:image/png;base64,aGVsbG8=' }, { ...firstCustom, iconDataUrl: 'broken' }],
    });
    expect(result.customEngines.map(({ id }) => id)).toEqual([firstCustom.id, secondCustom.id]);
    expect(result.firstPreferredEngineId).toBe(firstCustom.id);
    expect(result.secondPreferredEngineId).toBe(secondCustom.id);
    result.customEngines.forEach((engine) => {
      expect(engine.iconUrl).toBeNull();
      expect(engine).not.toHaveProperty('iconDataUrl');
    });
    expect(normalizeSettings(result)).toEqual(result);
  });

  it('drops only invalid icons and ignores malformed/duplicate custom engines', () => {
    const result = normalizeSettings({ customEngines: [
      null, 3, {}, { ...firstCustom, id: 'google' },
      { ...firstCustom, iconUrl: 'http://icons.example/unsafe.png' },
      { ...firstCustom, name: 'duplicate' },
      { ...secondCustom, homeUrl: 'javascript:alert(1)' },
    ] });
    expect(result.customEngines).toEqual([firstCustom]);
  });

  it('does not expose shared mutable default objects', () => {
    const first = normalizeSettings();
    first.siteEnabled.google = false;
    first.customEngines.push(firstCustom);
    expect(normalizeSettings()).toEqual(DEFAULT_SETTINGS);
  });

  it('normalizes malformed custom-engine ordering without coercing arbitrary objects', () => {
    const settings = normalizeSettings({ customEngines: [
      { ...firstCustom, creationOrder: { toString: 'invalid', valueOf: 'invalid' } },
      { ...secondCustom, creationOrder: '4' },
    ] });
    expect(settings.customEngines.map(({ creationOrder }) => creationOrder)).toEqual([0, 4]);
  });

  it('clears unknown preferred engine IDs', () => {
    expect(normalizeSettings({ firstPreferredEngineId: 'missing', secondPreferredEngineId: 'google' })).toMatchObject({
      firstPreferredEngineId: null, secondPreferredEngineId: null,
    });
  });
  it('clears the second preference when the first is absent', () => {
    const normalized = normalizeSettings({
      firstPreferredEngineId: null,
      secondPreferredEngineId: 'google',
      customEngines: [],
    });
    expect(normalized.firstPreferredEngineId).toBeNull();
    expect(normalized.secondPreferredEngineId).toBeNull();
  });

  it('prevents the same engine from occupying both preferred slots', () => {
    const normalized = normalizeSettings({
      firstPreferredEngineId: 'ecosia',
      secondPreferredEngineId: 'ecosia',
      customEngines: [],
    });
    expect(normalized.firstPreferredEngineId).toBe('ecosia');
    expect(normalized.secondPreferredEngineId).toBeNull();
  });

  it('deleting the first selected custom engine clears both preferences', () => {
    const next = deleteCustomEngine({
      firstPreferredEngineId: firstCustom.id,
      secondPreferredEngineId: 'google',
      customEngines: [firstCustom, secondCustom],
    }, firstCustom.id);

    expect(next.customEngines.map((engine) => engine.id)).toEqual([secondCustom.id]);
    expect(next.firstPreferredEngineId).toBeNull();
    expect(next.secondPreferredEngineId).toBeNull();
  });

  it('deleting the second selected custom engine keeps the first preference', () => {
    const next = deleteCustomEngine({
      firstPreferredEngineId: 'ecosia',
      secondPreferredEngineId: secondCustom.id,
      customEngines: [firstCustom, secondCustom],
    }, secondCustom.id);

    expect(next.firstPreferredEngineId).toBe('ecosia');
    expect(next.secondPreferredEngineId).toBeNull();
  });

  it('keeps a stable ID and creation order when editing a custom engine', () => {
    const randomIdSpy = vi.spyOn(globalThis.crypto, 'randomUUID');
    const result = upsertCustomEngine({ customEngines: [firstCustom] }, {
      ...firstCustom,
      name: 'Renamed Custom',
    }, firstCustom.id);

    expect(result.validation.valid).toBe(true);
    expect(result.engine.id).toBe(firstCustom.id);
    expect(result.engine.creationOrder).toBe(firstCustom.creationOrder);
    expect(randomIdSpy).not.toHaveBeenCalled();
    randomIdSpy.mockRestore();
  });
});
