import { browser } from 'wxt/browser';
import { defineBackground } from 'wxt/utils/define-background';

const ONBOARDING_OPENED_KEY = 'freeSearchSwitcherOnboardingOpened';

function openSettingsPage() {
  return browser.runtime.openOptionsPage();
}

async function openSettingsOnFirstInstall() {
  const stored = await browser.storage.local.get(ONBOARDING_OPENED_KEY);
  if (stored[ONBOARDING_OPENED_KEY]) {
    return;
  }

  await browser.storage.local.set({ [ONBOARDING_OPENED_KEY]: true });
  await openSettingsPage();
}

export default defineBackground({
  type: 'module',
  main() {
    browser.runtime.onInstalled.addListener((details) => {
      if (details.reason === 'install') {
        void openSettingsOnFirstInstall();
      }
    });

    browser.action.onClicked.addListener(() => {
      void openSettingsPage();
    });
  },
});
