"use strict";

const fs = require("node:fs/promises");
const path = require("node:path");

async function pathExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function readCourseMeta(metaPath) {
  const text = await fs.readFile(metaPath, "utf8");
  const meta = JSON.parse(text);
  return {
    meta,
    metaPath,
    sourcePath: path.dirname(metaPath),
    fileStatus: "normal"
  };
}

async function scanCourseFolder(rootDir, maxDepth = 3) {
  const results = [];

  async function visit(dir, depth) {
    if (depth > maxDepth) return;
    const metaPath = path.join(dir, "course-meta.json");
    if (await pathExists(metaPath)) {
      results.push(await readCourseMeta(metaPath));
      return;
    }
    const coursePath = path.join(dir, "course.json");
    if (await pathExists(coursePath)) {
      results.push({
        meta: {
          title: path.basename(dir),
          description: "course-meta.json이 없는 교육 자료입니다."
        },
        metaPath: "",
        sourcePath: dir,
        fileStatus: "missing-meta"
      });
      return;
    }

    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory() || entry.name === "node_modules" || entry.name.startsWith(".")) continue;
      await visit(path.join(dir, entry.name), depth + 1);
    }
  }

  await visit(rootDir, 0);
  return results;
}

module.exports = {
  readCourseMeta,
  scanCourseFolder
};
