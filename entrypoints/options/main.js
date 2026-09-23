import { BUILT_IN_ENGINES, getSelectableEngines, sortCustomEngines } from '../../utils/engines.js';
import {
  loadSettings, saveSettings, listenForSettingsChanges, getSettingsStorageStatus,
} from '../../utils/storage.js';
import { OptionsDraft } from './draft.js';

const elements = Object.fromEntries([
  'enabled', 'site-settings', 'first-preference', 'second-preference', 'preference-error',
  'save-status', 'save-error', 'save-changes', 'cancel-changes', 'dirty-status',
  'external-warning', 'reload-saved-settings', 'continue-without-preference',
  'built-in-engine-list', 'custom-engine-list', 'add-custom-engine', 'custom-engine-form',
  'editor-title', 'custom-name', 'custom-home-url', 'custom-search-url', 'custom-icon-url',
  'cancel-custom-engine', 'cancel-custom-engine-secondary', 'editor-error-summary',
  'custom-name-error', 'custom-home-url-error', 'custom-search-url-error', 'custom-icon-error',
].map((id) => [id, document.getElementById(id)]));

let model;
let removeSettingsListener;
const fieldIds = {
  name: ['custom-name', 'custom-name-error'],
  homeUrl: ['custom-home-url', 'custom-home-url-error'],
  searchUrlTemplate: ['custom-search-url', 'custom-search-url-error'],
  iconUrl: ['custom-icon-url', 'custom-icon-error'],
};

function createEngineIcon(engine) {
  const container = document.createElement('span');
  container.className = 'engine-icon';
  container.setAttribute('aria-hidden', 'true');
  container.textContent = engine.name.trim().charAt(0) || '?';
  const source = engine.kind === 'custom' ? engine.iconUrl : engine.iconPath;
  if (source) {
    const image = document.createElement('img');
    image.alt = '';
    image.referrerPolicy = 'no-referrer';
    image.addEventListener('error', () => image.remove(), { once: true });
    image.src = source;
    container.append(image);
  }
  return container;
}

function announce(message) {
  elements['save-status'].textContent = message;
}

function clearSaveError() {
  elements['save-error'].hidden = true;
  elements['save-error'].textContent = '';
}

async function renderStorageNotice() {
  const { backend, reason } = await getSettingsStorageStatus();
  const notice = document.getElementById('storage-notice');
  notice.hidden = backend !== 'local';
  notice.textContent = reason === 'migration-quota'
    ? 'Your existing settings are preserved on this device because they exceed browser sync limits. Reduce the configuration and save again to enable browser-native sync.'
    : 'Browser sync storage is unavailable. Settings are saved on this device.';
}

function updateState() {
  elements['save-changes'].disabled = !model.dirty || model.saving;
  elements['cancel-changes'].disabled = !model.dirty || model.saving;
  elements['reload-saved-settings'].disabled = model.saving;
  elements['save-changes'].textContent = model.saving ? 'Saving…' : 'Save changes';
  elements['dirty-status'].textContent = model.dirty ? 'Unsaved changes' : 'All changes saved';
  elements['external-warning'].hidden = !model.externalChanged;
  document.querySelector('main').setAttribute('aria-busy', String(model.saving));
}

function changed() {
  clearSaveError();
  announce('');
  updateState();
}

function renderPreferences() {
  const settings = model.draft;
  const engines = getSelectableEngines(settings.customEngines);
  const renderSelect = (select, selectedId, emptyText, unavailableId = null) => {
    select.replaceChildren();
    const empty = document.createElement('option');
    empty.value = '';
    empty.textContent = emptyText;
    select.append(empty);
    engines.forEach((engine) => {
      const option = document.createElement('option');
      option.value = engine.id;
      option.textContent = engine.kind === 'custom' ? `${engine.name} (Custom)` : engine.name;
      option.disabled = engine.id === unavailableId;
      select.append(option);
    });
    select.value = selectedId ?? '';
  };
  renderSelect(elements['first-preference'], settings.firstPreferredEngineId, 'No preferred engine');
  renderSelect(elements['second-preference'], settings.secondPreferredEngineId,
    'No second preferred engine', settings.firstPreferredEngineId);
  elements['second-preference'].disabled = !settings.firstPreferredEngineId || model.saving;
  elements['preference-error'].hidden = true;
}

