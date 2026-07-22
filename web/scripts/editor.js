"use strict";

(function exposeEditor(global) {
  function replaceActionButton(panel, action) {
    const button = panel.querySelector(`[data-editor-action='${action}']`);
    const freshButton = button.cloneNode(true);
    button.replaceWith(freshButton);
    return freshButton;
  }

  function createEditor({ state, render, onApply }) {
    const panel = document.querySelector("[data-role='editor']");
    const applyButton = replaceActionButton(panel, "apply");
    const toggleButton = replaceActionButton(panel, "toggle");
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
      if (onApply) {
        onApply(step);
      }
    }

    function setVisible(visible) {
      panel.hidden = !visible;
      toggleButton.textContent = visible ? "닫기" : "열기";
    }

    function togglePanel() {
      setVisible(panel.hidden);
    }

    applyButton.addEventListener("click", applyToCurrentStep);
    toggleButton.addEventListener("click", togglePanel);

    loadCurrentStep();
    setVisible(!panel.hidden);

    return {
      loadCurrentStep,
      applyToCurrentStep,
      togglePanel,
      setVisible
    };
  }

  global.StudyFlowEditor = {
    createEditor
  };
})(window);
