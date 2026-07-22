"use strict";

const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("studyflow", {
  setClickThrough(enabled) {
    return ipcRenderer.invoke("set-click-through", Boolean(enabled));
  },
  saveScenario(scenario) {
    return ipcRenderer.invoke("save-scenario", scenario);
  },
  openScenario() {
    return ipcRenderer.invoke("open-scenario");
  },
  scanLibraryFolder() {
    return ipcRenderer.invoke("scan-library-folder");
  },
  readLibraryStore() {
    return ipcRenderer.invoke("read-library-store");
  },
  writeLibraryStore(store) {
    return ipcRenderer.invoke("write-library-store", store);
  },
  refreshLibraryStatus(items) {
    return ipcRenderer.invoke("refresh-library-status", items);
  },
  deleteLibrarySource(item) {
    return ipcRenderer.invoke("delete-library-source", item);
  },
  validateShare(meta, scenario) {
    return ipcRenderer.invoke("validate-share", meta, scenario);
  },
  getShareGate(validationResult, warningsAccepted) {
    return ipcRenderer.invoke("get-share-gate", validationResult, Boolean(warningsAccepted));
  },
  autofixShareMeta(meta, scenario) {
    return ipcRenderer.invoke("autofix-share-meta", meta, scenario);
  },
  getCurrentCourseDir() {
    return ipcRenderer.invoke("get-current-course-dir");
  },
  writeAutosave(coursePackage, reason) {
    return ipcRenderer.invoke("write-autosave", coursePackage, reason);
  },
  findRecoverableAutosaves(courseDirs) {
    return ipcRenderer.invoke("find-recoverable-autosaves", courseDirs);
  },
  restoreAutosave(record) {
    return ipcRenderer.invoke("restore-autosave", record);
  },
  deleteAutosave(courseDir) {
    return ipcRenderer.invoke("delete-autosave", courseDir);
  },
  readChangeLog(courseDir) {
    return ipcRenderer.invoke("read-change-log", courseDir);
  },
  appendChangeLog(courseDir, entry) {
    return ipcRenderer.invoke("append-change-log", courseDir, entry);
  },
  loadClassificationSettings() {
    return ipcRenderer.invoke("load-classification-settings");
  },
  saveClassificationSettings(settings) {
    return ipcRenderer.invoke("save-classification-settings", settings);
  },
  loadPermissionSettings() {
    return ipcRenderer.invoke("load-permission-settings");
  },
  savePermissionSettings(settings) {
    return ipcRenderer.invoke("save-permission-settings", settings);
  },
  resolveOpenMode(input) {
    return ipcRenderer.invoke("resolve-open-mode", input);
  },
  createEditableCopy(coursePackage, employeeId) {
    return ipcRenderer.invoke("create-editable-copy", coursePackage, employeeId);
  },
  finalizeEditSession(editSession, decision) {
    return ipcRenderer.invoke("finalize-edit-session", editSession, decision);
  },
  validatePackageIntegrity(input) {
    return ipcRenderer.invoke("validate-package-integrity", input);
  },
  captureCurrentPage(stepId) {
    return ipcRenderer.invoke("capture-current-page", stepId);
  },
  exportScenario(format, scenario) {
    return ipcRenderer.invoke("export-scenario", format, scenario);
  },
  onShortcut(callback) {
    const handler = (_event, action) => callback(action);
    ipcRenderer.on("shortcut", handler);
    return () => ipcRenderer.removeListener("shortcut", handler);
  }
});
