const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const path = require("node:path");
const os = require("node:os");
const {
  applyClassificationFilters,
  detectPendingTerms,
  getClassificationSettingsPath,
  isUnclassified,
  loadClassificationSettings,
  normalizeTags,
  saveClassificationSettings
} = require("../electron/classification-settings");

test("loadClassificationSettings creates default classification lists", async () => {
  const databaseDir = await fs.mkdtemp(path.join(os.tmpdir(), "studyflow-classification-"));
  const settings = await loadClassificationSettings(databaseDir);

  assert.deepEqual(settings.departments, []);
  assert.deepEqual(settings.jobRoles, []);
  assert.deepEqual(settings.customCategories, {});
  assert.deepEqual(settings.tagAliases, []);
  assert.deepEqual(settings.pendingTerms, []);
  assert.ok(await exists(getClassificationSettingsPath(databaseDir)));
});

test("saveClassificationSettings normalizes lists atomically", async () => {
  const databaseDir = await fs.mkdtemp(path.join(os.tmpdir(), "studyflow-classification-save-"));
  const settings = await saveClassificationSettings(databaseDir, {
    departments: [" 회계팀 ", "회계팀", ""],
    jobRoles: ["경리"],
    customCategories: { "교육유형": [" 신입교육 ", "신입교육"] },
    tagAliases: [],
    pendingTerms: []
  });

  assert.deepEqual(settings.departments, ["회계팀"]);
  assert.deepEqual(settings.customCategories["교육유형"], ["신입교육"]);
});

test("normalizeTags trims spaces removes blanks and deduplicates", () => {
  assert.deepEqual(
    normalizeTags(" 전표, 전표 , 계정 과목,계정과목, "),
    ["전표", "계정 과목", "계정과목"]
  );
});

test("detectPendingTerms returns unknown departments job roles categories and tags", () => {
  const pending = detectPendingTerms({
    courseId: "voucher-basic",
    department: "회계1팀",
    jobRole: "전표담당",
    customCategories: ["월마감"],
    tags: ["전표검증"]
  }, {
    departments: ["회계팀"],
    jobRoles: ["경리"],
    customCategories: { "교육유형": ["신입교육"] },
    tagAliases: [{ canonical: "전표 발행", aliases: ["전표"] }],
    pendingTerms: []
  });

  assert.ok(pending.some((term) => term.type === "department" && term.value === "회계1팀"));
  assert.ok(pending.some((term) => term.type === "jobRole" && term.value === "전표담당"));
  assert.ok(pending.some((term) => term.type === "customCategory" && term.value === "월마감"));
  assert.ok(pending.some((term) => term.type === "tag" && term.value === "전표검증"));
});

test("applyClassificationFilters uses OR inside a group and AND between groups", () => {
  const items = [
    { title: "A", department: "회계팀", jobRole: "경리", tags: ["전표"] },
    { title: "B", department: "총무팀", jobRole: "관리자", tags: ["전표"] },
    { title: "C", department: "인사팀", jobRole: "관리자", tags: ["급여"] }
  ];

  const filtered = applyClassificationFilters(items, {
    departments: ["회계팀", "총무팀"],
    tags: ["전표"]
  });

  assert.deepEqual(filtered.map((item) => item.title), ["A", "B"]);
});

test("isUnclassified detects missing classification and tags", () => {
  assert.equal(isUnclassified({ department: "", jobRole: "", customCategories: [], tags: [] }), true);
  assert.equal(isUnclassified({ department: "회계팀", jobRole: "경리", customCategories: [], tags: ["전표"] }), false);
});

async function exists(filePath) {
  try {
    await fs.stat(filePath);
    return true;
  } catch (_error) {
    return false;
  }
}
