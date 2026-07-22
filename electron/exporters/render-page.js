"use strict";

function buildPageModel(scenario) {
  return scenario.steps.map((step, index) => ({
    pageNumber: index + 1,
    title: step.title,
    body: step.body,
    screenshotPath: step.screenshotPath,
    videoPath: step.videoPath || "",
    accent: step.accent,
    highlight: {
      x: step.highlight.x,
      y: step.highlight.y,
      width: step.highlight.width,
      height: step.highlight.height
    },
    callout: {
      placement: step.callout.placement
    }
  }));
}

function getAccentColor(accent) {
  if (accent === "warning") return "FF5A3D";
  if (accent === "success") return "2FBF71";
  if (accent === "guide") return "4DC3FF";
  return "FFD84D";
}

module.exports = {
  buildPageModel,
  getAccentColor
};
