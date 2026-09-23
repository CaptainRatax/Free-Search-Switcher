import { PAGE_STATE_MESSAGE, needsPageReload } from './page-state.js';

export async function isAndroid(runtime, userAgent = '') {
  try {
    return (await runtime.getPlatformInfo()).os === 'android';
  } catch {
    return /Android/i.test(userAgent);
  }
}

export class PopupController {
  constructor({ browser, storage, onChange = () => {} }) {
    this.browser = browser;
    this.storage = storage;
    this.onChange = onChange;
    this.settings = null;
    this.pageState = null;
    this.tabId = null;
    this.refreshId = 0;
  }

  get reloadRequired() {
    return Boolean(this.settings && needsPageReload(this.settings, this.pageState));
  }

  async start() {
    this.settings = await this.storage.loadSettings();
    this.onChange(this);
    this.stopListening = this.storage.listenForSettingsChanges((settings) => {
      this.settings = settings;
      this.onChange(this);
    });
    this.onTabChange = () => { void this.refreshPageState(); };
    this.browser.tabs.onActivated?.addListener(this.onTabChange);
    this.browser.tabs.onUpdated?.addListener(this.onTabChange);
    // A sync update between the initial read and subscription must not leave
    // the quick controls showing an older configuration.
    this.settings = await this.storage.loadSettings();
    this.onChange(this);
    await this.refreshPageState();
  }

  async refreshPageState() {
    const requestId = ++this.refreshId;
    let tabId = null;
    let pageState = null;
    try {
      // Read only the tab ID. URLs/titles/history are neither needed nor retained.
      const [tab] = await this.browser.tabs.query({ active: true, currentWindow: true });
      tabId = tab?.id ?? null;
      if (tabId !== null) {
        pageState = await this.browser.tabs.sendMessage(tabId, { type: PAGE_STATE_MESSAGE }, { frameId: 0 });
      }
    } catch {
      // Unsupported pages and documents still loading have no responder.
    }
    if (requestId !== this.refreshId) return;
    this.tabId = tabId;
    this.pageState = pageState;
    this.onChange(this);
  }

  async change(patch) {
    this.settings = await this.storage.updateSettings(patch);
    await this.refreshPageState();
    return this.settings;
  }

  async reloadPage() {
    await this.refreshPageState();
    if (!this.reloadRequired || this.tabId === null) return;
    await this.browser.tabs.reload(this.tabId);
    // The old document is leaving; its snapshot must not outlive that document.
    this.pageState = null;
    this.onChange(this);
  }

  openSettings() {
    return this.browser.runtime.openOptionsPage();
  }

  stop() {
    ++this.refreshId;
    this.stopListening?.();
    this.browser.tabs.onActivated?.removeListener(this.onTabChange);
    this.browser.tabs.onUpdated?.removeListener(this.onTabChange);
  }
}
