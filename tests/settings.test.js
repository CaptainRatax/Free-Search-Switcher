import { describe, expect, it, vi } from 'vitest';
import {
  deleteCustomEngine,
  normalizeSettings,
  upsertCustomEngine,
} from '../utils/settings.js';
import { validateCustomEngine } from '../utils/validation.js';

const firstCustom = {
  id: 'custom-first',
  name: 'First Custom',
  homeUrl: 'https://first.example/',
  searchUrlTemplate: 'https://first.example/search?q={query}',
  iconDataUrl: null,
  creationOrder: 0,
  kind: 'custom',
};

const secondCustom = {
  id: 'custom-second',
  name: 'Second Custom',
  homeUrl: 'https://second.example/',
  searchUrlTemplate: 'https://second.example/search/{query}',
  iconDataUrl: null,
  creationOrder: 1,
  kind: 'custom',
};

describe('custom engine validation', () => {
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
