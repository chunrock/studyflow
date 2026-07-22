"use strict";

(function exposeCapture(global) {
  async function captureCurrentPage(step) {
    if (!global.studyflow || !global.studyflow.captureCurrentPage) {
      throw new Error("captureCurrentPage API is unavailable");
    }
    const result = await global.studyflow.captureCurrentPage(step.id);
    step.screenshotPath = result.screenshotPath;
    return step;
  }

  global.StudyFlowCapture = {
    captureCurrentPage
  };
})(window);
