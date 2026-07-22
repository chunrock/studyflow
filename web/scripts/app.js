"use strict";

(async function init() {
  const response = await fetch("./data/sample-course.json");
  const rawScenario = await response.json();
  let scenario = window.StudyFlowSchema.normalizeScenario(rawScenario);
  let state = window.StudyFlowState.createOverlayState(scenario);

  function render() {
    window.StudyFlowRender.renderOverlay(state.snapshot(), window.StudyFlowGeometry);
    if (window.studyflow) {
      window.studyflow.setClickThrough(state.snapshot().clickThrough);
    }
  }

  let editor = window.StudyFlowEditor.createEditor({ state, render });

  async function handleAction(action) {
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
    if (action === "save" && window.studyflow) {
      await window.studyflow.saveScenario(scenario);
    }
    if (action === "open" && window.studyflow) {
      const result = await window.studyflow.openScenario();
      if (!result.canceled) {
        scenario = window.StudyFlowSchema.normalizeScenario(result.scenario);
        state = window.StudyFlowState.createOverlayState(scenario);
        editor = window.StudyFlowEditor.createEditor({ state, render });
      }
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
