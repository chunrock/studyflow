"use strict";

(function exposeEditor(global) {
  const MIN_SELECTION_SIZE = 8;

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

  function createAnnotationFromRect(rect, index) {
    const number = index + 1;
    return {
      id: `annotation-${Date.now()}-${number}`,
      number,
      title: `영역 ${number}`,
      body: "설명을 입력하세요.",
      accent: "focus",
      highlight: rect,
      callout: { placement: "right" }
    };
  }

  function replaceActionButton(panel, action) {
    const button = panel.querySelector(`[data-editor-action='${action}']`);
    const freshButton = button.cloneNode(true);
    button.replaceWith(freshButton);
    return freshButton;
  }

  function replaceRoleElement(role) {
    const element = document.querySelector(`[data-role='${role}']`);
    if (!element) return null;
    const freshElement = element.cloneNode(true);
    element.replaceWith(freshElement);
    return freshElement;
  }

  function createEditor({ state, render, onApply }) {
    const panel = document.querySelector("[data-role='editor']");
    const overlayShell = document.querySelector(".overlay-shell");
    const selectionLayer = replaceRoleElement("selection-layer");
    const annotationLayer = replaceRoleElement("annotation-layer");
    const applyButton = replaceActionButton(panel, "apply");
    const toggleButton = replaceActionButton(panel, "toggle");
    let dragStart = null;
    let activePointerId = null;
    let selectedAnnotationIndex = -1;
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
      const annotation = step.annotations && step.annotations[selectedAnnotationIndex >= 0 ? selectedAnnotationIndex : 0];
      const source = annotation || step;
      fields.title.value = source.title;
      fields.body.value = source.body;
      fields.x.value = source.highlight.x;
      fields.y.value = source.highlight.y;
      fields.width.value = source.highlight.width;
      fields.height.value = source.highlight.height;
    }

    function applyToCurrentStep() {
      const step = state.getCurrentStep();
      const nextHighlight = {
        x: Number(fields.x.value),
        y: Number(fields.y.value),
        width: Number(fields.width.value),
        height: Number(fields.height.value)
      };
      const annotation = step.annotations && step.annotations[selectedAnnotationIndex];
      if (annotation) {
        annotation.title = fields.title.value.trim() || annotation.title;
        annotation.body = fields.body.value.trim() || annotation.body;
        annotation.highlight = nextHighlight;
      } else {
        step.title = fields.title.value.trim() || step.title;
        step.body = fields.body.value.trim() || step.body;
        step.highlight = nextHighlight;
      }
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
      const annotation = step.annotations && step.annotations[selectedAnnotationIndex];
      if (annotation) {
        annotation.highlight = rect;
      } else {
        step.highlight = rect;
      }
      updateHighlightFields(rect);
      render();
      if (notify && onApply) {
        onApply(step);
      }
    }

    function addAnnotation(rect) {
      if (rect.width < MIN_SELECTION_SIZE || rect.height < MIN_SELECTION_SIZE) return;
      const step = state.getCurrentStep();
      if (!Array.isArray(step.annotations)) {
        step.annotations = [];
      }
      const annotation = createAnnotationFromRect(rect, step.annotations.length);
      step.annotations.push(annotation);
      selectedAnnotationIndex = step.annotations.length - 1;
      fields.title.value = annotation.title;
      fields.body.value = annotation.body;
      updateHighlightFields(annotation.highlight);
      render();
      if (onApply) {
        onApply(step);
      }
    }

    function setVisible(visible) {
      panel.hidden = !visible;
      toggleButton.textContent = visible ? "닫기" : "열기";
      overlayShell.dataset.editorVisible = visible ? "true" : "false";
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
        selectedAnnotationIndex = -1;
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
        addAnnotation(rect);
      });

      selectionLayer.addEventListener("pointercancel", () => {
        dragStart = null;
        activePointerId = null;
        delete overlayShell.dataset.draggingHighlight;
      });
    }
    if (annotationLayer) {
      annotationLayer.addEventListener("input", (event) => {
        const index = Number(event.target.dataset.annotationIndex);
        const field = event.target.dataset.annotationField;
        const step = state.getCurrentStep();
        const annotation = step.annotations && step.annotations[index];
        if (!annotation || !field) return;
        annotation[field] = event.target.value;
        selectedAnnotationIndex = index;
        loadCurrentStep();
        if (onApply) {
          onApply(step);
        }
      });

      annotationLayer.addEventListener("focusin", (event) => {
        const index = Number(event.target.dataset.annotationIndex);
        if (!Number.isInteger(index)) return;
        selectedAnnotationIndex = index;
        loadCurrentStep();
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
    createAnnotationFromRect,
    createEditor,
    rectFromDrag
  };
})(window);
