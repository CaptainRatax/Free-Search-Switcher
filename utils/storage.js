import { browser } from 'wxt/browser';
import { createSettingsStorage } from './settings-storage.js';

// Browser-facing entry point; persistence and migration stay independently testable.
const settingsStorage = createSettingsStorage(browser.storage);

export const loadSettings = settingsStorage.loadSettings;
export const saveSettings = settingsStorage.saveSettings;
export const updateSettings = settingsStorage.updateSettings;
export const listenForSettingsChanges = settingsStorage.listenForSettingsChanges;
export const getSettingsStorageStatus = settingsStorage.getSettingsStorageStatus;
