"use strict";

const fs = require("node:fs/promises");
const path = require("node:path");

function resolveOpenMode(input) {
  const readOnlyReason = getReadOnlyReason(input || {});
  const canEnterEditMode = canEmployeeEdit(input.employeeId, input.permissions || {});
  return {
    openMode: readOnlyReason ? "read-only" : "editable",
    sourceType: input.sourceType || "",
    sourcePath: input.sourcePath || "",
    canEditOriginal: !readOnlyReason,
    readOnlyReason,
    employeeId: input.employeeId || "",
    canEnterEditMode,
    editSession: {
      copyCreated: false,
      originalCourseDir: "",
      tempCourseDir: ""
    }
  };
}

function canEmployeeEdit(employeeId, permissions) {
  return Boolean(employeeId && Array.isArray(permissions.editors) && permissions.editors.includes(employeeId));
}

function assertEditable(openModeState, action) {
  if (openModeState && openModeState.openMode === "read-only") {
    throw new Error(`${action} is blocked in read-only mode`);
  }
}

async function createEditableCopy(coursePackage, tempRoot, employeeId) {
  const copyDir = path.join(tempRoot, `${sanitizeName(coursePackage.scenario.title || "course")}_${Date.now()}`);
  await fs.mkdir(copyDir, { recursive: true });
  await fs.writeFile(path.join(copyDir, "course-meta.json"), JSON.stringify(coursePackage.courseMeta || {}, null, 2), "utf8");
  await fs.writeFile(path.join(copyDir, "course.json"), JSON.stringify(coursePackage.scenario || {}, null, 2), "utf8");
  await fs.writeFile(path.join(copyDir, "shared-settings.json"), JSON.stringify(coursePackage.sharedSettings || {}, null, 2), "utf8");
  return {
    ...coursePackage,
    courseDir: copyDir,
    openMode: {
      openMode: "editable",
      sourceType: "editable-copy",
      sourcePath: copyDir,
      canEditOriginal: false,
      readOnlyReason: "",
      employeeId,
      canEnterEditMode: true,
      editSession: {
        copyCreated: true,
        originalCourseDir: coursePackage.courseDir,
        tempCourseDir: copyDir
      }
    }
  };
}

async function finalizeEditSession(editSession, decision) {
  if (decision === "cancel" && editSession && editSession.tempCourseDir) {
    await fs.rm(editSession.tempCourseDir, { recursive: true, force: true });
  }
  return { decision, editSession };
}

function getReadOnlyReason(input) {
  if (input.sourceType === "zip") return "zip-package";
  if (input.fileReadOnly) return "file-read-only";
  if (input.permissionDenied) return "folder-permission-denied";
  if (input.sourceType === "shared-library") return "shared-library";
  if (input.userSelectedReadOnly) return "user-selected";
  if (input.employeeId && input.permissions && !canEmployeeEdit(input.employeeId, input.permissions)) {
    return "employee-permission-denied";
  }
  return "";
}

function sanitizeName(value) {
  return String(value || "course").replace(/[\\/:*?"<>|]/g, "_").replace(/\s+/g, " ").trim();
}

module.exports = {
  assertEditable,
  canEmployeeEdit,
  createEditableCopy,
  finalizeEditSession,
  resolveOpenMode
};
