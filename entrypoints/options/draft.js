import { BUILT_IN_ENGINES, getSelectableEngines } from '../../utils/engines.js';
import { deleteCustomEngine, normalizeSettings, upsertCustomEngine } from '../../utils/settings.js';
import { validateCustomEngine } from '../../utils/validation.js';

const clone = (value) => structuredClone(value);
const equal = (left, right) => JSON.stringify(left) === JSON.stringify(right);
const editorInput = (engine = {}) => ({
  name: engine.name ?? '',
  homeUrl: engine.homeUrl ?? '',
  searchUrlTemplate: engine.searchUrlTemplate ?? '',
  iconUrl: engine.iconUrl ?? '',
});

export function validateOptionsDraft(settings) {
  const errors = [];
  if (typeof settings.enabled !== 'boolean') {
    errors.push('Choose whether Free Search Switcher is enabled.');
  }
  if (BUILT_IN_ENGINES.some(({ id }) => typeof settings.siteEnabled?.[id] !== 'boolean')) {
    errors.push('Choose where Free Search Switcher appears for every supported engine.');
  }
  const ids = new Set(getSelectableEngines(settings.customEngines).map(({ id }) => id));
  const first = settings.firstPreferredEngineId;
  const second = settings.secondPreferredEngineId;
  if ((first && !ids.has(first)) || (second && (!ids.has(second) || !first || second === first))) {
    errors.push('Select different preferred engines, with a first engine before a second.');
  }
  const customIds = new Set();
  for (const engine of settings.customEngines) {
    if (!engine.id?.startsWith('custom-') || customIds.has(engine.id)
      || !Number.isFinite(engine.creationOrder) || !validateCustomEngine(engine).valid) {
      errors.push('Check the names, HTTPS URLs, and search templates of your custom engines.');
      break;
    }
    customIds.add(engine.id);
  }
  return { valid: errors.length === 0, errors };
}

// This controller owns only a page's working copy. Persist is called exclusively by Save.
export class OptionsDraft {
  constructor(settings, persist) {
    this.baseline = normalizeSettings(settings);
    this.draft = clone(this.baseline);
    this.persist = persist;
    this.editor = null;
    this.externalChanged = false;
    this.saving = false;
    this.pendingSave = null;
  }

  get editorDirty() {
    return Boolean(this.editor && !equal(this.editor.input, this.editor.initial));
  }

  get dirty() {
    return this.editorDirty || !equal(this.draft, this.baseline);
  }

  setEnabled(enabled) {
    if (!this.saving) this.draft.enabled = enabled;
  }

  setSiteEnabled(id, enabled) {
    if (!this.saving && BUILT_IN_ENGINES.some((engine) => engine.id === id)) {
      this.draft.siteEnabled[id] = enabled;
    }
  }

  setPreferences(first, second) {
    if (this.saving) return;
    this.draft = normalizeSettings({
      ...this.draft,
      firstPreferredEngineId: first || null,
      secondPreferredEngineId: second || null,
    });
  }

  openEditor(engineId = null) {
    if (this.saving) return false;
    // Never silently discard an in-progress add/edit when another editor is requested.
    if (this.editorDirty) return false;
    const engine = this.draft.customEngines.find(({ id }) => id === engineId);
    const input = editorInput(engine);
    this.editor = { id: engine?.id ?? null, input, initial: clone(input) };
    return true;
  }

  editField(field, value) {
    if (!this.saving && this.editor && Object.hasOwn(this.editor.input, field)) {
      this.editor.input[field] = value;
    }
  }

  closeEditor() {
    if (!this.saving) this.editor = null;
  }

  applyEditor() {
    if (this.saving || !this.editor) return null;
    const result = upsertCustomEngine(this.draft, this.editor.input, this.editor.id);
    if (result.validation.valid) {
      this.draft = result.settings;
      this.editor = null;
    }
    return result;
  }

  deleteEngine(id) {
    if (this.saving) return;
    this.draft = deleteCustomEngine(this.draft, id);
    if (this.editor?.id === id) this.editor = null;
  }

  acceptExternal(settings) {
    const next = normalizeSettings(settings);
    // storage.onChanged may fire before our own Save promise resolves.
    if (this.pendingSave && equal(next, this.pendingSave)) return;
    if (equal(next, this.baseline)) return;
    const hadChanges = this.dirty;
    this.baseline = next;
    if (hadChanges) {
      this.externalChanged = this.dirty;
    } else {
      this.draft = clone(next);
      this.editor = null;
      this.externalChanged = false;
    }
  }

  cancel() {
    if (this.saving) return;
    this.draft = clone(this.baseline);
    this.editor = null;
    this.externalChanged = false;
  }

  async save() {
    if (this.saving) return { saved: false };
    if (this.editorDirty) {
      const result = this.applyEditor();
      if (!result.validation.valid) {
        return { saved: false, editorErrors: result.validation.errors };
      }
    }
    const validation = validateOptionsDraft(this.draft);
    if (!validation.valid) return { saved: false, errors: validation.errors };
    this.saving = true;
    this.pendingSave = clone(this.draft);
    try {
      const saved = normalizeSettings(await this.persist(clone(this.pendingSave)));
      this.baseline = saved;
      this.draft = clone(saved);
      this.editor = null;
      this.externalChanged = false;
      return { saved: true };
    } finally {
      this.saving = false;
      this.pendingSave = null;
    }
  }
}
