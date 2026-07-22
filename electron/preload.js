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
  onShortcut(callback) {
    const handler = (_event, action) => callback(action);
    ipcRenderer.on("shortcut", handler);
    return () => ipcRenderer.removeListener("shortcut", handler);
  }
});
