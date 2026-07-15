"use strict";

(function exposeRender(global) {
  function renderOverlay(snapshot, geometry) {
    const highlight = document.querySelector("[data-role='highlight']");
    const callout = document.querySelector("[data-role='callout']");
    const progress = document.querySelector("[data-role='progress']");
    const title = document.querySelector("[data-role='title']");
    const body = document.querySelector("[data-role='body']");

    const step = snapshot.currentStep;
    const cssRect = geometry.toCssRect(step.highlight);
    Object.assign(highlight.style, cssRect);
    highlight.dataset.accent = step.accent;

    const calloutPosition = geometry.getCalloutPosition(
      step.highlight,
      step.callout.placement,
      { width: window.innerWidth, height: window.innerHeight }
    );
    callout.style.left = `${calloutPosition.left}px`;
    callout.style.top = `${calloutPosition.top}px`;
    callout.dataset.placement = calloutPosition.placement;

    progress.textContent = `${snapshot.currentStepIndex + 1} / ${snapshot.totalSteps}`;
    title.textContent = step.title;
    body.textContent = step.body;
  }

  global.StudyFlowRender = {
    renderOverlay
  };
})(window);
