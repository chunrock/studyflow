"use strict";

const VALID_ACCENTS = new Set(["guide", "warning", "success", "focus"]);
const VALID_PLACEMENTS = new Set(["top", "right", "bottom", "left"]);

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function isFiniteNumber(value) {
  return typeof value === "number" && Number.isFinite(value);
}

function validateRect(rect, prefix) {
  const errors = [];
  if (!rect || typeof rect !== "object") {
    return [`${prefix} highlight must be an object`];
  }
  for (const key of ["x", "y", "width", "height"]) {
    if (!isFiniteNumber(rect[key])) {
      errors.push(`${prefix} highlight.${key} must be a number`);
    }
  }
  if (isFiniteNumber(rect.width) && rect.width <= 0) {
    errors.push(`${prefix} highlight.width must be greater than 0`);
  }
  if (isFiniteNumber(rect.height) && rect.height <= 0) {
    errors.push(`${prefix} highlight.height must be greater than 0`);
  }
  return errors;
}

function validateScenario(input) {
  const errors = [];

  if (!input || typeof input !== "object") {
    return { ok: false, errors: ["scenario must be an object"] };
  }
  if (!isNonEmptyString(input.title)) {
    errors.push("title must be a non-empty string");
  }
  if (!isNonEmptyString(input.targetApp)) {
    errors.push("targetApp must be a non-empty string");
  }
  if (!Array.isArray(input.steps) || input.steps.length === 0) {
    errors.push("steps must contain at least one step");
  }

  if (Array.isArray(input.steps)) {
    input.steps.forEach((step, index) => {
      const prefix = `steps[${index}]`;
      if (!step || typeof step !== "object") {
        errors.push(`${prefix} must be an object`);
        return;
      }
      if (!isNonEmptyString(step.title)) {
        errors.push(`${prefix}.title must be a non-empty string`);
      }
      if (!isNonEmptyString(step.body)) {
        errors.push(`${prefix}.body must be a non-empty string`);
      }
      if (!isNonEmptyString(step.screenshotPath)) {
        errors.push(`${prefix}.screenshotPath must be a non-empty string`);
      }
      if (!step.screenshotSize || !isFiniteNumber(step.screenshotSize.width) || !isFiniteNumber(step.screenshotSize.height)) {
        errors.push(`${prefix}.screenshotSize must contain width and height numbers`);
      }
      errors.push(...validateRect(step.highlightPx || step.highlight, prefix));
      if (!step.highlightRatio || typeof step.highlightRatio !== "object") {
        errors.push(`${prefix}.highlightRatio must be an object`);
      }
      if (step.accent !== undefined && !VALID_ACCENTS.has(step.accent)) {
        errors.push(`${prefix}.accent must be one of guide, warning, success, focus`);
      }
      if (step.callout && step.callout.placement !== undefined && !VALID_PLACEMENTS.has(step.callout.placement)) {
        errors.push(`${prefix}.callout.placement must be one of top, right, bottom, left`);
      }
    });
  }

  return { ok: errors.length === 0, errors };
}

function normalizeScenario(input) {
  const result = validateScenario(input);
  if (!result.ok) {
    throw new Error(result.errors.join("; "));
  }

  return {
    id: input.id || "scenario",
    title: input.title.trim(),
    targetApp: input.targetApp.trim(),
    currentStepIndex: 0,
    steps: input.steps.map((step, index) => ({
      id: step.id || `step-${index + 1}`,
      title: step.title.trim(),
      body: step.body.trim(),
      screenshotPath: step.screenshotPath.trim(),
      accent: step.accent || "guide",
      clickThrough: step.clickThrough !== false,
      screenshotSize: {
        width: step.screenshotSize.width,
        height: step.screenshotSize.height
      },
      highlightPx: {
        x: (step.highlightPx || step.highlight).x,
        y: (step.highlightPx || step.highlight).y,
        width: (step.highlightPx || step.highlight).width,
        height: (step.highlightPx || step.highlight).height
      },
      highlightRatio: {
        x: step.highlightRatio.x,
        y: step.highlightRatio.y,
        width: step.highlightRatio.width,
        height: step.highlightRatio.height
      },
      highlight: {
        x: (step.highlightPx || step.highlight).x,
        y: (step.highlightPx || step.highlight).y,
        width: (step.highlightPx || step.highlight).width,
        height: (step.highlightPx || step.highlight).height
      },
      callout: {
        placement: step.callout && step.callout.placement ? step.callout.placement : "right"
      }
    }))
  };
}

const schemaApi = {
  normalizeScenario,
  validateScenario
};

if (typeof module !== "undefined" && module.exports) {
  module.exports = schemaApi;
}

if (typeof window !== "undefined") {
  window.StudyFlowSchema = schemaApi;
}
