"use strict";

const REQUIRED_META_FIELDS = [
  "schemaVersion",
  "courseId",
  "title",
  "description",
  "summary",
  "department",
  "jobRole",
  "createdAt",
  "updatedAt",
  "pageCount",
  "contentHash"
];

function isValidDate(value) {
  return typeof value === "string" && !Number.isNaN(Date.parse(value));
}

function addIssue(issues, level, code, message) {
  issues.push({ level, code, message });
}

function validateCourseForShare(meta, scenario) {
  const issues = [];

  for (const field of REQUIRED_META_FIELDS) {
    if (meta[field] === undefined || meta[field] === "") {
      addIssue(issues, "error", `missing-${field}`, `${field} 값이 필요합니다.`);
    }
  }

  if (!meta.author || !meta.author.accountName) {
    addIssue(issues, "error", "missing-author-account", "author.accountName 값이 필요합니다.");
  }
  if (!meta.author || !meta.author.displayName) {
    addIssue(issues, "warning", "missing-author-name", "author.displayName 값이 비어 있습니다.");
  }
  for (const field of ["createdAt", "updatedAt", "lastSharedAt"]) {
    if (meta[field] && !isValidDate(meta[field])) {
      addIssue(issues, "error", `invalid-${field}`, `${field} 날짜 형식이 올바르지 않습니다.`);
    }
  }
  if (!Array.isArray(meta.tags)) {
    addIssue(issues, "warning", "invalid-tags", "tags는 배열이어야 합니다.");
  }
  if (!Array.isArray(meta.customCategories)) {
    addIssue(issues, "warning", "invalid-custom-categories", "customCategories는 배열이어야 합니다.");
  }

  if (!scenario || !Array.isArray(scenario.steps)) {
    addIssue(issues, "error", "missing-course", "course.json 또는 교육 시나리오가 필요합니다.");
  } else {
    if (meta.pageCount !== scenario.steps.length) {
      addIssue(issues, "error", "page-count-mismatch", "course-meta.json pageCount와 실제 단계 수가 다릅니다.");
    }
    scenario.steps.forEach((step, index) => {
      if (!step.screenshotPath) {
        addIssue(issues, "error", `missing-screenshot-${index + 1}`, `${index + 1}단계 스크린샷 경로가 필요합니다.`);
      }
      const highlight = step.highlightPx || step.highlight;
      const size = step.screenshotSize;
      if (highlight && size) {
        const overflows = highlight.x < 0 || highlight.y < 0 || highlight.x + highlight.width > size.width || highlight.y + highlight.height > size.height;
        if (overflows) {
          addIssue(issues, "error", `highlight-out-of-bounds-${index + 1}`, `${index + 1}단계 강조 영역이 기준 화면을 벗어납니다.`);
        }
      }
    });
  }

  const summary = {
    ok: issues.every((issue) => issue.level !== "error"),
    errors: issues.filter((issue) => issue.level === "error").length,
    warnings: issues.filter((issue) => issue.level === "warning").length,
    normal: 0
  };

  return { summary, issues };
}

function getShareGate(validationResult, warningsAccepted) {
  const summary = validationResult && validationResult.summary ? validationResult.summary : {};
  const errors = Number(summary.errors || 0);
  const warnings = Number(summary.warnings || 0);
  if (errors > 0) {
    return {
      allowed: false,
      reason: "errors",
      requiresWarningConfirmation: false,
      message: "공유 전 검사 오류가 있어 내보내기를 차단했습니다."
    };
  }
  if (warnings > 0 && !warningsAccepted) {
    return {
      allowed: false,
      reason: "warnings-unconfirmed",
      requiresWarningConfirmation: true,
      message: "경고를 확인한 뒤 다시 내보내세요."
    };
  }
  return {
    allowed: true,
    reason: warnings > 0 ? "warnings-accepted" : "clean",
    requiresWarningConfirmation: warnings > 0,
    message: warnings > 0 ? "경고 확인 후 공유를 계속합니다." : "공유 가능한 상태입니다."
  };
}

function autoFixCourseMeta(meta, scenario) {
  const nextMeta = {
    ...meta,
    author: { ...(meta.author || {}) }
  };
  if (!nextMeta.updatedAt) {
    nextMeta.updatedAt = new Date().toISOString();
  }
  if (!Array.isArray(nextMeta.tags)) {
    nextMeta.tags = [];
  }
  if (!Array.isArray(nextMeta.customCategories)) {
    nextMeta.customCategories = [];
  }
  if (!nextMeta.author.displayName && nextMeta.author.accountName) {
    nextMeta.author.displayName = nextMeta.author.accountName;
  }
  if (scenario && Array.isArray(scenario.steps)) {
    nextMeta.pageCount = scenario.steps.length;
  }
  if (!nextMeta.contentHash) {
    nextMeta.contentHash = `sha256:${nextMeta.courseId || "course"}-${nextMeta.pageCount || 0}`;
  }
  return nextMeta;
}

module.exports = {
  autoFixCourseMeta,
  getShareGate,
  validateCourseForShare
};
