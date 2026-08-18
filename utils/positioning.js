export function calculateControlPosition({
  anchorRect,
  controlHeight,
  controlWidth,
  margin = 8,
  viewport,
}) {
  const viewportRight = viewport.left + viewport.width;
  const viewportBottom = viewport.top + viewport.height;
  const rightSpace = viewportRight - anchorRect.right;
  const leftSpace = anchorRect.left - viewport.left;
  const belowSpace = viewportBottom - anchorRect.bottom;
  const aboveSpace = anchorRect.top - viewport.top;
  let left;
  let top = anchorRect.top + ((anchorRect.height - controlHeight) / 2);
  let placement;

  if (rightSpace >= controlWidth + (margin * 2)) {
    left = anchorRect.right + margin;
    placement = 'right';
  } else if (leftSpace >= controlWidth + (margin * 2)) {
    left = anchorRect.left - controlWidth - margin;
    placement = 'left';
  } else if (belowSpace >= controlHeight + margin || belowSpace >= aboveSpace) {
    left = anchorRect.right - controlWidth;
    top = anchorRect.bottom + margin;
    placement = 'below';
  } else {
    left = anchorRect.right - controlWidth;
    top = anchorRect.top - controlHeight - margin;
    placement = 'above';
  }

  left = Math.max(
    viewport.left + margin,
    Math.min(left, viewportRight - controlWidth - margin),
  );
  top = Math.max(
    viewport.top + margin,
    Math.min(top, viewportBottom - controlHeight - margin),
  );

  return { left, placement, top };
}

export function calculateMenuLayout({
  controlHeight,
  controlLeft,
  controlTop,
  controlWidth,
  gap = 8,
  preferredWidth = 248,
  viewport,
}) {
  const viewportRight = viewport.left + viewport.width;
  const viewportBottom = viewport.top + viewport.height;
  const width = Math.max(0, Math.min(preferredWidth, viewport.width - (gap * 2)));
  const spaceAbove = Math.max(0, controlTop - viewport.top - gap);
  const spaceBelow = Math.max(
    0,
    viewportBottom - (controlTop + controlHeight) - gap,
  );
  const direction = spaceBelow >= spaceAbove ? 'down' : 'up';
  const maxHeight = Math.floor(direction === 'down' ? spaceBelow : spaceAbove);
  const desiredLeft = controlLeft + controlWidth - width;
  const left = Math.max(
    viewport.left + gap,
    Math.min(desiredLeft, viewportRight - width - gap),
  );

  return { direction, left, maxHeight, width };
}

export function shouldRetryInlineSlot(previousAttempt, nextAttempt) {
  if (!previousAttempt) {
    return true;
  }

  return [
    'anchor',
    'before',
    'container',
    'containerWidth',
    'containerHeight',
    'controlHeight',
    'controlWidth',
    'inputHeight',
    'inputWidth',
    'layoutSignature',
    'verticalAnchor',
    'verticalHeight',
    'verticalWidth',
    'viewportHeight',
    'viewportWidth',
  ].some((key) => previousAttempt[key] !== nextAttempt[key]);
}
