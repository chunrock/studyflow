"use strict";

const CALLOUT_WIDTH = 220;
const CALLOUT_GAP = 8;

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function clampRect(rect, bounds) {
  const x = clamp(rect.x, 0, bounds.width);
  const y = clamp(rect.y, 0, bounds.height);
  const maxWidth = Math.max(1, bounds.width - x);
  const maxHeight = Math.max(1, bounds.height - y);

  return {
    x,
    y,
    width: clamp(rect.width, 1, maxWidth),
    height: clamp(rect.height, 1, maxHeight)
  };
}

function getCalloutPosition(rect, placement, bounds) {
  const candidates = placement === "left"
    ? ["left", "right", "bottom", "top"]
    : placement === "top"
      ? ["top", "bottom", "right", "left"]
      : placement === "bottom"
        ? ["bottom", "top", "right", "left"]
        : ["right", "left", "bottom", "top"];

  for (const candidate of candidates) {
    const position = place(rect, candidate);
    if (position.left >= 0 && position.left + CALLOUT_WIDTH <= bounds.width && position.top >= 0 && position.top <= bounds.height - 80) {
      return position;
    }
  }

  return {
    left: clamp(rect.x, 0, Math.max(0, bounds.width - CALLOUT_WIDTH)),
    top: clamp(rect.y + rect.height + CALLOUT_GAP, 0, Math.max(0, bounds.height - 80)),
    placement: "bottom"
  };
}

function place(rect, placement) {
  if (placement === "left") {
    return { left: rect.x - CALLOUT_WIDTH - CALLOUT_GAP, top: rect.y, placement };
  }
  if (placement === "top") {
    return { left: rect.x, top: rect.y - 88, placement };
  }
  if (placement === "bottom") {
    return { left: rect.x, top: rect.y + rect.height + CALLOUT_GAP, placement };
  }
  return { left: rect.x + rect.width + CALLOUT_GAP, top: rect.y, placement: "right" };
}

function toCssRect(rect) {
  return {
    left: `${rect.x}px`,
    top: `${rect.y}px`,
    width: `${rect.width}px`,
    height: `${rect.height}px`
  };
}

const api = {
  clampRect,
  getCalloutPosition,
  toCssRect
};

if (typeof module !== "undefined" && module.exports) {
  module.exports = api;
}

if (typeof window !== "undefined") {
  window.StudyFlowGeometry = api;
}