function renderSites() {
  const toggles = BUILT_IN_ENGINES.map((engine) => {
    const label = document.createElement('label');
    label.className = 'toggle-row';
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.id = `site-${engine.id}`;
    checkbox.checked = model.draft.siteEnabled[engine.id];
    checkbox.disabled = model.saving;
    checkbox.addEventListener('change', () => {
      model.setSiteEnabled(engine.id, checkbox.checked);
      changed();
    });
    const name = document.createElement('span');
    name.textContent = engine.id === 'brave' ? 'Brave Search' : engine.name;
    label.append(checkbox, createEngineIcon(engine), name);
    return label;
  });
  elements['site-settings'].replaceChildren(...toggles);
}

function renderBuiltInCatalog() {
  elements['built-in-engine-list'].replaceChildren(...BUILT_IN_ENGINES.map((engine) => {
    const item = document.createElement('li');
    item.className = 'engine-chip';
    const name = document.createElement('span');
    name.textContent = engine.name;
    item.append(createEngineIcon(engine), name);
    return item;
  }));
}

function renderCustomEngines() {
  const engines = sortCustomEngines(model.draft.customEngines);
  if (!engines.length) {
    const empty = document.createElement('p');
    empty.className = 'empty-state';
    empty.textContent = 'No custom engines yet. Add one using its HTTPS homepage and search URL template.';
    elements['custom-engine-list'].replaceChildren(empty);
    return;
  }
  elements['custom-engine-list'].replaceChildren(...engines.map((engine) => {
    const card = document.createElement('article');
    card.className = 'custom-card';
    const copy = document.createElement('div');
    copy.className = 'custom-card__copy';
    const name = document.createElement('strong');
    name.textContent = engine.name;
    const template = document.createElement('span');
    template.textContent = engine.searchUrlTemplate;
    template.title = engine.searchUrlTemplate;
    copy.append(name, template);
    const actions = document.createElement('div');
    actions.className = 'custom-card__actions';
    const edit = document.createElement('button');
    edit.type = 'button';
    edit.className = 'button button--secondary';
    edit.textContent = 'Edit';
    edit.disabled = model.saving;
    edit.setAttribute('aria-label', `Edit ${engine.name}`);
    edit.addEventListener('click', () => openEditor(engine.id));
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'button button--danger';
    remove.textContent = 'Delete';
    remove.disabled = model.saving;
    remove.setAttribute('aria-label', `Delete ${engine.name}`);
    remove.addEventListener('click', () => {
      model.deleteEngine(engine.id);
      render();
      announce(`${engine.name} removed from the draft. Cancel restores saved engines.`);
    });
    actions.append(edit, remove);
    card.append(createEngineIcon(engine), copy, actions);
    return card;
  }));
}

function clearFieldErrors() {
  Object.values(fieldIds).forEach(([fieldId, errorId]) => {
    elements[fieldId].removeAttribute('aria-invalid');
    elements[errorId].textContent = '';
  });
  elements['editor-error-summary'].hidden = true;
}

function showValidationErrors(errors) {
  clearFieldErrors();
  let firstInvalid;
  Object.entries(fieldIds).forEach(([key, [fieldId, errorId]]) => {
    if (!errors[key]) return;
    elements[fieldId].setAttribute('aria-invalid', 'true');
    elements[errorId].textContent = errors[key];
    firstInvalid ??= elements[fieldId];
  });
  elements['editor-error-summary'].textContent = 'Please correct the highlighted custom-engine fields.';
  elements['editor-error-summary'].hidden = false;
  firstInvalid?.focus();
}

function renderEditor() {
  elements['custom-engine-form'].hidden = !model.editor;
  if (!model.editor) {
    elements['custom-engine-form'].reset();
    clearFieldErrors();
    return;
  }
  elements['editor-title'].textContent = model.editor.id ? 'Edit custom engine' : 'Add custom engine';
  Object.entries(fieldIds).forEach(([key, [id]]) => {
    elements[id].value = model.editor.input[key];
  });
}

function openEditor(id = null) {
  if (!model.openEditor(id)) {
    announce('Apply or discard the current engine edit before opening another.');
    elements['custom-name'].focus();
    return;
  }
  clearFieldErrors();
  renderEditor();
  elements['custom-name'].focus();
  elements['custom-engine-form'].scrollIntoView({ block: 'nearest' });
}

