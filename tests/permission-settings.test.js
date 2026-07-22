const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const path = require("node:path");
const os = require("node:os");
const {
  getDefaultPermissionSettings,
  isAdminEmployee,
  loadPermissionSettings,
  savePermissionSettings
} = require("../electron/permission-settings");

test("default permission settings do not store an initial password", () => {
  const settings = getDefaultPermissionSettings();

  assert.deepEqual(settings.admins, []);
  assert.deepEqual(settings.editors, []);
  assert.equal(isAdminEmployee("2008117", settings), false);
});

test("loadPermissionSettings creates database permission-settings.json when missing", async () => {
  const databaseDir = await fs.mkdtemp(path.join(os.tmpdir(), "studyflow-permission-db-"));

  const settings = await loadPermissionSettings(databaseDir);
  const saved = JSON.parse(await fs.readFile(path.join(databaseDir, "permission-settings.json"), "utf8"));

  assert.deepEqual(settings.admins, []);
  assert.deepEqual(saved.editors, []);
});

test("savePermissionSettings preserves configured admins and editors", async () => {
  const databaseDir = await fs.mkdtemp(path.join(os.tmpdir(), "studyflow-permission-save-"));
  const nextSettings = {
    admins: [{ employeeId: "2008117" }],
    editors: ["2008117", "3000001"],
    updatedAt: "2026-07-22T00:00:00+09:00"
  };

  const saved = await savePermissionSettings(databaseDir, nextSettings);
  const loaded = await loadPermissionSettings(databaseDir);

  assert.deepEqual(saved.editors, ["2008117", "3000001"]);
  assert.equal(loaded.admins[0].employeeId, "2008117");
  assert.equal(isAdminEmployee("2008117", loaded), true);
});
