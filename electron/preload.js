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
  autofixShareMeta(meta, scenario) {
    return ipcRenderer.invoke("autofix-share-meta", meta, scenario);
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
