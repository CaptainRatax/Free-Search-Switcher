import { getSelectableEngines, sortCustomEngines } from '../../utils/engines.js';
import { deleteCustomEngine, upsertCustomEngine } from '../../utils/settings.js';
import { loadSettings, saveSettings } from '../../utils/storage.js';

const MAX_ICON_FILE_SIZE = 2 * 1024 * 1024;
const SAFE_ICON_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/x-icon',
  'image/vnd.microsoft.icon',
]);

const elements = {
  firstPreference: document.querySelector('#first-preference'),
  secondPreference: document.querySelector('#second-preference'),
  preferenceError: document.querySelector('#preference-error'),
  saveStatus: document.querySelector('#save-status'),
  continueWithoutPreference: document.querySelector('#continue-without-preference'),
  builtInEngineList: document.querySelector('#built-in-engine-list'),
  customEngineList: document.querySelector('#custom-engine-list'),
  addCustomEngine: document.querySelector('#add-custom-engine'),
  customEngineForm: document.querySelector('#custom-engine-form'),
  editorTitle: document.querySelector('#editor-title'),
  customName: document.querySelector('#custom-name'),
  customHomeUrl: document.querySelector('#custom-home-url'),
  customSearchUrl: document.querySelector('#custom-search-url'),
  customIconFile: document.querySelector('#custom-icon-file'),
  customIconPreview: document.querySelector('#custom-icon-preview'),
  customIconError: document.querySelector('#custom-icon-error'),
  removeCustomIcon: document.querySelector('#remove-custom-icon'),
  cancelCustomEngine: document.querySelector('#cancel-custom-engine'),
  cancelCustomEngineSecondary: document.querySelector('#cancel-custom-engine-secondary'),
  editorErrorSummary: document.querySelector('#editor-error-summary'),
  customNameError: document.querySelector('#custom-name-error'),
  customHomeUrlError: document.querySelector('#custom-home-url-error'),
  customSearchUrlError: document.querySelector('#custom-search-url-error'),
};

let settings = await loadSettings();
let editingEngineId = null;
let pendingIconDataUrl = null;
let statusTimer = null;

function createEngineIcon(engine, className = 'engine-icon') {
  const container = document.createElement('span');
  container.className = className;
  container.setAttribute('aria-hidden', 'true');
  container.textContent = engine.name.trim().charAt(0) || '?';

  const imageSource = engine.kind === 'custom' ? engine.iconDataUrl : engine.iconPath;
  if (imageSource) {
    const image = document.createElement('img');
    image.alt = '';
    image.src = imageSource;
    image.addEventListener('error', () => image.remove(), { once: true });
    container.append(image);
  }

  return container;
}

function announce(message) {
  window.clearTimeout(statusTimer);
  elements.saveStatus.textContent = message;
  statusTimer = window.setTimeout(() => {
    elements.saveStatus.textContent = '';
  }, 3_000);
}

function addSelectOption(select, engine, selectedId, unavailableId = null) {
  const option = document.createElement('option');
  option.value = engine.id;
  option.textContent = engine.kind === 'custom' ? `${engine.name} (Custom)` : engine.name;
  option.selected = engine.id === selectedId;
  option.disabled = engine.id === unavailableId;
  select.append(option);
}

function renderPreferences() {
  const engines = getSelectableEngines(settings.customEngines);
  elements.firstPreference.replaceChildren();
  elements.secondPreference.replaceChildren();

  const noFirst = document.createElement('option');
  noFirst.value = '';
  noFirst.textContent = 'No preferred engine';
  noFirst.selected = !settings.firstPreferredEngineId;
  elements.firstPreference.append(noFirst);

  const noSecond = document.createElement('option');
  noSecond.value = '';
  noSecond.textContent = 'No second preferred engine';
  noSecond.selected = !settings.secondPreferredEngineId;
  elements.secondPreference.append(noSecond);

  engines.forEach((engine) => {
    addSelectOption(elements.firstPreference, engine, settings.firstPreferredEngineId);
    addSelectOption(
      elements.secondPreference,
      engine,
      settings.secondPreferredEngineId,
      settings.firstPreferredEngineId,
    );
  });

  elements.secondPreference.disabled = !settings.firstPreferredEngineId;
  elements.preferenceError.hidden = true;
  elements.preferenceError.textContent = '';
}

