import { describe, expect, it } from 'vitest';
import {
  calculateControlPosition,
  calculateMenuLayout,
  shouldRetryInlineSlot,
} from '../utils/positioning.js';

const desktopViewport = { left: 0, top: 0, width: 1440, height: 900 };
const mobileViewport = { left: 0, top: 0, width: 393, height: 852 };

describe('search-switcher positioning', () => {
  it('uses the right side of a desktop search bar when space is available', () => {
    expect(calculateControlPosition({
      anchorRect: { left: 320, right: 920, top: 100, bottom: 156, height: 56 },
      controlWidth: 76,
      controlHeight: 36,
      viewport: desktopViewport,
    })).toEqual({ left: 928, placement: 'right', top: 110 });
  });

  it('places touch controls below a full-width mobile search bar', () => {
    const result = calculateControlPosition({
      anchorRect: { left: 16, right: 377, top: 72, bottom: 128, height: 56 },
      controlWidth: 84,
      controlHeight: 44,
      viewport: mobileViewport,
    });

    expect(result).toEqual({ left: 293, placement: 'below', top: 136 });
  });

  it('places controls above the bar when the lower visual viewport has no room', () => {
    const result = calculateControlPosition({
      anchorRect: { left: 16, right: 377, top: 788, bottom: 844, height: 56 },
      controlWidth: 84,
      controlHeight: 44,
      viewport: mobileViewport,
    });

    expect(result).toEqual({ left: 293, placement: 'above', top: 736 });
  });

  it('keeps controls inside an offset visual viewport', () => {
    const result = calculateControlPosition({
      anchorRect: { left: 42, right: 250, top: 120, bottom: 170, height: 50 },
      controlWidth: 280,
      controlHeight: 44,
      viewport: { left: 30, top: 80, width: 300, height: 400 },
    });

    expect(result.left).toBe(38);
    expect(result.top).toBeGreaterThanOrEqual(88);
    expect(result.left + 280).toBeLessThanOrEqual(322);
  });
});

describe('engine-menu positioning', () => {
  it('opens upward and remains horizontally inside a phone viewport near the bottom', () => {
    expect(calculateMenuLayout({
      controlHeight: 48,
      controlLeft: 293,
      controlTop: 736,
      controlWidth: 92,
      viewport: mobileViewport,
    })).toEqual({
      direction: 'up',
      left: 137,
      maxHeight: 728,
      width: 248,
    });
  });

  it('clamps a wide menu to both edges of a narrow visual viewport', () => {
    const result = calculateMenuLayout({
      controlHeight: 48,
      controlLeft: 140,
      controlTop: 120,
      controlWidth: 48,
      viewport: { left: 20, top: 80, width: 280, height: 360 },
    });

    expect(result.left).toBe(28);
    expect(result.width).toBe(248);
    expect(result.left + result.width).toBe(276);
    expect(result.direction).toBe('down');
    expect(result.maxHeight).toBe(264);
  });

  it('shrinks the menu width for very narrow viewports', () => {
    const result = calculateMenuLayout({
      controlHeight: 48,
      controlLeft: 8,
      controlTop: 60,
      controlWidth: 48,
      viewport: { left: 0, top: 0, width: 220, height: 400 },
    });

    expect(result.left).toBe(8);
    expect(result.width).toBe(204);
    expect(result.left + result.width).toBe(212);
  });
});

describe('inline-slot retry control', () => {
  it('does not retry rejected geometry until a relevant dimension changes', () => {
    const attempt = {
      anchor: {},
      before: {},
      container: {},
      containerHeight: 44,
      containerWidth: 300,
      controlHeight: 50,
      controlWidth: 98,
      inputHeight: 40,
      inputWidth: 90,
      layoutSignature: 'search-row||flex|row|0px|search-form|',
      verticalAnchor: {},
      verticalHeight: 28,
      verticalWidth: 300,
      viewportHeight: 640,
      viewportWidth: 320,
    };

    expect(shouldRetryInlineSlot(null, attempt)).toBe(true);
    expect(shouldRetryInlineSlot(attempt, { ...attempt })).toBe(false);
    expect(shouldRetryInlineSlot(attempt, { ...attempt, inputWidth: 120 })).toBe(true);
    expect(shouldRetryInlineSlot(attempt, { ...attempt, viewportWidth: 360 })).toBe(true);
    expect(shouldRetryInlineSlot(attempt, { ...attempt, verticalHeight: 44 })).toBe(true);
    expect(shouldRetryInlineSlot(
      attempt,
      { ...attempt, layoutSignature: 'search-row expanded||flex|row|0px|search-form|' },
    )).toBe(true);
  });
});
