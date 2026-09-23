import { describe, expect, it, vi } from 'vitest';
import { OptionsDraft, validateOptionsDraft } from '../entrypoints/options/draft.js';
import { normalizeSettings } from '../utils/settings.js';
import { getSelectableEngines } from '../utils/engines.js';

const customEngine = {
  id: 'custom-original',
  name: 'Original',
  homeUrl: 'https://original.example/',
  searchUrlTemplate: 'https://original.example/search?q={query}',
  iconUrl: 'https://original.example/icon.png',
  creationOrder: 5,
  kind: 'custom',
};
const newEngine = {
  name: 'Added',
  homeUrl: 'https://added.example/',
  searchUrlTemplate: 'https://added.example/?q={query}',
  iconUrl: 'https://images.example/icon.png',
};

function setup(settings = {}) {
  const persist = vi.fn(async (value) => normalizeSettings(value));
  return { model: new OptionsDraft(settings, persist), persist };
}

function fillEditor(model, values = newEngine) {
  Object.entries(values).forEach(([field, value]) => model.editField(field, value));
}

describe('Options page draft transaction', () => {
  it('starts clean and does not persist opening or closing an untouched editor', () => {
    const { model, persist } = setup();
    expect(model.dirty).toBe(false);
    model.openEditor();
    expect(model.dirty).toBe(false);
    model.closeEditor();
    expect(model.dirty).toBe(false);
    expect(persist).not.toHaveBeenCalled();
  });

  it('keeps global, site, and preferred-engine changes in the draft until Save', () => {
    const { model, persist } = setup();
    model.setEnabled(false);
    model.setSiteEnabled('google', false);
    model.setPreferences('google', 'bing');
    expect(model.draft).toMatchObject({
      enabled: false, siteEnabled: { google: false },
      firstPreferredEngineId: 'google', secondPreferredEngineId: 'bing',
    });
    expect(model.baseline).toMatchObject({
      enabled: true, siteEnabled: { google: true }, firstPreferredEngineId: null,
    });
    expect(getSelectableEngines(model.draft.customEngines).some(({ id }) => id === 'google')).toBe(true);
    expect(model.dirty).toBe(true);
    expect(persist).not.toHaveBeenCalled();
  });

  it('clears dirty state when draft settings are reverted', () => {
    const { model } = setup();
    model.setEnabled(false);
    expect(model.dirty).toBe(true);
    model.setEnabled(true);
    expect(model.dirty).toBe(false);
    model.setSiteEnabled('google', false);
    model.setSiteEnabled('google', true);
    expect(model.dirty).toBe(false);
  });

  it('enforces preferred-engine invariants while keeping custom destinations selectable', () => {
    const { model } = setup({ customEngines: [customEngine] });
    model.setPreferences(customEngine.id, customEngine.id);
    expect(model.draft.firstPreferredEngineId).toBe(customEngine.id);
    expect(model.draft.secondPreferredEngineId).toBeNull();
    model.setPreferences(null, 'google');
    expect(model.draft.secondPreferredEngineId).toBeNull();
  });

  it('adds and edits custom engines and icon URLs without saving, preserving order', () => {
    const { model, persist } = setup({ customEngines: [customEngine] });
    model.openEditor(customEngine.id);
    model.editField('name', 'Renamed');
    model.editField('iconUrl', 'https://images.example/changed.png');
    expect(model.dirty).toBe(true);
    expect(model.applyEditor().validation.valid).toBe(true);
    expect(model.draft.customEngines[0]).toMatchObject({
      id: customEngine.id, name: 'Renamed', creationOrder: 5,
      iconUrl: 'https://images.example/changed.png',
    });
    model.openEditor();
    fillEditor(model);
    model.applyEditor();
    expect(model.draft.customEngines.map(({ name }) => name)).toEqual(['Renamed', 'Added']);
    expect(model.draft.customEngines[1].creationOrder).toBe(6);
    expect(model.baseline.customEngines).toEqual([customEngine]);
    expect(persist).not.toHaveBeenCalled();
  });

  it('keeps custom-engine deletion and preference cleanup in the draft', () => {
    const { model, persist } = setup({
      customEngines: [customEngine], firstPreferredEngineId: customEngine.id,
      secondPreferredEngineId: 'bing',
    });
    model.deleteEngine(customEngine.id);
    expect(model.draft.customEngines).toEqual([]);
    expect(model.draft.firstPreferredEngineId).toBeNull();
    expect(model.draft.secondPreferredEngineId).toBeNull();
    expect(model.baseline.customEngines).toEqual([customEngine]);
    expect(persist).not.toHaveBeenCalled();
  });

  it('Cancel restores all saved values, deleted engines, and unapplied editor fields', () => {
    const { model, persist } = setup({ customEngines: [customEngine], firstPreferredEngineId: 'google' });
    const baseline = structuredClone(model.baseline);
    model.setEnabled(false);
    model.setSiteEnabled('ecosia', false);
    model.setPreferences('bing', 'brave');
    model.deleteEngine(customEngine.id);
    model.openEditor();
    fillEditor(model);
    model.applyEditor();
    model.openEditor();
    model.editField('iconUrl', 'https://unapplied.example/icon.png');
    model.cancel();
    expect(model.draft).toEqual(baseline);
    expect(model.editor).toBeNull();
    expect(model.dirty).toBe(false);
    expect(persist).not.toHaveBeenCalled();
  });

  it('Save persists every draft setting together, including the open engine editor', async () => {
    const { model, persist } = setup({ customEngines: [customEngine] });
    model.setEnabled(false);
    model.setSiteEnabled('google', false);
    model.setPreferences('bing', 'google');
    model.deleteEngine(customEngine.id);
    model.openEditor();
    fillEditor(model);
    expect(await model.save()).toEqual({ saved: true });
    expect(persist).toHaveBeenCalledTimes(1);
    expect(persist.mock.calls[0][0]).toMatchObject({
      enabled: false, siteEnabled: { google: false },
      firstPreferredEngineId: 'bing', secondPreferredEngineId: 'google',
      customEngines: [newEngine],
    });
    expect(model.draft).toEqual(model.baseline);
    expect(model.dirty).toBe(false);
    expect(model.editor).toBeNull();
    expect(model.baseline).not.toHaveProperty('editor');
  });

  it('Cancel after Save restores the most recent saved baseline', async () => {
    const { model } = setup();
    model.setEnabled(false);
    await model.save();
    model.setEnabled(true);
    model.cancel();
    expect(model.draft.enabled).toBe(false);
  });

  it('does not lose a pending engine edit when another editor is opened', () => {
    const { model } = setup({ customEngines: [customEngine] });
    model.openEditor();
    model.editField('name', 'Unsaved');
    expect(model.openEditor(customEngine.id)).toBe(false);
    expect(model.editor.input.name).toBe('Unsaved');
    model.closeEditor();
    expect(model.openEditor(customEngine.id)).toBe(true);
  });

  it('tracks unapplied icon edits and supports clearing the icon URL', async () => {
    const { model } = setup({ customEngines: [customEngine] });
    model.openEditor(customEngine.id);
    model.editField('iconUrl', '');
    expect(model.dirty).toBe(true);
    await model.save();
    expect(model.baseline.customEngines[0].iconUrl).toBeNull();
  });

  it('validates incomplete editor fields before saving any draft change', async () => {
    const { model, persist } = setup();
    model.setEnabled(false);
    model.openEditor();
    model.editField('name', 'Incomplete');
    const result = await model.save();
    expect(result.saved).toBe(false);
    expect(result.editorErrors.homeUrl).toBeTruthy();
    expect(model.dirty).toBe(true);
    expect(model.editor.input.name).toBe('Incomplete');
    expect(persist).not.toHaveBeenCalled();
  });

  it('rejects non-HTTPS icons while retaining the draft and engine', async () => {
    const { model, persist } = setup({ customEngines: [customEngine] });
    model.openEditor(customEngine.id);
    model.editField('iconUrl', 'http://images.example/icon.png');
    const result = await model.save();
    expect(result.editorErrors.iconUrl).toContain('HTTPS');
    expect(model.draft.customEngines).toHaveLength(1);
    expect(model.editor.input.iconUrl).toContain('http:');
    expect(persist).not.toHaveBeenCalled();
  });

  it('validates the entire configuration before persistence', async () => {
    const { model, persist } = setup({ customEngines: [customEngine] });
    model.draft.customEngines[0].homeUrl = 'javascript:alert(1)';
    expect(validateOptionsDraft(model.draft).valid).toBe(false);
    expect((await model.save()).saved).toBe(false);
    expect(persist).not.toHaveBeenCalled();
  });

  it('retains a dirty draft and permits retry when persistent storage rejects Save', async () => {
    const { model, persist } = setup();
    persist.mockRejectedValueOnce(new Error('Browser sync quota exceeded.'));
    model.setEnabled(false);
    await expect(model.save()).rejects.toThrow('quota');
    expect(model.dirty).toBe(true);
    expect(model.baseline.enabled).toBe(true);
    expect(model.saving).toBe(false);
    expect((await model.save()).saved).toBe(true);
  });

  it('ignores its own in-flight storage event and prevents concurrent draft edits', async () => {
    let resolve;
    const { model, persist } = setup();
    persist.mockImplementation((value) => new Promise((done) => {
      model.acceptExternal(value);
      resolve = () => done(value);
    }));
    model.setEnabled(false);
    const saving = model.save();
    expect(model.saving).toBe(true);
    expect(model.externalChanged).toBe(false);
    model.setEnabled(true);
    expect(model.draft.enabled).toBe(false);
    resolve();
    await saving;
    expect(model.dirty).toBe(false);
  });
});

