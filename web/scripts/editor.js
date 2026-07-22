"use strict";

(function exposeEditor(global) {
  function rectFromDrag(start, end, bounds) {
    const left = Math.min(start.x, end.x);
    const top = Math.min(start.y, end.y);
    const right = Math.max(start.x, end.x);
    const bottom = Math.max(start.y, end.y);
    const rect = {
      x: Math.round(left),
      y: Math.round(top),
      width: Math.round(right - left),
      height: Math.round(bottom - top)
    };

    if (global.StudyFlowGeometry && bounds) {
      return global.StudyFlowGeometry.clampRect(rect, bounds);
    }
    return rect;
  }

  function replaceActionButton(panel, action) {
    const button = panel.querySelector(`[data-editor-action='${action}']`);
    const freshButton = button.cloneNode(true);
    button.replaceWith(freshButton);
    return freshButton;
  }

  function createEditor({ state, render, onApply }) {
    const panel = document.querySelector("[data-role='editor']");
    const overlayShell = document.querySelector(".overlay-shell");
    const selectionLayer = document.querySelector("[data-role='selection-layer']");
    const applyButton = replaceActionButton(panel, "apply");
    const toggleButton = replaceActionButton(panel, "toggle");
    let dragStart = null;
    let activePointerId = null;
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

    function updateHighlightFields(rect) {
      fields.x.value = rect.x;
      fields.y.value = rect.y;
      fields.width.value = rect.width;
      fields.height.value = rect.height;
    }

    function updateCurrentHighlight(rect, notify) {
      const step = state.getCurrentStep();
      step.highlight = rect;
      updateHighlightFields(rect);
      render();
      if (notify && onApply) {
        onApply(step);
      }
    }

    function setVisible(visible) {
      panel.hidden = !visible;
      toggleButton.textContent = visible ? "닫기" : "열기";
      if (selectionLayer) {
        selectionLayer.hidden = !visible;
      }
    }

    function togglePanel() {
      setVisible(panel.hidden);
    }

    applyButton.addEventListener("click", applyToCurrentStep);
    toggleButton.addEventListener("click", togglePanel);
    if (selectionLayer) {
      selectionLayer.addEventListener("pointerdown", (event) => {
        if (panel.hidden || event.button !== 0) return;
        const bounds = selectionLayer.getBoundingClientRect();
        dragStart = {
          x: event.clientX - bounds.left,
          y: event.clientY - bounds.top
        };
        activePointerId = event.pointerId;
        selectionLayer.setPointerCapture(activePointerId);
        overlayShell.dataset.draggingHighlight = "true";
        event.preventDefault();
      });

      selectionLayer.addEventListener("pointermove", (event) => {
        if (!dragStart || event.pointerId !== activePointerId) return;
        const bounds = selectionLayer.getBoundingClientRect();
        const rect = rectFromDrag(
          dragStart,
          { x: event.clientX - bounds.left, y: event.clientY - bounds.top },
          { width: bounds.width, height: bounds.height }
        );
        updateCurrentHighlight(rect, false);
      });

      selectionLayer.addEventListener("pointerup", (event) => {
        if (!dragStart || event.pointerId !== activePointerId) return;
        const bounds = selectionLayer.getBoundingClientRect();
        const rect = rectFromDrag(
          dragStart,
          { x: event.clientX - bounds.left, y: event.clientY - bounds.top },
          { width: bounds.width, height: bounds.height }
        );
        dragStart = null;
        activePointerId = null;
        delete overlayShell.dataset.draggingHighlight;
        updateCurrentHighlight(rect, true);
      });

      selectionLayer.addEventListener("pointercancel", () => {
        dragStart = null;
        activePointerId = null;
        delete overlayShell.dataset.draggingHighlight;
      });
    }

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
    createEditor,
    rectFromDrag
  };
})(window);
