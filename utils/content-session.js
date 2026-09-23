import { createPageState, PAGE_STATE_MESSAGE } from './page-state.js';

// Register the responder even when injection is disabled. Its immutable snapshot
// lives exactly as long as this document, and remains available after popup close.
export async function startContentSession({
  context, runtime, adapter, loadSettings, listenForSettingsChanges, createUi,
}) {
  let invalidated = false;
  let ui;
  let stopListening;
  const settingsPromise = loadSettings();
  const snapshotPromise = settingsPromise.then((settings) => createPageState(adapter.id, settings));
  const respond = (message) => {
    if (message?.type === PAGE_STATE_MESSAGE) return snapshotPromise;
    return undefined;
  };
  runtime.onMessage.addListener(respond);
  context.onInvalidated(() => {
    invalidated = true;
    runtime.onMessage.removeListener(respond);
    stopListening?.();
    ui?.stop();
  });

  const [settings, snapshot] = await Promise.all([settingsPromise, snapshotPromise]);
  if (invalidated || !snapshot.eligible) return;
  ui = createUi(settings);
  ui.start();
  stopListening = listenForSettingsChanges((nextSettings) => {
    // Preferences and destinations stay live; injection eligibility never does.
    ui.updateSettings({
      ...nextSettings,
      enabled: settings.enabled,
      siteEnabled: settings.siteEnabled,
    });
  });
}
