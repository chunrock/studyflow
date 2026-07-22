const test = require("node:test");
const assert = require("node:assert/strict");
const { autoFixCourseMeta, validateCourseForShare } = require("../electron/share-validation");

const validMeta = {
  schemaVersion: "1.0.0",
  courseId: "course",
  title: "교육",
  description: "설명",
  summary: "요약",
  author: { accountName: "user", displayName: "사용자" },
  department: "회계팀",
  jobRole: "경리",
  createdAt: "2026-07-22T09:00:00+09:00",
  updatedAt: "2026-07-22T10:00:00+09:00",
  pageCount: 1,
  contentHash: "sha256:test",
  tags: [],
  customCategories: []
};

const validScenario = {
  steps: [
    {
      screenshotPath: "web/data/assets/screenshots/step-1.png",
      screenshotSize: { width: 1920, height: 1080 },
      highlightPx: { x: 10, y: 10, width: 100, height: 100 }
    }
  ]
};

test("validateCourseForShare passes complete metadata and scenario", () => {
  const result = validateCourseForShare(validMeta, validScenario);

  assert.equal(result.summary.ok, true);
  assert.equal(result.summary.errors, 0);
});

test("validateCourseForShare blocks missing required metadata", () => {
  const result = validateCourseForShare({ ...validMeta, title: "" }, validScenario);

  assert.equal(result.summary.ok, false);
  assert.equal(result.issues.some((issue) => issue.code === "missing-title"), true);
});

test("validateCourseForShare catches page count mismatch and highlight overflow", () => {
  const result = validateCourseForShare({ ...validMeta, pageCount: 2 }, {
    steps: [{ ...validScenario.steps[0], highlightPx: { x: 1900, y: 10, width: 100, height: 100 } }]
  });

  assert.equal(result.summary.errors, 2);
});

test("autoFixCourseMeta fills safe metadata defaults", () => {
  const fixed = autoFixCourseMeta({
    courseId: "course",
    author: { accountName: "user" }
  }, validScenario);

  assert.equal(fixed.pageCount, 1);
  assert.equal(fixed.author.displayName, "user");
  assert.deepEqual(fixed.tags, []);
  assert.deepEqual(fixed.customCategories, []);
  assert.equal(fixed.contentHash, "sha256:course-1");
});
