import { browser } from 'wxt/browser';
import { buildEngineMenu, getEngineById, selectQuickTarget } from '../utils/engines.js';
import { buildCurrentNavigationUrl } from '../utils/navigation.js';
import {
  calculateControlPosition,
  calculateMenuLayout,
  shouldRetryInlineSlot,
} from '../utils/positioning.js';

const HOST_ATTRIBUTE = 'data-free-search-switcher-root';
const MOBILE_MAX_WIDTH = 700;
const MOBILE_RESERVED_SPACE = 64;

const SHADOW_STYLES = `
  :host {
    color-scheme: light dark;
    font-family: "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  }

  * {
    box-sizing: border-box;
  }

  .switcher {
    align-items: center;
    display: inline-flex;
    filter: drop-shadow(0 6px 16px rgb(49 87 68 / 22%));
    font-family: "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    isolation: isolate;
    position: relative;
  }

  .button-group {
    align-items: stretch;
    background: rgb(248 255 252 / 97%);
    border: 1px solid #719880;
    border-radius: 12px;
    display: inline-flex;
    min-height: 36px;
    overflow: hidden;
  }

  button {
    -webkit-tap-highlight-color: transparent;
    appearance: none;
    background: transparent;
    border: 0;
    color: #183127;
    cursor: pointer;
    font: inherit;
    margin: 0;
    touch-action: manipulation;
  }

  .control-button {
    align-items: center;
    display: inline-flex;
    justify-content: center;
    min-height: 36px;
    padding: 5px 8px;
  }

  .control-button:hover,
  .control-button[aria-expanded="true"] {
    background: #d7feea;
  }

  .control-button:focus-visible,
  .menu-item:focus-visible {
    box-shadow: inset 0 0 0 3px #5982c8;
    outline: 0;
  }

  .quick-button {
    min-width: 38px;
  }

  .menu-button {
    border-inline-start: 1px solid rgb(113 152 128 / 48%);
    font-size: 14px;
    min-width: 30px;
  }

  .menu-button:only-child {
    border-inline-start: 0;
  }

  .engine-icon {
    align-items: center;
    background: #e7f8ef;
    border-radius: 7px;
    color: #315744;
    display: inline-flex;
    flex: 0 0 auto;
    font-size: 12px;
    font-weight: 750;
    height: 24px;
    justify-content: center;
    overflow: hidden;
    position: relative;
    text-transform: uppercase;
    width: 24px;
  }

  .engine-icon img {
    background: #fff;
    height: 100%;
    inset: 0;
    object-fit: contain;
    padding: 2px;
    position: absolute;
    width: 100%;
  }

  .menu {
    background: rgb(248 255 252 / 98%);
    border: 1px solid #719880;
    border-radius: 14px;
    box-shadow: 0 18px 44px rgb(38 71 55 / 26%);
    color: #183127;
    display: grid;
    gap: 3px;
    margin: 0;
    max-height: min(420px, var(--fss-menu-max-height, calc(100dvh - 72px)));
    max-width: calc(100vw - 16px);
    left: var(--fss-menu-inline-start, auto);
    min-width: 0;
    overflow-y: auto;
    overscroll-behavior: contain;
    padding: 6px;
    position: absolute;
    right: auto;
    top: calc(100% + 8px);
    width: var(--fss-menu-width, min(248px, calc(100vw - 16px)));
  }

  :host([data-menu-direction="up"]) .menu {
    bottom: calc(100% + 8px);
    top: auto;
  }

  .menu[hidden] {
    display: none;
  }

  .menu-item {
    align-items: center;
    border-radius: 9px;
    display: grid;
    gap: 9px;
    grid-template-columns: 28px minmax(0, 1fr) auto;
    min-height: 40px;
    padding: 6px 8px;
    text-align: start;
    width: 100%;
  }

  .menu-item:hover {
    background: #d7feea;
  }

  .engine-name {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .preference-badge {
    background: #d7feea;
    border: 1px solid rgb(113 152 128 / 38%);
    border-radius: 999px;
    color: #315744;
    font-size: 10px;
    font-weight: 750;
    letter-spacing: .02em;
    padding: 3px 6px;
    text-transform: uppercase;
    white-space: nowrap;
  }

  @media (max-width: 700px), (pointer: coarse) {
    .button-group {
      border-radius: 14px;
      min-height: 48px;
    }

    .control-button {
      min-height: 48px;
      padding: 9px 10px;
    }

    .quick-button {
      min-width: 48px;
    }

    .menu-button {
      font-size: 16px;
      min-width: 48px;
    }

    .engine-icon {
      height: 26px;
      width: 26px;
    }

    .menu {
      max-height: min(460px, var(--fss-menu-max-height, calc(100dvh - 88px)));
    }

    .menu-item {
      min-height: 52px;
      padding-block: 8px;
    }
  }

  @media (prefers-color-scheme: dark) {
    .button-group,
    .menu {
      background: rgb(20 34 39 / 97%);
      border-color: #719880;
      color: #effbf5;
    }

    button {
      color: #effbf5;
    }

    .control-button:hover,
    .control-button[aria-expanded="true"],
    .menu-item:hover {
      background: #29443c;
    }

    .engine-icon {
      background: #355249;
      color: #d7feea;
    }

    .preference-badge {
      background: #315744;
      border-color: #719880;
      color: #d7feea;
    }

    .control-button:focus-visible,
    .menu-item:focus-visible {
      box-shadow: inset 0 0 0 3px #6bc1ed;
    }
  }

  @media (forced-colors: active) {
    .button-group,
    .menu,
    .control-button,
    .menu-item {
      border: 1px solid ButtonText;
    }
  }
`;

