"use strict";

const fs = require("node:fs/promises");
const path = require("node:path");
const { assertEditable } = require("./open-mode");

function buildChangeLogEntry(beforePackage, afterPackage, author, summary) {
  const beforeScenario = beforePackage && beforePackage.scenario ? beforePackage.scenario : {};
  const afterScenario = afterPackage && afterPackage.scenario ? afterPackage.scenario : {};
  const beforeSteps = Array.isArray(beforeScenario.steps) ? beforeScenario.steps : [];
  const afterSteps = Array.isArray(afterScenario.steps) ? afterScenario.steps : [];
  const items = [];
  const stepDelta = afterSteps.length - beforeSteps.length;

  if (beforeScenario.title !== afterScenario.title) {
    items.push("제목 수정");
  }
  if (stepDelta > 0) {
    items.push(`페이지 ${stepDelta}개 추가`);
  }
  if (stepDelta < 0) {
    items.push(`페이지 ${Math.abs(stepDelta)}개 삭제`);
  }
  if (items.length === 0) {
    items.push("교육 자료 내용 수정");
  }

  return {
    changedAt: new Date().toISOString(),
    sharedAt: afterPackage.courseMeta && afterPackage.courseMeta.lastSharedAt || "",
    author: {
      accountName: author.accountName || "",
      displayName: author.displayName || author.accountName || ""
    },
    summary: summary || "교육 자료 수정",
    items,
    contentHash: afterPackage.courseMeta && afterPackage.courseMeta.contentHash || ""
  };
}

async function readChangeLog(courseDir) {
  try {
    const text = await fs.readFile(path.join(courseDir, "change-log.json"), "utf8");
    return JSON.parse(text);
  } catch (_error) {
    return { latest: {}, changes: [] };
  }
}

async function writeChangeLogAtomic(courseDir, log) {
  const filePath = path.join(courseDir, "change-log.json");
  const tempPath = `${filePath}.tmp`;
  await fs.writeFile(tempPath, JSON.stringify(log, null, 2), "utf8");
  await fs.rename(tempPath, filePath);
}

async function appendChangeLog(courseDir, entry) {
  assertEditable(entry && entry.openMode, "append-change-log");
  const log = await readChangeLog(courseDir);
  const nextLog = {
    latest: {
      changedAt: entry.changedAt,
      sharedAt: entry.sharedAt || "",
      contentHash: entry.contentHash,
      summary: entry.summary
    },
    changes: [...(log.changes || []), entry]
  };
  await writeChangeLogAtomic(courseDir, nextLog);
  return nextLog;
}

function getCourseSortDate(meta) {
  return meta.lastSharedAt || meta.updatedAt || meta.createdAt || "";
}

function classifyCourseRelation(a, b) {
  if (!a.courseId || !b.courseId || !a.contentHash || !b.contentHash || !getCourseSortDate(a) || !getCourseSortDate(b)) {
    return "meta-missing";
  }
  if (a.courseId !== b.courseId) {
    return "older-revision";
  }
  if (a.contentHash === b.contentHash) {
    return "same-content";
  }
  const aTime = Date.parse(getCourseSortDate(a));
  const bTime = Date.parse(getCourseSortDate(b));
  if (Number.isNaN(aTime) || Number.isNaN(bTime) || aTime === bTime) {
    return "content-conflict";
  }
  return aTime > bTime ? "newer-revision" : "older-revision";
}

function groupCourseRevisions(items) {
  const byCourse = new Map();
  for (const item of items || []) {
    const key = item.courseId || item.id;
    if (!byCourse.has(key)) byCourse.set(key, []);
    byCourse.get(key).push(item);
  }

  return [...byCourse.values()].map((groupItems) => {
    const sorted = [...groupItems].sort((a, b) => Date.parse(getCourseSortDate(b)) - Date.parse(getCourseSortDate(a)));
    const latest = { ...sorted[0], previousRevisions: [], conflicts: [] };
    for (const item of sorted.slice(1)) {
      const relation = classifyCourseRelation(latest, item);
      if (relation === "content-conflict" || relation === "meta-missing") {
        latest.conflicts.push({ ...item, fileStatus: relation });
      } else if (relation === "same-content") {
        latest.previousRevisions.push({ ...item, fileStatus: "duplicate-content" });
      } else {
        latest.previousRevisions.push({ ...item, fileStatus: "previous-revision" });
      }
    }
    return latest;
  });
}

module.exports = {
  appendChangeLog,
  buildChangeLogEntry,
  classifyCourseRelation,
  getCourseSortDate,
  groupCourseRevisions,
  readChangeLog
};