function closeEditor() {
  model.closeEditor();
  renderEditor();
  changed();
  elements['add-custom-engine'].focus();
}

function render() {
  elements.enabled.checked = model.draft.enabled;
  renderSites();
  renderPreferences();
  renderCustomEngines();
  renderEditor();
  updateState();
}

function cancelChanges() {
  model.cancel();
  clearSaveError();
  render();
  announce('Unsaved changes discarded. Latest saved settings restored.');
}

async function saveChanges() {
  clearSaveError();
  announce('');
  const promise = model.save();
  // Lock controls until storage settles; edits during an asynchronous write must not be lost.
  const disabledState = new Map([...document.querySelectorAll('input, select, button')]
    .map((control) => [control, control.disabled]));
  disabledState.forEach((_, control) => { control.disabled = true; });
  updateState();
  try {
    const result = await promise;
    if (result.saved) {
      render();
      await renderStorageNotice();
      announce('Changes saved. Reload open search-engine pages to apply global or site changes.');
    } else if (result.editorErrors) {
      showValidationErrors(result.editorErrors);
    } else if (result.errors) {
      elements['save-error'].textContent = result.errors.join(' ');
      elements['save-error'].hidden = false;
    }
  } catch (error) {
    elements['save-error'].textContent = `Changes could not be saved. ${error.message || 'Please try again.'}`;
    elements['save-error'].hidden = false;
  } finally {
    disabledState.forEach((disabled, control) => { control.disabled = disabled; });
    elements['second-preference'].disabled = !model.draft.firstPreferredEngineId;
    updateState();
    document.querySelector('[aria-invalid="true"]')?.focus();
  }
}

function initializeEvents() {
  elements.enabled.addEventListener('change', () => {
    model.setEnabled(elements.enabled.checked);
    changed();
  });
  elements['first-preference'].addEventListener('change', () => {
    model.setPreferences(elements['first-preference'].value, elements['second-preference'].value);
    renderPreferences();
    changed();
  });
  elements['second-preference'].addEventListener('change', () => {
    model.setPreferences(elements['first-preference'].value, elements['second-preference'].value);
    renderPreferences();
    changed();
  });
  elements['continue-without-preference'].addEventListener('click', () => {
    model.setPreferences(null, null);
    renderPreferences();
    changed();
  });
  elements['add-custom-engine'].addEventListener('click', () => openEditor());
  elements['cancel-custom-engine'].addEventListener('click', closeEditor);
  elements['cancel-custom-engine-secondary'].addEventListener('click', closeEditor);
  Object.entries(fieldIds).forEach(([key, [id]]) => {
    elements[id].addEventListener('input', () => {
      model.editField(key, elements[id].value);
      clearFieldErrors();
      changed();
    });
  });
  elements['custom-engine-form'].addEventListener('submit', (event) => {
    event.preventDefault();
    const result = model.applyEditor();
    if (!result) return;
    if (!result.validation.valid) {
      showValidationErrors(result.validation.errors);
      return;
    }
    render();
    announce(`${result.engine.name} applied to the draft. Use Save changes to keep it.`);
    elements['add-custom-engine'].focus();
  });
  elements['save-changes'].addEventListener('click', () => void saveChanges());
  elements['cancel-changes'].addEventListener('click', cancelChanges);
  elements['reload-saved-settings'].addEventListener('click', cancelChanges);
  window.addEventListener('beforeunload', (event) => {
    if (!model.dirty) return;
    event.preventDefault();
    event.returnValue = '';
  });
  window.addEventListener('pagehide', () => removeSettingsListener?.(), { once: true });
}

try {
  model = new OptionsDraft(await loadSettings(), saveSettings);
  initializeEvents();
  renderBuiltInCatalog();
  render();
  removeSettingsListener = listenForSettingsChanges((settings) => {
    const wasDirty = model.dirty;
    model.acceptExternal(settings);
    if (!wasDirty) render();
    else updateState();
  });
  // Close the load/listen race without overwriting a draft the user already started.
  model.acceptExternal(await loadSettings());
  render();
  await renderStorageNotice();
} catch {
  elements['save-error'].textContent = 'Settings could not be loaded. Reload this page to try again.';
  elements['save-error'].hidden = false;
  document.querySelectorAll('input, select, button').forEach((control) => { control.disabled = true; });
}
