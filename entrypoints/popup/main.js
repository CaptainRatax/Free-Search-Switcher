import { browser } from 'wxt/browser';
import { getSelectableEngines } from '../../utils/engines.js';
import * as storage from '../../utils/storage.js';
import { isAndroid, PopupController } from '../../utils/popup-controller.js';

const controls = document.querySelector('#desktop-controls');
const enabled = document.querySelector('#enabled');
const first = document.querySelector('#first-preference');
const second = document.querySelector('#second-preference');
const warning = document.querySelector('#reload-warning');
const error = document.querySelector('#error');
const status = document.querySelector('#status');
const reload = document.querySelector('#reload-page');

function renderSelect(select, engines, selected, emptyLabel, unavailable = null) {
  const empty = new Option(emptyLabel, '', !selected, !selected);
  select.replaceChildren(empty, ...engines.map((engine) => {
    const option = new Option(`${engine.name}${engine.kind === 'custom' ? ' (Custom)' : ''}`, engine.id, false, selected === engine.id);
    option.disabled = engine.id === unavailable;
    return option;
  }));
}

const controller = new PopupController({ browser, storage, onChange: () => {
  if (!controller.settings) return;
  const settings = controller.settings;
  enabled.checked = settings.enabled;
  const engines = getSelectableEngines(settings.customEngines);
  renderSelect(first, engines, settings.firstPreferredEngineId, 'No preferred engine');
  renderSelect(second, engines, settings.secondPreferredEngineId, 'No second preferred engine', settings.firstPreferredEngineId);
  second.disabled = !settings.firstPreferredEngineId;
  warning.hidden = !controller.reloadRequired;
} });

async function perform(action, successMessage = '') {
  error.hidden = true;
  status.textContent = '';
  controls.disabled = true;
  reload.disabled = true;
  try {
    await action();
    status.textContent = successMessage;
  } catch {
    error.textContent = 'The change could not be saved or applied. Please try again.';
    error.hidden = false;
    // Restore saved controls after a failed persistence attempt.
    controller.onChange(controller);
  } finally {
    controls.disabled = !controller.settings;
    reload.disabled = false;
  }
}

enabled.addEventListener('change', () => void perform(() => controller.change({ enabled: enabled.checked }), 'Saved'));
first.addEventListener('change', () => void perform(() => controller.change({ firstPreferredEngineId: first.value || null }), 'Saved'));
second.addEventListener('change', () => void perform(() => controller.change({ secondPreferredEngineId: second.value || null }), 'Saved'));
reload.addEventListener('click', () => void perform(() => controller.reloadPage()));
document.querySelector('#open-settings').addEventListener('click', () => void perform(async () => {
  await controller.openSettings();
  window.close();
}));
window.addEventListener('unload', () => controller.stop(), { once: true });

if (await isAndroid(browser.runtime, navigator.userAgent)) {
  document.body.classList.add('android');
  document.querySelector('#android-help').hidden = false;
} else {
  controls.hidden = false;
  await perform(() => controller.start());
}
