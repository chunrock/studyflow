const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const path = require("node:path");
const os = require("node:os");
const {
  appendChangeLog,
  buildChangeLogEntry,
  classifyCourseRelation,
  getCourseSortDate,
  groupCourseRevisions,
  readChangeLog
} = require("../electron/course-history");

test("buildChangeLogEntry records summary author changed fields and content hash", () => {
  const beforePackage = {
    scenario: { title: "전표 발행 기본 교육", steps: [{ id: "step-1", title: "전표일자 확인" }] },
    courseMeta: { contentHash: "sha256:old" }
  };
  const afterPackage = {
    scenario: {
      title: "전표 발행 기본 교육",
      steps: [
        { id: "step-1", title: "전표일자 확인" },
        { id: "step-2", title: "저장 확인" }
      ]
    },
    courseMeta: { contentHash: "sha256:new" }
  };

  const entry = buildChangeLogEntry(beforePackage, afterPackage, {
    accountName: "hong",
    displayName: "홍길동"
  }, "저장 확인 단계 추가");

  assert.equal(entry.summary, "저장 확인 단계 추가");
  assert.equal(entry.author.accountName, "hong");
  assert.equal(entry.contentHash, "sha256:new");
  assert.ok(entry.items.includes("페이지 1개 추가"));
});

test("appendChangeLog stores detailed history separately from course-meta", async () => {
  const courseDir = await fs.mkdtemp(path.join(os.tmpdir(), "studyflow-history-"));
  const entry = {
    changedAt: "2026-07-21T10:30:00+09:00",
    sharedAt: "2026-07-21T10:40:00+09:00",
    author: { accountName: "hong", displayName: "홍길동" },
    summary: "전표 저장 단계 설명 보완",
    items: ["3페이지 설명 수정"],
    contentHash: "sha256:abc"
  };

  await appendChangeLog(courseDir, entry);
  const log = await readChangeLog(courseDir);

  assert.equal(log.latest.contentHash, "sha256:abc");
  assert.equal(log.changes.length, 1);
  assert.equal(log.changes[0].summary, "전표 저장 단계 설명 보완");
  assert.equal(await exists(path.join(courseDir, "course-meta.json")), false);
});

test("getCourseSortDate prefers lastSharedAt then updatedAt then createdAt", () => {
  assert.equal(getCourseSortDate({
    createdAt: "2026-07-01T09:00:00+09:00",
    updatedAt: "2026-07-02T09:00:00+09:00",
    lastSharedAt: "2026-07-03T09:00:00+09:00"
  }), "2026-07-03T09:00:00+09:00");
  assert.equal(getCourseSortDate({
    createdAt: "2026-07-01T09:00:00+09:00",
    updatedAt: "2026-07-02T09:00:00+09:00"
  }), "2026-07-02T09:00:00+09:00");
});

test("classifyCourseRelation detects duplicate content and content conflict", () => {
  const base = {
    courseId: "voucher-basic",
    contentHash: "sha256:a",
    lastSharedAt: "2026-07-21T10:00:00+09:00"
  };

  assert.equal(classifyCourseRelation(base, {
    courseId: "voucher-basic",
    contentHash: "sha256:a",
    lastSharedAt: "2026-07-21T11:00:00+09:00"
  }), "same-content");

  assert.equal(classifyCourseRelation(base, {
    courseId: "voucher-basic",
    contentHash: "sha256:b",
    lastSharedAt: "2026-07-21T10:00:00+09:00"
  }), "content-conflict");
});

test("groupCourseRevisions chooses latest by date and keeps conflicts separate", () => {
  const groups = groupCourseRevisions([
    {
      id: "old",
      courseId: "voucher-basic",
      contentHash: "sha256:a",
      updatedAt: "2026-07-20T09:00:00+09:00",
      changeSummary: "이전 수정"
    },
    {
      id: "latest",
      courseId: "voucher-basic",
      contentHash: "sha256:b",
      lastSharedAt: "2026-07-21T09:00:00+09:00",
      changeSummary: "최종 수정"
    },
    {
      id: "conflict",
      courseId: "voucher-basic",
      contentHash: "sha256:c",
      lastSharedAt: "2026-07-21T09:00:00+09:00",
      changeSummary: "동일 날짜 충돌"
    }
  ]);

  assert.equal(groups.length, 1);
  assert.equal(groups[0].id, "latest");
  assert.equal(groups[0].previousRevisions.length, 1);
  assert.equal(groups[0].conflicts.length, 1);
  assert.equal(groups[0].conflicts[0].fileStatus, "content-conflict");
});

async function exists(filePath) {
  try {
    await fs.stat(filePath);
    return true;
  } catch (_error) {
    return false;
  }
}
