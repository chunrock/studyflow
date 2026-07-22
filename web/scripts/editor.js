"use strict";

(function exposeEditor(global) {
  function createEditor({ state, render }) {
    const panel = document.querySelector("[data-role='editor']");
    const fields = {
      title: panel.querySelector("[data-editor-field='title']"),
      body: panel.querySelector("[data-editor-field='body']"),
      x: panel.querySelector("[data-editor-field='x']"),
      y: panel.querySelector("[data-editor-field='y']"),
      width: panel.querySelector("[data-editor-field='width']"),
      height: panel.querySelector("[data-editor-field='height']")
    };

    function loadCurrentStep() {
      const step = state.getCurrentStep();
      fields.title.value = step.title;
      fields.body.value = step.body;
      fields.x.value = step.highlight.x;
      fields.y.value = step.highlight.y;
      fields.width.value = step.highlight.width;
      fields.height.value = step.highlight.height;
    }

    function applyToCurrentStep() {
      const step = state.getCurrentStep();
      step.title = fields.title.value.trim() || step.title;
      step.body = fields.body.value.trim() || step.body;
      step.highlight = {
        x: Number(fields.x.value),
        y: Number(fields.y.value),
        width: Number(fields.width.value),
        height: Number(fields.height.value)
      };
      render();
    }

    panel.querySelector("[data-editor-action='apply']").addEventListener("click", applyToCurrentStep);
    panel.querySelector("[data-editor-action='toggle']").addEventListener("click", () => {
      panel.hidden = true;
    });

    loadCurrentStep();

    return {
      loadCurrentStep,
      applyToCurrentStep
    };
  }

  global.StudyFlowEditor = {
    createEditor
  };
})(window);