function renderBuiltInCatalog() {
  const builtIns = getSelectableEngines([]);
  const items = builtIns.map((engine) => {
    const item = document.createElement('li');
    item.className = 'engine-chip';
    item.append(createEngineIcon(engine));
    const name = document.createElement('span');
    name.textContent = engine.name;
    item.append(name);
    return item;
  });
  elements.builtInEngineList.replaceChildren(...items);
}

function renderCustomEngines() {
  const customEngines = sortCustomEngines(settings.customEngines);
  if (!customEngines.length) {
    const emptyState = document.createElement('p');
    emptyState.className = 'empty-state';
    emptyState.textContent = 'No custom engines yet. Add one using its HTTPS homepage and search URL template.';
    elements.customEngineList.replaceChildren(emptyState);
    return;
  }

  const cards = customEngines.map((engine) => {
    const card = document.createElement('article');
    card.className = 'custom-card';
    card.append(createEngineIcon(engine));

    const copy = document.createElement('div');
    copy.className = 'custom-card__copy';
    const name = document.createElement('strong');
    name.textContent = engine.name;
    const template = document.createElement('span');
    template.textContent = engine.searchUrlTemplate;
    template.title = engine.searchUrlTemplate;
    copy.append(name, template);
    card.append(copy);

    const actions = document.createElement('div');
    actions.className = 'custom-card__actions';
    const editButton = document.createElement('button');
    editButton.type = 'button';
    editButton.className = 'button button--secondary';
    editButton.textContent = 'Edit';
    editButton.setAttribute('aria-label', `Edit ${engine.name}`);
    editButton.addEventListener('click', () => openEditor(engine));

    const deleteButton = document.createElement('button');
    deleteButton.type = 'button';
    deleteButton.className = 'button button--danger';
    deleteButton.textContent = 'Delete';
    deleteButton.setAttribute('aria-label', `Delete ${engine.name}`);
    deleteButton.addEventListener('click', () => void removeEngine(engine));
    actions.append(editButton, deleteButton);
    card.append(actions);
    return card;
  });

  elements.customEngineList.replaceChildren(...cards);
}

function renderIconPreview() {
  const previewEngine = {
    kind: 'custom',
    name: elements.customName.value || 'Custom',
    iconDataUrl: pendingIconDataUrl,
  };
  elements.customIconPreview.replaceWith(createEngineIcon(previewEngine, 'large-icon'));
  elements.customIconPreview = document.querySelector('.large-icon');
  elements.customIconPreview.id = 'custom-icon-preview';
  elements.customIconPreview.setAttribute('aria-label', 'Custom icon preview');
  elements.removeCustomIcon.disabled = !pendingIconDataUrl;
}

function clearFieldErrors() {
  const fields = [elements.customName, elements.customHomeUrl, elements.customSearchUrl];
  fields.forEach((field) => field.removeAttribute('aria-invalid'));
  elements.customNameError.textContent = '';
  elements.customHomeUrlError.textContent = '';
  elements.customSearchUrlError.textContent = '';
  elements.customIconError.textContent = '';
  elements.editorErrorSummary.textContent = '';
  elements.editorErrorSummary.hidden = true;
}

function showValidationErrors(errors) {
  clearFieldErrors();
  const mappings = [
    ['name', elements.customName, elements.customNameError],
    ['homeUrl', elements.customHomeUrl, elements.customHomeUrlError],
    ['searchUrlTemplate', elements.customSearchUrl, elements.customSearchUrlError],
  ];
  let firstInvalidField = null;

  mappings.forEach(([key, field, errorElement]) => {
    if (!errors[key]) {
      return;
    }

    field.setAttribute('aria-invalid', 'true');
    errorElement.textContent = errors[key];
    firstInvalidField ??= field;
  });

  if (errors.iconDataUrl) {
    elements.customIconError.textContent = errors.iconDataUrl;
  }

  elements.editorErrorSummary.textContent = 'Please correct the highlighted custom-engine fields.';
  elements.editorErrorSummary.hidden = false;
  firstInvalidField?.focus();
}