describe('Options page external configuration changes', () => {
  it('refreshes baseline and draft automatically when there are no unsaved edits', () => {
    const { model, persist } = setup();
    model.acceptExternal({ enabled: false, firstPreferredEngineId: 'google' });
    expect(model.draft.enabled).toBe(false);
    expect(model.draft.firstPreferredEngineId).toBe('google');
    expect(model.draft).toEqual(model.baseline);
    expect(model.externalChanged).toBe(false);
    expect(persist).not.toHaveBeenCalled();
  });

  it('keeps a dirty draft, warns, and resets to the newest saved configuration', () => {
    const { model } = setup();
    model.setSiteEnabled('google', false);
    model.acceptExternal({ enabled: false, firstPreferredEngineId: 'bing' });
    expect(model.externalChanged).toBe(true);
    expect(model.draft.siteEnabled.google).toBe(false);
    expect(model.draft.enabled).toBe(true);
    model.cancel();
    expect(model.draft.enabled).toBe(false);
    expect(model.draft.siteEnabled.google).toBe(true);
    expect(model.draft.firstPreferredEngineId).toBe('bing');
    expect(model.dirty).toBe(false);
    expect(model.externalChanged).toBe(false);
  });

  it('also protects unsubmitted custom engine and icon URL fields from external updates', () => {
    const { model } = setup();
    model.openEditor();
    fillEditor(model);
    model.acceptExternal({ firstPreferredEngineId: 'bing' });
    expect(model.editor.input).toEqual(newEngine);
    expect(model.externalChanged).toBe(true);
    model.cancel();
    expect(model.editor).toBeNull();
    expect(model.draft.firstPreferredEngineId).toBe('bing');
  });

  it('allows an explicit Save to replace external settings with the retained draft', async () => {
    const { model, persist } = setup();
    model.setEnabled(false);
    model.acceptExternal({ firstPreferredEngineId: 'bing' });
    await model.save();
    expect(persist.mock.calls[0][0].enabled).toBe(false);
    expect(model.draft.firstPreferredEngineId).toBeNull();
    expect(model.externalChanged).toBe(false);
  });
});
