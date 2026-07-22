const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const path = require("node:path");
const os = require("node:os");
const {
  assertEditable,
  canEmployeeEdit,
  createEditableCopy,
  finalizeEditSession,
  resolveOpenMode
} = require("../electron/open-mode");

test("resolveOpenMode opens zip and shared library items as read only by default", () => {
  const state = resolveOpenMode({
    sourceType: "zip",
    sourcePath: "D:/StudyFlow/voucher.studyflow.zip",
    employeeId: "2008117",
    permissions: { editors: ["2008117"] }
  });

  assert.equal(state.openMode, "read-only");
  assert.equal(state.readOnlyReason, "zip-package");
  assert.equal(state.canEnterEditMode, true);
});

test("canEmployeeEdit checks employee id against editor list", () => {
  assert.equal(canEmployeeEdit("2008117", { editors: ["2008117"] }), true);
  assert.equal(canEmployeeEdit("9999999", { editors: ["2008117"] }), false);
});

test("assertEditable blocks course-changing actions in read only mode", () => {
  const state = { openMode: "read-only", readOnlyReason: "shared-library" };

  assert.throws(() => assertEditable(state, "save-course"), /read-only/);
  assert.doesNotThrow(() => assertEditable({ openMode: "editable" }, "save-course"));
});

test("createEditableCopy writes an editable temporary copy without changing the original", async () => {
  const courseDir = await fs.mkdtemp(path.join(os.tmpdir(), "studyflow-readonly-original-"));
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "studyflow-readonly-copy-"));
  const coursePackage = {
    courseDir,
    courseMeta: { courseId: "voucher-basic", title: "전표 발행 기본 교육" },
    scenario: { id: "voucher-basic", title: "전표 발행 기본 교육", steps: [] },
    sharedSettings: { baseResolution: { width: 1920, height: 1080 }, aspectRatio: "16:9" }
  };

  const copy = await createEditableCopy(coursePackage, tempRoot, "2008117");

  assert.notEqual(copy.courseDir, courseDir);
  assert.equal(copy.openMode.openMode, "editable");
  assert.equal(copy.openMode.editSession.originalCourseDir, courseDir);
  assert.ok(await exists(path.join(copy.courseDir, "course.json")));
});

test("finalizeEditSession supports cancel without saving original", async () => {
  const tempCourseDir = await fs.mkdtemp(path.join(os.tmpdir(), "studyflow-readonly-cancel-"));
  await fs.writeFile(path.join(tempCourseDir, "course.json"), "{}", "utf8");

  const result = await finalizeEditSession({ tempCourseDir }, "cancel");

  assert.equal(result.decision, "cancel");
  assert.equal(await exists(tempCourseDir), false);
});

async function exists(filePath) {
  try {
    await fs.stat(filePath);
    return true;
  } catch (_error) {
    return false;
  }
}
