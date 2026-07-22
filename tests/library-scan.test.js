const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const path = require("node:path");
const os = require("node:os");
const { scanCourseFolder } = require("../electron/library-scan");

test("scanCourseFolder finds course-meta.json within max depth", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "studyflow-library-"));
  const courseDir = path.join(root, "team", "voucher-basic");
  await fs.mkdir(courseDir, { recursive: true });
  await fs.writeFile(path.join(courseDir, "course-meta.json"), JSON.stringify({
    courseId: "voucher-basic",
    title: "전표 발행 기본 교육",
    pageCount: 3
  }), "utf8");

  const items = await scanCourseFolder(root, 3);

  assert.equal(items.length, 1);
  assert.equal(items[0].meta.courseId, "voucher-basic");
  assert.equal(items[0].sourcePath, courseDir);

  await fs.rm(root, { recursive: true, force: true });
});

test("scanCourseFolder reports course folders missing metadata", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "studyflow-library-"));
  const courseDir = path.join(root, "missing-meta-course");
  await fs.mkdir(courseDir, { recursive: true });
  await fs.writeFile(path.join(courseDir, "course.json"), JSON.stringify({ title: "임시 교육" }), "utf8");

  const items = await scanCourseFolder(root, 3);

  assert.equal(items.length, 1);
  assert.equal(items[0].fileStatus, "missing-meta");
  assert.equal(items[0].meta.title, "missing-meta-course");

  await fs.rm(root, { recursive: true, force: true });
});
