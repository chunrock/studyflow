const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const path = require("node:path");
const os = require("node:os");
const {
  getCachedIntegrity,
  getIntegrityCachePath,
  inspectZipPaths,
  loadIntegrityCache,
  saveIntegrityCache,
  shouldBlockForIntegrity,
  validatePackageFiles
} = require("../electron/package-integrity");

test("inspectZipPaths blocks dangerous zip entries", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "studyflow-integrity-zip-"));
  const zipPath = path.join(root, "bad.studyflow.zip");
  await fs.writeFile(zipPath, createMinimalZip(["../evil.txt", "course.json"]));

  const items = inspectZipPaths(zipPath);

  assert.ok(items.some((item) => item.level === "error" && item.code === "zip.path.dangerous"));
});

test("validatePackageFiles requires core package files", async () => {
  const courseDir = await fs.mkdtemp(path.join(os.tmpdir(), "studyflow-integrity-missing-"));
  await fs.writeFile(path.join(courseDir, "course.json"), JSON.stringify({ steps: [] }), "utf8");

  const result = await validatePackageFiles(courseDir);

  assert.equal(result.status, "error");
  assert.equal(result.fileStatus, "suspected-damaged");
  assert.ok(result.items.some((item) => item.code === "file.course-meta.required"));
  assert.ok(result.items.some((item) => item.code === "file.shared-settings.required"));
});

test("validatePackageFiles warns for optional history and missing videos", async () => {
  const courseDir = await fs.mkdtemp(path.join(os.tmpdir(), "studyflow-integrity-warning-"));
  await fs.writeFile(path.join(courseDir, "course-meta.json"), JSON.stringify({ contentHash: "sha256:test" }), "utf8");
  await fs.writeFile(path.join(courseDir, "shared-settings.json"), JSON.stringify({}), "utf8");
  await fs.writeFile(path.join(courseDir, "course.json"), JSON.stringify({
    steps: [{ id: "step-1", screenshotPath: "screenshots/step-1.png", videoPath: "videos/missing.mp4" }]
  }), "utf8");
  await fs.mkdir(path.join(courseDir, "screenshots"), { recursive: true });
  await fs.writeFile(path.join(courseDir, "screenshots", "step-1.png"), "image", "utf8");

  const result = await validatePackageFiles(courseDir);

  assert.equal(result.status, "warning");
  assert.ok(result.items.some((item) => item.code === "file.change-log.recommended"));
  assert.ok(result.items.some((item) => item.code === "file.video.missing"));
});

test("shouldBlockForIntegrity blocks open and share on errors but not scan", () => {
  const result = { status: "error", items: [], fileStatus: "suspected-damaged" };

  assert.equal(shouldBlockForIntegrity(result, "open"), true);
  assert.equal(shouldBlockForIntegrity(result, "share"), true);
  assert.equal(shouldBlockForIntegrity(result, "scan"), false);
});

test("integrity cache returns cached result only when file info matches", async () => {
  const databaseDir = await fs.mkdtemp(path.join(os.tmpdir(), "studyflow-integrity-cache-"));
  const fileInfo = {
    sourcePath: "D:/StudyFlow/voucher.studyflow.zip",
    size: 100,
    mtimeMs: 200,
    contentHash: "sha256:abc"
  };
  const result = { status: "ok", items: [], fileStatus: "normal" };

  await saveIntegrityCache(databaseDir, {
    [fileInfo.sourcePath]: { fileInfo, result, checkedAt: "2026-07-22T09:00:00+09:00" }
  });
  const cache = await loadIntegrityCache(databaseDir);

  assert.deepEqual(getCachedIntegrity(cache, fileInfo), result);
  assert.equal(getCachedIntegrity(cache, { ...fileInfo, size: 101 }), null);
  assert.ok(await exists(getIntegrityCachePath(databaseDir)));
});

function createMinimalZip(names) {
  const localParts = [];
  const centralParts = [];
  let offset = 0;
  for (const name of names) {
    const nameBuffer = Buffer.from(name);
    const local = Buffer.alloc(30 + nameBuffer.length);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(nameBuffer.length, 26);
    nameBuffer.copy(local, 30);
    localParts.push(local);

    const central = Buffer.alloc(46 + nameBuffer.length);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(nameBuffer.length, 28);
    central.writeUInt32LE(offset, 42);
    nameBuffer.copy(central, 46);
    centralParts.push(central);
    offset += local.length;
  }
  const centralOffset = offset;
  const centralSize = centralParts.reduce((sum, part) => sum + part.length, 0);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(names.length, 8);
  end.writeUInt16LE(names.length, 10);
  end.writeUInt32LE(centralSize, 12);
  end.writeUInt32LE(centralOffset, 16);
  return Buffer.concat([...localParts, ...centralParts, end]);
}

async function exists(filePath) {
  try {
    await fs.stat(filePath);
    return true;
  } catch (_error) {
    return false;
  }
}
