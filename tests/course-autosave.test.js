const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const path = require("node:path");
const os = require("node:os");
const {
  deleteAutosave,
  findRecoverableAutosaves,
  getAutosaveDir,
  readLatestAutosave,
  restoreAutosave,
  shouldOfferRecovery,
  writeAutosave
} = require("../electron/course-autosave");

test("writeAutosave stores draft files under course .autosave without changing original files", async () => {
  const courseDir = await fs.mkdtemp(path.join(os.tmpdir(), "studyflow-autosave-"));
  const coursePackage = {
    courseDir,
    courseMeta: { courseId: "voucher-basic", title: "전표 발행 기본 교육", updatedAt: "2026-07-15T09:00:00+09:00" },
    scenario: { id: "voucher-basic", title: "전표 발행 기본 교육", steps: [{ id: "step-1", title: "수정 전" }] },
    sharedSettings: { baseResolution: { width: 1920, height: 1080 }, aspectRatio: "16:9" }
  };

  const record = await writeAutosave(coursePackage, "step-edited");

  assert.equal(record.courseDir, courseDir);
  assert.equal(record.reason, "step-edited");
  assert.ok(record.autosavedAt);
  assert.ok(await exists(path.join(getAutosaveDir(courseDir), "course.json")));
  assert.ok(await exists(path.join(getAutosaveDir(courseDir), "course-meta.json")));
  assert.ok(await exists(path.join(getAutosaveDir(courseDir), "shared-settings.json")));
  assert.equal(await exists(path.join(courseDir, "course.json")), false);
});

test("readLatestAutosave returns null when no autosave exists", async () => {
  const courseDir = await fs.mkdtemp(path.join(os.tmpdir(), "studyflow-autosave-empty-"));

  const record = await readLatestAutosave(courseDir);

  assert.equal(record, null);
});

test("shouldOfferRecovery only returns true for newer autosave", () => {
  assert.equal(
    shouldOfferRecovery("2026-07-15T09:00:00+09:00", "2026-07-15T09:01:00+09:00"),
    true
  );
  assert.equal(
    shouldOfferRecovery("2026-07-15T09:02:00+09:00", "2026-07-15T09:01:00+09:00"),
    false
  );
});

test("findRecoverableAutosaves finds only courses with autosave records", async () => {
  const courseDir = await fs.mkdtemp(path.join(os.tmpdir(), "studyflow-autosave-find-"));
  const emptyDir = await fs.mkdtemp(path.join(os.tmpdir(), "studyflow-autosave-none-"));
  await writeAutosave({
    courseDir,
    courseMeta: { courseId: "voucher-basic", title: "전표 발행 기본 교육" },
    scenario: { id: "voucher-basic", title: "전표 발행 기본 교육", steps: [] },
    sharedSettings: { baseResolution: { width: 1920, height: 1080 }, aspectRatio: "16:9" }
  }, "manual-check");

  const records = await findRecoverableAutosaves([courseDir, emptyDir]);

  assert.equal(records.length, 1);
  assert.equal(records[0].courseDir, courseDir);
});

test("restoreAutosave opens autosaved course package", async () => {
  const courseDir = await fs.mkdtemp(path.join(os.tmpdir(), "studyflow-autosave-restore-"));
  const record = await writeAutosave({
    courseDir,
    courseMeta: { courseId: "voucher-basic", title: "전표 발행 기본 교육" },
    scenario: { id: "voucher-basic", title: "복구된 교육 자료", steps: [] },
    sharedSettings: { baseResolution: { width: 1920, height: 1080 }, aspectRatio: "16:9" }
  }, "app-closed");

  const restored = await restoreAutosave(record);

  assert.equal(restored.scenario.title, "복구된 교육 자료");
  assert.equal(restored.courseDir, courseDir);
});

test("deleteAutosave removes autosave folder", async () => {
  const courseDir = await fs.mkdtemp(path.join(os.tmpdir(), "studyflow-autosave-delete-"));
  await writeAutosave({
    courseDir,
    courseMeta: { courseId: "voucher-basic", title: "전표 발행 기본 교육" },
    scenario: { id: "voucher-basic", title: "전표 발행 기본 교육", steps: [] },
    sharedSettings: { baseResolution: { width: 1920, height: 1080 }, aspectRatio: "16:9" }
  }, "delete-check");

  await deleteAutosave(courseDir);

  assert.equal(await exists(getAutosaveDir(courseDir)), false);
});

async function exists(filePath) {
  try {
    await fs.stat(filePath);
    return true;
  } catch (_error) {
    return false;
  }
}
