"use strict";

function createOverlayState(scenario) {
  let currentStepIndex = scenario.currentStepIndex || 0;
  let clickThrough = scenario.steps[currentStepIndex].clickThrough !== false;

  function getCurrentStep() {
    return scenario.steps[currentStepIndex];
  }

  function syncClickThroughFromStep() {
    clickThrough = getCurrentStep().clickThrough !== false;
  }

  return {
    getCurrentStep,
    next() {
      currentStepIndex = Math.min(currentStepIndex + 1, scenario.steps.length - 1);
      syncClickThroughFromStep();
      return getCurrentStep();
    },
    previous() {
      currentStepIndex = Math.max(currentStepIndex - 1, 0);
      syncClickThroughFromStep();
      return getCurrentStep();
    },
    goTo(stepIndex) {
      currentStepIndex = Math.max(0, Math.min(Number(stepIndex) || 0, scenario.steps.length - 1));
      syncClickThroughFromStep();
      return getCurrentStep();
    },
    setClickThrough(enabled) {
      clickThrough = Boolean(enabled);
      return clickThrough;
    },
    snapshot() {
      return {
        scenarioId: scenario.id,
        title: scenario.title,
        targetApp: scenario.targetApp,
        currentStepIndex,
        totalSteps: scenario.steps.length,
        clickThrough,
        currentStep: getCurrentStep()
      };
    }
  };
}

const stateApi = {
  createOverlayState
};

if (typeof module !== "undefined" && module.exports) {
  module.exports = stateApi;
}

if (typeof window !== "undefined") {
  window.StudyFlowState = stateApi;
}
