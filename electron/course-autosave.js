"use strict";

const fs = require("node:fs/promises");
const path = require("node:path");
const { assertEditable } = require("./open-mode");

function getAutosaveDir(courseDir) {
  return path.join(courseDir, ".autosave");
}

async function writeJsonAtomic(filePath, value) {
  const tempPath = `${filePath}.tmp`;
  await fs.writeFile(tempPath, JSON.stringify(value, null, 2), "utf8");
  await fs.rename(tempPath, filePath);
}

async function writeAutosave(coursePackage, reason) {
  if (!coursePackage || !coursePackage.courseDir) {
    throw new Error("courseDir is required for autosave.");
  }
  assertEditable(coursePackage.openMode, "write-autosave");
  const autosaveDir = getAutosaveDir(coursePackage.courseDir);
  const autosavedAt = new Date().toISOString();
  await fs.mkdir(autosaveDir, { recursive: true });

  const record = {
    courseDir: coursePackage.courseDir,
    autosaveDir,
    reason: reason || "autosave",
    autosavedAt,
    courseMeta: {
      ...(coursePackage.courseMeta || {}),
      autosavedAt
    },
    scenario: coursePackage.scenario || null,
    sharedSettings: coursePackage.sharedSettings || {}
  };

  await writeJsonAtomic(path.join(autosaveDir, "autosave-record.json"), {
    courseDir: record.courseDir,
    reason: record.reason,
    autosavedAt: record.autosavedAt
  });
  await writeJsonAtomic(path.join(autosaveDir, "course-meta.json"), record.courseMeta);
  await writeJsonAtomic(path.join(autosaveDir, "course.json"), record.scenario);
  await writeJsonAtomic(path.join(autosaveDir, "shared-settings.json"), record.sharedSettings);

  return record;
}

async function readLatestAutosave(courseDir) {
  const autosaveDir = getAutosaveDir(courseDir);
  try {
    const [recordText, metaText, scenarioText, settingsText] = await Promise.all([
      fs.readFile(path.join(autosaveDir, "autosave-record.json"), "utf8"),
      fs.readFile(path.join(autosaveDir, "course-meta.json"), "utf8"),
      fs.readFile(path.join(autosaveDir, "course.json"), "utf8"),
      fs.readFile(path.join(autosaveDir, "shared-settings.json"), "utf8")
    ]);
    const record = JSON.parse(recordText);
    return {
      courseDir,
      autosaveDir,
      reason: record.reason || "",
      autosavedAt: record.autosavedAt,
      courseMeta: JSON.parse(metaText),
      scenario: JSON.parse(scenarioText),
      sharedSettings: JSON.parse(settingsText)
    };
  } catch (_error) {
    return null;
  }
}

async function findRecoverableAutosaves(courseDirs) {
  const records = [];
  for (const courseDir of courseDirs || []) {
    const record = await readLatestAutosave(courseDir);
    if (record) {
      records.push(record);
    }
  }
  return records;
}

async function restoreAutosave(record) {
  return {
    courseDir: record.courseDir,
    courseMeta: record.courseMeta,
    scenario: record.scenario,
    sharedSettings: record.sharedSettings
  };
}

async function deleteAutosave(courseDir) {
  await fs.rm(getAutosaveDir(courseDir), { recursive: true, force: true });
}

function shouldOfferRecovery(savedAt, autosavedAt) {
  if (!autosavedAt) return false;
  if (!savedAt) return true;
  return Date.parse(autosavedAt) > Date.parse(savedAt);
}

module.exports = {
  deleteAutosave,
  findRecoverableAutosaves,
  getAutosaveDir,
  readLatestAutosave,
  restoreAutosave,
  shouldOfferRecovery,
  writeAutosave
};
