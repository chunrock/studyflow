"use strict";

(async function init() {
  const response = await fetch("./data/sample-course.json");
  const rawScenario = await response.json();
  const scenario = window.StudyFlowSchema.normalizeScenario(rawScenario);
  const state = window.StudyFlowState.createOverlayState(scenario);

  function render() {
    window.StudyFlowRender.renderOverlay(state.snapshot(), window.StudyFlowGeometry);
    if (window.studyflow) {
      window.studyflow.setClickThrough(state.snapshot().clickThrough);
    }
  }

  const editor = window.StudyFlowEditor.createEditor({ state, render });

  function handleAction(action) {
    if (action === "next") {
      state.next();
      editor.loadCurrentStep();
    }
    if (action === "previous") {
      state.previous();
      editor.loadCurrentStep();
    }
    if (action === "click-through" || action === "click-through-on" || action === "click-through-off") {
      state.setClickThrough(!state.snapshot().clickThrough);
    }
    if (action === "hide") {
      document.body.hidden = true;
    }
    render();
  }

  document.querySelectorAll("[data-action]").forEach((button) => {
    button.addEventListener("click", () => handleAction(button.dataset.action));
  });

  if (window.studyflow) {
    window.studyflow.onShortcut(handleAction);
  }

  render();
})();
