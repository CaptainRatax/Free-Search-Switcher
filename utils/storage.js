import { browser } from 'wxt/browser';
import { DEFAULT_SETTINGS, normalizeSettings, STORAGE_KEY } from './settings.js';

export async function loadSettings() {
  const stored = await browser.storage.local.get(STORAGE_KEY);
  return normalizeSettings(stored[STORAGE_KEY] ?? DEFAULT_SETTINGS);
}

export async function saveSettings(settings) {
  const normalized = normalizeSettings(settings);
  await browser.storage.local.set({ [STORAGE_KEY]: normalized });
  return normalized;
}

export function listenForSettingsChanges(listener) {
  const handleStorageChange = (changes, areaName) => {
    if (areaName !== 'local' || !changes[STORAGE_KEY]) {
      return;
    }

    listener(normalizeSettings(changes[STORAGE_KEY].newValue));
  };

  browser.storage.onChanged.addListener(handleStorageChange);
  return () => browser.storage.onChanged.removeListener(handleStorageChange);
}

