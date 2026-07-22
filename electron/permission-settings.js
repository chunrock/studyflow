"use strict";

const fs = require("node:fs/promises");
const path = require("node:path");

const PERMISSION_SETTINGS_FILE = "permission-settings.json";

function getDefaultPermissionSettings() {
  return {
    admins: [],
    editors: [],
    updatedAt: new Date().toISOString()
  };
}

async function loadPermissionSettings(databaseDir) {
  const filePath = path.join(databaseDir, PERMISSION_SETTINGS_FILE);
  try {
    return normalizePermissionSettings(JSON.parse(await fs.readFile(filePath, "utf8")));
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
    const defaults = getDefaultPermissionSettings();
    await savePermissionSettings(databaseDir, defaults);
    return defaults;
  }
}

async function savePermissionSettings(databaseDir, settings) {
  await fs.mkdir(databaseDir, { recursive: true });
  const normalized = normalizePermissionSettings(settings || {});
  const filePath = path.join(databaseDir, PERMISSION_SETTINGS_FILE);
  const tempPath = `${filePath}.tmp`;
  await fs.writeFile(tempPath, JSON.stringify(normalized, null, 2), "utf8");
  await fs.rename(tempPath, filePath);
  return normalized;
}

function isAdminEmployee(employeeId, settings) {
  return Boolean(employeeId && settings && Array.isArray(settings.admins) &&
    settings.admins.some((admin) => admin.employeeId === employeeId));
}

function normalizePermissionSettings(settings) {
  const admins = Array.isArray(settings.admins) ? settings.admins : [];
  const editors = Array.isArray(settings.editors) ? settings.editors : [];
  return {
    admins: admins.map((admin) => ({ employeeId: String(admin.employeeId || "").trim() })).filter((admin) => admin.employeeId),
    editors: Array.from(new Set(editors.map((editor) => String(editor || "").trim()).filter(Boolean))),
    updatedAt: settings.updatedAt || new Date().toISOString()
  };
}

module.exports = {
  getDefaultPermissionSettings,
  isAdminEmployee,
  loadPermissionSettings,
  savePermissionSettings
};
