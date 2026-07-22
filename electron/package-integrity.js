"use strict";

const crypto = require("node:crypto");
const fs = require("node:fs/promises");
const fsSync = require("node:fs");
const path = require("node:path");

const REQUIRED_FILES = ["course-meta.json", "course.json", "shared-settings.json"];
const OPTIONAL_FILES = ["change-log.json"];

function inspectZipPaths(zipPath) {
  return readZipEntryNames(zipPath).flatMap((name) => {
    if (name.includes("..") || path.isAbsolute(name) || isExecutableOrScript(name)) {
      return [error("zip.path.dangerous", "압축 내부에 허용되지 않는 경로가 있습니다.", name)];
    }
    return [];
  });
}

async function validatePackageFiles(courseDir) {
  const items = [];
  for (const fileName of REQUIRED_FILES) {
    if (!(await exists(path.join(courseDir, fileName)))) {
      items.push(error(`file.${fileName.replace(".json", "")}.required`, `${fileName} 파일이 필요합니다.`, fileName));
    }
  }
  for (const fileName of OPTIONAL_FILES) {
    if (!(await exists(path.join(courseDir, fileName)))) {
      items.push(warning(`file.${fileName.replace(".json", "")}.recommended`, `${fileName} 파일 포함을 권장합니다.`, fileName));
    }
  }
  for (const fileName of REQUIRED_FILES) {
    const filePath = path.join(courseDir, fileName);
    if (await exists(filePath)) {
      try {
        JSON.parse(await fs.readFile(filePath, "utf8"));
      } catch (_error) {
        items.push(error(`json.${fileName}.invalid`, `${fileName} 문법이 올바르지 않습니다.`, fileName));
      }
    }
  }
  await inspectCourseAssetLinks(courseDir, items);
  return resultFromItems(items);
}

async function inspectCourseAssetLinks(courseDir, items) {
  const coursePath = path.join(courseDir, "course.json");
  if (!(await exists(coursePath))) return;
  try {
    const course = JSON.parse(await fs.readFile(coursePath, "utf8"));
    if (!Array.isArray(course.steps)) {
      items.push(error("course.steps.invalid", "course.json의 steps 배열이 필요합니다.", "course.json"));
      return;
    }
    for (const step of course.steps) {
      if (step.screenshotPath && !(await exists(path.join(courseDir, step.screenshotPath)))) {
        items.push(error("file.screenshot.missing", "페이지 스크린샷 파일이 없습니다.", step.screenshotPath));
      }
      if (step.videoPath && !(await exists(path.join(courseDir, step.videoPath)))) {
        items.push(warning("file.video.missing", "연결된 동영상 파일이 없습니다.", step.videoPath));
      }
    }
  } catch (_error) {
    items.push(error("course.json.invalid", "course.json 문법이 올바르지 않습니다.", "course.json"));
  }
}

async function validatePackageHash(courseDir, expectedHash) {
  if (!expectedHash) return resultFromItems([error("hash.required", "contentHash가 필요합니다.", "course-meta.json")]);
  const actualHash = await hashCoreFiles(courseDir);
  if (actualHash !== expectedHash) {
    return resultFromItems([error("hash.mismatch", "contentHash가 실제 파일 내용과 일치하지 않습니다.", "course-meta.json")]);
  }
  return resultFromItems([]);
}

async function validatePackageIntegrity(input) {
  const results = [];
  if (input.zipPath) results.push(resultFromItems(inspectZipPaths(input.zipPath)));
  if (input.courseDir) {
    results.push(await validatePackageFiles(input.courseDir));
    if (input.expectedHash) results.push(await validatePackageHash(input.courseDir, input.expectedHash));
  }
  return mergeResults(results);
}

function shouldBlockForIntegrity(result, context) {
  return result.status === "error" && (context === "open" || context === "share");
}

function getIntegrityCachePath(databaseDir) {
  return path.join(databaseDir, "integrity-cache.json");
}

async function loadIntegrityCache(databaseDir) {
  try {
    return JSON.parse(await fs.readFile(getIntegrityCachePath(databaseDir), "utf8"));
  } catch (_error) {
    return {};
  }
}

async function saveIntegrityCache(databaseDir, cache) {
  await fs.mkdir(databaseDir, { recursive: true });
  const filePath = getIntegrityCachePath(databaseDir);
  const tempPath = `${filePath}.tmp`;
  await fs.writeFile(tempPath, JSON.stringify(cache || {}, null, 2), "utf8");
  await fs.rename(tempPath, filePath);
  return cache || {};
}

function getCachedIntegrity(cache, fileInfo) {
  const entry = cache[fileInfo.sourcePath];
  if (!entry) return null;
  const cached = entry.fileInfo || {};
  if (cached.size !== fileInfo.size || cached.mtimeMs !== fileInfo.mtimeMs || cached.contentHash !== fileInfo.contentHash) {
    return null;
  }
  return entry.result;
}

async function hashCoreFiles(courseDir) {
  const hash = crypto.createHash("sha256");
  for (const fileName of ["course.json", "shared-settings.json"]) {
    const filePath = path.join(courseDir, fileName);
    if (await exists(filePath)) hash.update(await fs.readFile(filePath));
  }
  return `sha256:${hash.digest("hex")}`;
}

function readZipEntryNames(zipPath) {
  const buffer = fsSync.readFileSync(zipPath);
  const names = [];
  let offset = 0;
  while (offset < buffer.length - 46) {
    if (buffer.readUInt32LE(offset) === 0x02014b50) {
      const nameLength = buffer.readUInt16LE(offset + 28);
      const extraLength = buffer.readUInt16LE(offset + 30);
      const commentLength = buffer.readUInt16LE(offset + 32);
      names.push(buffer.slice(offset + 46, offset + 46 + nameLength).toString("utf8"));
      offset += 46 + nameLength + extraLength + commentLength;
    } else {
      offset += 1;
    }
  }
  return names;
}

function mergeResults(results) {
  return resultFromItems(results.flatMap((result) => result.items || []));
}

function resultFromItems(items) {
  if (items.some((item) => item.level === "error")) return { status: "error", items, fileStatus: "suspected-damaged" };
  if (items.some((item) => item.level === "warning")) return { status: "warning", items, fileStatus: "normal" };
  return { status: "ok", items, fileStatus: "normal" };
}

function error(code, message, filePath) {
  return { level: "error", code, message, path: filePath };
}

function warning(code, message, filePath) {
  return { level: "warning", code, message, path: filePath };
}

function isExecutableOrScript(filePath) {
  return /\.(exe|bat|cmd|ps1|vbs|js|msi)$/i.test(filePath);
}

async function exists(filePath) {
  try {
    await fs.stat(filePath);
    return true;
  } catch (_error) {
    return false;
  }
}

module.exports = {
  getCachedIntegrity,
  getIntegrityCachePath,
  inspectZipPaths,
  loadIntegrityCache,
  saveIntegrityCache,
  shouldBlockForIntegrity,
  validatePackageFiles,
  validatePackageHash,
  validatePackageIntegrity
};