function appendTextElement(document, parent, className, text) {
  const element = document.createElement('span');
  element.className = className;
  element.textContent = text;
  parent.append(element);
  return element;
}

function createEngineIcon(document, engine) {
  const icon = document.createElement('span');
  icon.className = 'engine-icon';
  icon.setAttribute('aria-hidden', 'true');
  icon.textContent = engine.name.trim().charAt(0) || '?';

  const imageSource = engine.kind === 'custom'
    ? engine.iconDataUrl
    : browser.runtime.getURL(engine.iconPath.replace(/^\//, ''));

  if (imageSource) {
    const image = document.createElement('img');
    image.alt = '';
    image.decoding = 'async';
    image.src = imageSource;
    image.addEventListener('error', () => image.remove(), { once: true });
    icon.append(image);
  }

  return icon;
}

function getViewportBounds(window) {
  const visualViewport = window.visualViewport;
  return {
    height: visualViewport?.height ?? window.innerHeight,
    left: visualViewport?.offsetLeft ?? 0,
    top: visualViewport?.offsetTop ?? 0,
    width: visualViewport?.width ?? window.innerWidth,
  };
}

export class SearchSwitcherUi {
  constructor({ document, window, adapter, settings }) {
    this.document = document;
    this.window = window;
    this.adapter = adapter;
    this.settings = settings;
    this.anchor = null;
    this.host = null;
    this.shadowRoot = null;
    this.menu = null;
    this.menuButton = null;
    this.menuOpen = false;
    this.mobileInlineRejection = null;
    this.mobileInlineSpacer = null;
    this.mobileSpacing = null;
    this.observer = null;
    this.resizeObserver = null;
    this.checkTimer = null;
    this.positionFrame = null;
    this.lastUrl = window.location.href;
    this.urlTimer = null;
    this.handleDocumentPointerDown = this.handleDocumentPointerDown.bind(this);
    this.handleDocumentEscape = this.handleDocumentEscape.bind(this);
    this.handleShadowKeyDown = this.handleShadowKeyDown.bind(this);
    this.handleViewportChange = this.handleViewportChange.bind(this);
  }

  start() {
    const existingHost = this.document.querySelector(`[${HOST_ATTRIBUTE}]`);
    if (existingHost) {
      existingHost.remove();
    }

    this.host = this.document.createElement('div');
    this.host.setAttribute(HOST_ATTRIBUTE, '');
    this.host.style.setProperty('all', 'initial');
    this.host.style.setProperty('display', 'none');
    this.host.style.setProperty('position', 'fixed');
    this.host.style.setProperty('z-index', '2147483646');
    this.shadowRoot = this.host.attachShadow({ mode: 'closed' });
    this.shadowRoot.addEventListener('keydown', this.handleShadowKeyDown);
    this.document.documentElement.append(this.host);

    this.render();
    this.ensureAnchor();

    this.observer = new MutationObserver((mutations) => {
      if (!this.anchor?.isConnected || !this.host.isConnected) {
        this.scheduleAnchorCheck();
        return;
      }

      const anchorPresentationChanged = mutations.some((mutation) => (
        mutation.type === 'attributes'
        && (
          mutation.target === this.anchor
          || mutation.target.contains?.(this.anchor)
          || this.anchor.contains?.(mutation.target)
        )
      ));
      if (anchorPresentationChanged) {
        this.scheduleAnchorCheck();
        return;
      }

      if (mutations.some((mutation) => mutation.type === 'childList')) {
        if (this.mobileInlineSpacer && !this.mobileInlineSpacer.element.isConnected) {
          this.host.style.setProperty('visibility', 'hidden');
        }
        this.schedulePosition();
      }
    });
    this.observer.observe(this.document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['aria-hidden', 'class', 'hidden', 'inert', 'style'],
    });

    this.document.addEventListener('pointerdown', this.handleDocumentPointerDown, true);
    this.document.addEventListener('keydown', this.handleDocumentEscape, true);
    this.window.addEventListener('resize', this.handleViewportChange, { passive: true });
    this.window.addEventListener('scroll', this.handleViewportChange, { capture: true, passive: true });
    this.window.addEventListener('popstate', this.handleViewportChange);
    this.window.addEventListener('hashchange', this.handleViewportChange);
    this.window.visualViewport?.addEventListener('resize', this.handleViewportChange, { passive: true });
    this.window.visualViewport?.addEventListener('scroll', this.handleViewportChange, { passive: true });

    this.urlTimer = this.window.setInterval(() => {
      if (this.lastUrl !== this.window.location.href) {
        this.lastUrl = this.window.location.href;
        this.mobileInlineRejection = null;
        this.closeMenu(false);
        this.ensureAnchor();
      }
    }, 750);
  }

  stop() {
    this.observer?.disconnect();
    this.resizeObserver?.disconnect();
    this.document.removeEventListener('pointerdown', this.handleDocumentPointerDown, true);
    this.document.removeEventListener('keydown', this.handleDocumentEscape, true);
    this.window.removeEventListener('resize', this.handleViewportChange);
    this.window.removeEventListener('scroll', this.handleViewportChange, true);
    this.window.removeEventListener('popstate', this.handleViewportChange);
    this.window.removeEventListener('hashchange', this.handleViewportChange);
    this.window.visualViewport?.removeEventListener('resize', this.handleViewportChange);
    this.window.visualViewport?.removeEventListener('scroll', this.handleViewportChange);
    this.window.clearTimeout(this.checkTimer);
    this.window.clearInterval(this.urlTimer);
    this.window.cancelAnimationFrame(this.positionFrame);
    this.clearMobileInlineSpacer();
    this.clearMobileSpacing();
    this.host?.remove();
  }

  updateSettings(settings) {
    this.settings = settings;
    this.mobileInlineRejection = null;
    this.host.style.setProperty('visibility', 'hidden');
    this.render();
    this.schedulePosition();
  }

  scheduleAnchorCheck() {
    if (this.checkTimer) {
      return;
    }

    this.checkTimer = this.window.setTimeout(() => {
      this.checkTimer = null;
      this.ensureAnchor();
    }, 180);
  }

  ensureAnchor() {
    const nextAnchor = this.adapter.findMountPoint(this.document);
    if (nextAnchor !== this.anchor) {
      this.resizeObserver?.disconnect();
      this.anchor = nextAnchor;
      this.mobileInlineRejection = null;
      if (this.anchor && typeof ResizeObserver !== 'undefined') {
        this.resizeObserver = new ResizeObserver(() => this.schedulePosition());
        this.resizeObserver.observe(this.anchor);
      }
    }

    if (!this.host.isConnected) {
      this.document.documentElement.append(this.host);
    }

    this.schedulePosition();
  }

  handleViewportChange() {
    this.schedulePosition();
  }

  schedulePosition() {
    this.window.cancelAnimationFrame(this.positionFrame);
    this.positionFrame = this.window.requestAnimationFrame(() => this.positionNextToAnchor());
  }

  clearMobileSpacing() {
    if (!this.mobileSpacing) {
      return;
    }

    const { element, priority, value } = this.mobileSpacing;
    if (value) {
      element.style.setProperty('margin-bottom', value, priority);
    } else {
      element.style.removeProperty('margin-bottom');
    }
    this.mobileSpacing = null;
  }

  clearMobileInlineSpacer() {
    this.mobileInlineSpacer?.element.remove();
    this.mobileInlineSpacer = null;
  }

  ensureMobileInlinePosition(viewport, controlWidth, controlHeight) {
    if (viewport.width > MOBILE_MAX_WIDTH || !this.anchor?.isConnected) {
      this.mobileInlineRejection = null;
      this.clearMobileInlineSpacer();
      return null;
    }

    const slot = this.adapter.findMobileInlineSlot(this.document, this.anchor);
    if (!slot?.container?.isConnected || !slot.before?.isConnected) {
      this.mobileInlineRejection = null;
      this.clearMobileInlineSpacer();
      return null;
    }

    const verticalAnchor = slot.verticalAnchor ?? slot.container;
    const containerRectBefore = slot.container.getBoundingClientRect();
    const inputRectBefore = slot.input?.getBoundingClientRect();
    const verticalRectBefore = verticalAnchor.getBoundingClientRect();
    const containerStyle = this.window.getComputedStyle(slot.container);
    const attempt = {
      anchor: this.anchor,
      before: slot.before,
      container: slot.container,
      containerHeight: containerRectBefore.height,
      containerWidth: containerRectBefore.width,
      controlHeight,
      controlWidth,
      inputHeight: inputRectBefore?.height ?? 0,
      inputWidth: inputRectBefore?.width ?? 0,
      layoutSignature: [
        slot.container.className,
        slot.container.getAttribute?.('style'),
        containerStyle.display,
        containerStyle.flexDirection,
        containerStyle.gap,
        verticalAnchor.className,
        verticalAnchor.getAttribute?.('style'),
      ].join('|'),
      verticalAnchor,
      verticalHeight: verticalRectBefore.height,
      verticalWidth: verticalRectBefore.width,
      viewportHeight: viewport.height,
      viewportWidth: viewport.width,
    };
    if (!shouldRetryInlineSlot(this.mobileInlineRejection, attempt)) {
      return null;
    }

    const reservedWidth = Math.ceil(controlWidth + 8);
    let spacer = this.mobileInlineSpacer?.element;
    if (
      !spacer
      || !spacer.isConnected
      || this.mobileInlineSpacer.container !== slot.container
      || this.mobileInlineSpacer.before !== slot.before
    ) {
      this.clearMobileInlineSpacer();
      spacer = this.document.createElement('span');
      spacer.setAttribute('aria-hidden', 'true');
      spacer.setAttribute('data-free-search-switcher-spacer', '');
      spacer.setAttribute('inert', '');
      spacer.style.setProperty('align-self', 'center', 'important');
      spacer.style.setProperty('display', 'block', 'important');
      spacer.style.setProperty('height', '1px', 'important');
      spacer.style.setProperty('pointer-events', 'none', 'important');
      spacer.style.setProperty('visibility', 'hidden', 'important');
      slot.container.insertBefore(spacer, slot.before);
      this.mobileInlineSpacer = {
        before: slot.before,
        container: slot.container,
        element: spacer,
      };
    }

    for (const property of ['flex-basis', 'max-width', 'min-width', 'width']) {
      spacer.style.setProperty(property, `${reservedWidth}px`, 'important');
    }
    spacer.style.setProperty('flex-grow', '0', 'important');
    spacer.style.setProperty('flex-shrink', '0', 'important');

    const spacerRect = spacer.getBoundingClientRect();
    const verticalRect = verticalAnchor.getBoundingClientRect();
    const inputRect = slot.input?.getBoundingClientRect();
    if (
      spacerRect.width < reservedWidth - 2
      || verticalRect.height < 32
      || !inputRect
      || inputRect.width < 96
    ) {
      this.mobileInlineRejection = attempt;
      this.clearMobileInlineSpacer();
      return null;
    }

    this.mobileInlineRejection = null;

    const viewportRight = viewport.left + viewport.width;
    const viewportBottom = viewport.top + viewport.height;
    return {
      left: Math.max(
        viewport.left + 4,
        Math.min(spacerRect.left + 4, viewportRight - controlWidth - 4),
      ),
      placement: 'inline-slot',
      top: Math.max(
        viewport.top + 4,
        Math.min(
          verticalRect.top + ((verticalRect.height - controlHeight) / 2),
          viewportBottom - controlHeight - 4,
        ),
      ),
    };
  }

  ensureMobileSpacing(viewport) {
    if (viewport.width > MOBILE_MAX_WIDTH || !this.anchor?.isConnected) {
      this.clearMobileSpacing();
      return null;
    }

    const layoutTarget = this.adapter.findMobileLayoutPoint(this.document, this.anchor);
    if (!layoutTarget) {
      this.clearMobileSpacing();
      return null;
    }
    if (this.mobileSpacing?.element === layoutTarget) {
      return layoutTarget;
    }

    this.clearMobileSpacing();
    const computedMargin = Number.parseFloat(
      this.window.getComputedStyle(layoutTarget).marginBottom,
    ) || 0;
    this.mobileSpacing = {
      element: layoutTarget,
      priority: layoutTarget.style.getPropertyPriority('margin-bottom'),
      value: layoutTarget.style.getPropertyValue('margin-bottom'),
    };
    layoutTarget.style.setProperty(
      'margin-bottom',
      `${computedMargin + MOBILE_RESERVED_SPACE}px`,
      'important',
    );
    return layoutTarget;
  }

  positionNextToAnchor() {
    if (this.adapter.isBlockedPage(this.document)) {
      this.resizeObserver?.disconnect();
      this.anchor = null;
      this.clearMobileInlineSpacer();
      this.clearMobileSpacing();
      this.host.style.setProperty('display', 'none');
      return;
    }

    if (!this.anchor?.isConnected) {
      this.clearMobileInlineSpacer();
      this.clearMobileSpacing();
      this.host.style.setProperty('display', 'none');
      this.scheduleAnchorCheck();
      return;
    }

    const anchorRect = this.anchor.getBoundingClientRect();
    if (anchorRect.width < 40 || anchorRect.height < 20) {
      this.clearMobileInlineSpacer();
      this.clearMobileSpacing();
      this.host.style.setProperty('display', 'none');
      this.scheduleAnchorCheck();
      return;
    }

    const viewport = getViewportBounds(this.window);
    const viewportRight = viewport.left + viewport.width;
    const viewportBottom = viewport.top + viewport.height;
    if (
      anchorRect.bottom < viewport.top
      || anchorRect.top > viewportBottom
      || anchorRect.right < viewport.left
      || anchorRect.left > viewportRight
    ) {
      this.host.style.setProperty('display', 'none');
      return;
    }

    this.host.style.setProperty('display', 'block');
    const hostRect = this.host.getBoundingClientRect();
    const hostWidth = Math.max(hostRect.width, 34);
    const hostHeight = Math.max(hostRect.height, 36);
    const inlineMobilePosition = this.ensureMobileInlinePosition(
      viewport,
      hostWidth,
      hostHeight,
    );
    const customMobilePosition = inlineMobilePosition
      ?? (viewport.width <= MOBILE_MAX_WIDTH
        ? this.adapter.findMobileControlPosition(this.document, {
          anchor: this.anchor,
          controlHeight: hostHeight,
          controlWidth: hostWidth,
          viewport,
        })
        : null);
    if (!inlineMobilePosition) {
      this.clearMobileInlineSpacer();
    }
    let mobileLayoutTarget = null;
    if (customMobilePosition) {
      this.clearMobileSpacing();
    } else {
      mobileLayoutTarget = this.ensureMobileSpacing(viewport);
    }
    let position = customMobilePosition;
    if (!position && mobileLayoutTarget) {
      const layoutRect = mobileLayoutTarget.getBoundingClientRect();
      position = {
        left: Math.max(
          viewport.left + 8,
          Math.min(
            layoutRect.right - hostWidth,
            viewportRight - hostWidth - 8,
          ),
        ),
        placement: 'reserved-below',
        top: Math.max(
          viewport.top + 8,
          Math.min(
            layoutRect.bottom + 8,
            viewportBottom - hostHeight - 8,
          ),
        ),
      };
    } else if (!position) {
      position = calculateControlPosition({
        anchorRect,
        controlHeight: hostHeight,
        controlWidth: hostWidth,
        viewport,
      });
    }
    const { left, placement, top } = position;
    const menuLayout = calculateMenuLayout({
      controlHeight: hostHeight,
      controlLeft: left,
      controlTop: top,
      controlWidth: hostWidth,
      viewport,
    });
    this.host.setAttribute('data-placement', placement);
    this.host.setAttribute('data-menu-direction', menuLayout.direction);
    this.host.style.setProperty(
      '--fss-menu-inline-start',
      `${Math.round(menuLayout.left - left)}px`,
    );
    this.host.style.setProperty('--fss-menu-max-height', `${menuLayout.maxHeight}px`);
    this.host.style.setProperty('--fss-menu-width', `${menuLayout.width}px`);
    this.host.style.setProperty('left', `${Math.round(left)}px`);
    this.host.style.setProperty('top', `${Math.round(top)}px`);
    this.host.style.setProperty('visibility', 'visible');
  }

  render() {
    this.menuOpen = false;
    const style = this.document.createElement('style');
    style.textContent = SHADOW_STYLES;
    const switcher = this.document.createElement('div');
    switcher.className = 'switcher';
    const buttonGroup = this.document.createElement('div');
    buttonGroup.className = 'button-group';
    buttonGroup.setAttribute('role', 'group');
    buttonGroup.setAttribute('aria-label', 'Search engine switching controls');

    const quickTargetId = selectQuickTarget(this.adapter.id, this.settings);
    const quickTarget = getEngineById(quickTargetId, this.settings.customEngines);
    if (quickTarget) {
      const quickButton = this.document.createElement('button');
      quickButton.type = 'button';
      quickButton.className = 'control-button quick-button';
      quickButton.setAttribute('aria-label', `Switch to ${quickTarget.name}`);
      quickButton.title = `Switch to ${quickTarget.name}`;
      quickButton.append(createEngineIcon(this.document, quickTarget));
      quickButton.addEventListener('click', () => this.navigateTo(quickTarget));
      buttonGroup.append(quickButton);
    }

    const menuEntries = buildEngineMenu(this.adapter.id, this.settings);
    this.menuButton = this.document.createElement('button');
    this.menuButton.type = 'button';
    this.menuButton.className = 'control-button menu-button';
    this.menuButton.setAttribute('aria-label', 'Choose another search engine');
    this.menuButton.setAttribute('aria-haspopup', 'menu');
    this.menuButton.setAttribute('aria-expanded', 'false');
    this.menuButton.title = 'Choose another search engine';
    this.menuButton.textContent = '▾';
    this.menuButton.disabled = menuEntries.length === 0;
    this.menuButton.addEventListener('click', () => this.toggleMenu());
    buttonGroup.append(this.menuButton);

    this.menu = this.document.createElement('div');
    this.menu.className = 'menu';
    this.menu.setAttribute('role', 'menu');
    this.menu.setAttribute('aria-label', 'Search engines');
    this.menu.hidden = true;

    menuEntries.forEach(({ engine, preferenceRank }) => {
      const menuItem = this.document.createElement('button');
      menuItem.type = 'button';
      menuItem.className = 'menu-item';
      menuItem.setAttribute('role', 'menuitem');
      menuItem.tabIndex = -1;
      menuItem.append(createEngineIcon(this.document, engine));
      appendTextElement(this.document, menuItem, 'engine-name', engine.name);
      if (preferenceRank) {
        appendTextElement(
          this.document,
          menuItem,
          'preference-badge',
          preferenceRank === 1 ? 'First' : 'Second',
        );
      }
      menuItem.addEventListener('click', () => this.navigateTo(engine));
      this.menu.append(menuItem);
    });

    switcher.append(buttonGroup, this.menu);
    this.shadowRoot.replaceChildren(style, switcher);
  }

  navigateTo(engine) {
    this.window.location.assign(buildCurrentNavigationUrl(
      engine,
      this.adapter,
      this.window.location.href,
      this.document,
    ));
  }

  toggleMenu() {
    if (this.menuOpen) {
      this.closeMenu(true);
    } else {
      this.openMenu();
    }
  }

  openMenu() {
    if (!this.menu || !this.menuButton || this.menuButton.disabled) {
      return;
    }

    this.menuOpen = true;
    this.menu.hidden = false;
    this.menuButton.setAttribute('aria-expanded', 'true');
    this.menu.querySelector('[role="menuitem"]')?.focus();
    this.schedulePosition();
  }

  closeMenu(restoreFocus) {
    if (!this.menu || !this.menuButton) {
      return;
    }

    this.menuOpen = false;
    this.menu.hidden = true;
    this.menuButton.setAttribute('aria-expanded', 'false');
    if (restoreFocus) {
      this.menuButton.focus();
    }
  }

  handleDocumentPointerDown(event) {
    if (this.menuOpen && !event.composedPath().includes(this.host)) {
      this.closeMenu(false);
    }
  }

  handleDocumentEscape(event) {
    if (event.key === 'Escape' && this.menuOpen) {
      event.preventDefault();
      this.closeMenu(true);
    }
  }

  handleShadowKeyDown(event) {
    if (event.key === 'Escape' && this.menuOpen) {
      event.preventDefault();
      this.closeMenu(true);
      return;
    }

    if (!this.menuOpen) {
      return;
    }

    const items = [...this.menu.querySelectorAll('[role="menuitem"]')];
    const currentIndex = items.indexOf(this.shadowRoot.activeElement);
    let nextIndex = null;

    if (event.key === 'ArrowDown') {
      nextIndex = (currentIndex + 1) % items.length;
    } else if (event.key === 'ArrowUp') {
      nextIndex = (currentIndex - 1 + items.length) % items.length;
    } else if (event.key === 'Home') {
      nextIndex = 0;
    } else if (event.key === 'End') {
      nextIndex = items.length - 1;
    }

    if (nextIndex !== null && items.length) {
      event.preventDefault();
      items[nextIndex].focus();
    }
  }
}
