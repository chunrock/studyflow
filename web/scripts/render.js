"use strict";

(function exposeRender(global) {
  function getStepAnnotations(step) {
    if (Array.isArray(step.annotations) && step.annotations.length > 0) {
      return step.annotations;
    }
    return [];
  }

  function renderAnnotation(annotation, index, geometry) {
    const fragment = document.createDocumentFragment();
    const ring = document.createElement("div");
    ring.className = "annotation-ring";
    ring.dataset.accent = annotation.accent || "focus";
    ring.dataset.annotationIndex = String(index);
    Object.assign(ring.style, geometry.toCssRect(annotation.highlight));

    const position = geometry.getCalloutPosition(
      annotation.highlight,
      annotation.callout && annotation.callout.placement ? annotation.callout.placement : "right",
      { width: window.innerWidth, height: window.innerHeight }
    );
    const note = document.createElement("article");
    note.className = "annotation-note";
    note.dataset.annotationIndex = String(index);
    note.style.left = `${position.left}px`;
    note.style.top = `${position.top}px`;

    const number = document.createElement("strong");
    number.className = "annotation-note__number";
    number.textContent = String(annotation.number || index + 1);

    const title = document.createElement("input");
    title.className = "annotation-note__title";
    title.dataset.annotationField = "title";
    title.dataset.annotationIndex = String(index);
    title.value = annotation.title;
    title.setAttribute("aria-label", `${index + 1}번 안내 제목`);

    const body = document.createElement("textarea");
    body.className = "annotation-note__body";
    body.dataset.annotationField = "body";
    body.dataset.annotationIndex = String(index);
    body.rows = 2;
    body.value = annotation.body;
    body.setAttribute("aria-label", `${index + 1}번 안내 설명`);

    note.append(number, title, body);
    fragment.append(ring, note);
    return fragment;
  }

  function renderOverlay(snapshot, geometry) {
    const highlight = document.querySelector("[data-role='highlight']");
    const callout = document.querySelector("[data-role='callout']");
    const annotationLayer = document.querySelector("[data-role='annotation-layer']");
    const progress = document.querySelector("[data-role='progress']");
    const title = document.querySelector("[data-role='title']");
    const body = document.querySelector("[data-role='body']");

    const step = snapshot.currentStep;
    const annotations = getStepAnnotations(step);
    if (annotationLayer) {
      annotationLayer.replaceChildren(...annotations.map((annotation, index) => renderAnnotation(annotation, index, geometry)));
    }
    highlight.hidden = annotations.length > 0;
    callout.hidden = annotations.length > 0;
    if (annotations.length > 0) {
      return;
    }

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
    getStepAnnotations,
    renderOverlay
  };
})(window);