function openEditor(engine = null) {
  editingEngineId = engine?.id ?? null;
  pendingIconDataUrl = engine?.iconDataUrl ?? null;
  elements.editorTitle.textContent = engine ? `Edit ${engine.name}` : 'Add custom engine';
  elements.customName.value = engine?.name ?? '';
  elements.customHomeUrl.value = engine?.homeUrl ?? '';
  elements.customSearchUrl.value = engine?.searchUrlTemplate ?? '';
  elements.customIconFile.value = '';
  clearFieldErrors();
  renderIconPreview();
  elements.customEngineForm.hidden = false;
  elements.customName.focus();
  elements.customEngineForm.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function closeEditor() {
  editingEngineId = null;
  pendingIconDataUrl = null;
  elements.customEngineForm.reset();
  clearFieldErrors();
  elements.customEngineForm.hidden = true;
  elements.addCustomEngine.focus();
}

async function persistPreferences(firstId, secondId) {
  if (secondId && (!firstId || firstId === secondId)) {
    elements.preferenceError.textContent = 'The first and second preferred engines must be different.';
    elements.preferenceError.hidden = false;
    return;
  }

  settings = await saveSettings({
    ...settings,
    firstPreferredEngineId: firstId || null,
    secondPreferredEngineId: firstId ? (secondId || null) : null,
  });
  renderPreferences();
  announce('Preferences saved');
}

async function removeEngine(engine) {
  const confirmed = window.confirm(`Delete ${engine.name}? This cannot be undone.`);
  if (!confirmed) {
    return;
  }

  settings = await saveSettings(deleteCustomEngine(settings, engine.id));
  if (editingEngineId === engine.id) {
    closeEditor();
  }
  renderPreferences();
  renderCustomEngines();
  announce(`${engine.name} deleted`);
}

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();
    image.addEventListener('load', () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    }, { once: true });
    image.addEventListener('error', () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('The selected file could not be decoded as an image.'));
    }, { once: true });
    image.src = objectUrl;
  });
}

async function processIconFile(file) {
  if (!SAFE_ICON_TYPES.has(file.type)) {
    throw new Error('Choose a PNG, JPEG, WebP, or ICO image.');
  }

  if (file.size > MAX_ICON_FILE_SIZE) {
    throw new Error('The icon file must be 2 MB or smaller.');
  }

  const image = await loadImage(file);
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  const targetSize = 128;
  const scale = Math.min(targetSize / image.naturalWidth, targetSize / image.naturalHeight);
  const width = Math.max(1, Math.round(image.naturalWidth * scale));
  const height = Math.max(1, Math.round(image.naturalHeight * scale));
  const x = Math.round((targetSize - width) / 2);
  const y = Math.round((targetSize - height) / 2);

  canvas.width = targetSize;
  canvas.height = targetSize;
  context.clearRect(0, 0, targetSize, targetSize);
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';
  context.drawImage(image, x, y, width, height);
  return canvas.toDataURL('image/png');
}

elements.firstPreference.addEventListener('change', () => {
  const firstId = elements.firstPreference.value;
  const secondId = firstId && elements.secondPreference.value !== firstId
    ? elements.secondPreference.value
    : '';
  void persistPreferences(firstId, secondId);
});

elements.secondPreference.addEventListener('change', () => {
  void persistPreferences(elements.firstPreference.value, elements.secondPreference.value);
});

elements.continueWithoutPreference.addEventListener('click', () => {
  void persistPreferences('', '');
});

elements.addCustomEngine.addEventListener('click', () => openEditor());
elements.cancelCustomEngine.addEventListener('click', closeEditor);
elements.cancelCustomEngineSecondary.addEventListener('click', closeEditor);
elements.customName.addEventListener('input', renderIconPreview);

elements.removeCustomIcon.addEventListener('click', () => {
  pendingIconDataUrl = null;
  elements.customIconFile.value = '';
  elements.customIconError.textContent = '';
  renderIconPreview();
});

elements.customIconFile.addEventListener('change', async () => {
  const [file] = elements.customIconFile.files;
  if (!file) {
    return;
  }

  elements.customIconError.textContent = '';
  try {
    pendingIconDataUrl = await processIconFile(file);
    renderIconPreview();
  } catch (error) {
    pendingIconDataUrl = null;
    elements.customIconFile.value = '';
    elements.customIconError.textContent = error.message;
    renderIconPreview();
  }
});

elements.customEngineForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const result = upsertCustomEngine(
    settings,
    {
      name: elements.customName.value,
      homeUrl: elements.customHomeUrl.value,
      searchUrlTemplate: elements.customSearchUrl.value,
      iconDataUrl: pendingIconDataUrl,
    },
    editingEngineId,
  );

  if (!result.validation.valid) {
    showValidationErrors(result.validation.errors);
    return;
  }

  settings = await saveSettings(result.settings);
  const savedName = result.engine.name;
  closeEditor();
  renderPreferences();
  renderCustomEngines();
  announce(`${savedName} saved`);
});

renderBuiltInCatalog();
renderPreferences();
renderCustomEngines();
