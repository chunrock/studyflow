"use strict";

const path = require("node:path");
const fs = require("node:fs/promises");
const { app, BrowserWindow, dialog, desktopCapturer, globalShortcut, ipcMain, screen } = require("electron");
const { exportDocx } = require("./exporters/export-docx");
const { exportPptx } = require("./exporters/export-pptx");
const { exportPdf } = require("./exporters/export-pdf");
const { scanCourseFolder } = require("./library-scan");
const { deleteLibrarySource, readLibraryStore, refreshLibraryItemStatus, writeLibraryStore } = require("./library-store");
const { deleteAutosave, findRecoverableAutosaves, restoreAutosave, writeAutosave } = require("./course-autosave");
const { appendChangeLog, readChangeLog } = require("./course-history");
const { loadClassificationSettings, saveClassificationSettings } = require("./classification-settings");
const { loadPermissionSettings, savePermissionSettings } = require("./permission-settings");
const { createEditableCopy, finalizeEditSession, resolveOpenMode } = require("./open-mode");
const { validatePackageIntegrity } = require("./package-integrity");
const { autoFixCourseMeta, getShareGate, validateCourseForShare } = require("./share-validation");

let overlayWindow;
let clickThrough = false;

function getLibraryStorePath() {
  return path.join(getDatabaseDir(), "library.json");
}

function getDatabaseDir() {
  return path.join(path.dirname(app.getPath("exe")), "database");
}

function getSampleCourseDir() {
  return path.join(__dirname, "..", "web", "data");
}

function createOverlayWindow() {
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.workAreaSize;

  overlayWindow = new BrowserWindow({
    width,
    height,
    x: primaryDisplay.workArea.x,
    y: primaryDisplay.workArea.y,
    frame: false,
    transparent: true,
    resizable: false,
    movable: false,
    fullscreenable: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    hasShadow: false,
    backgroundColor: "#00000000",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  overlayWindow.setAlwaysOnTop(true, "screen-saver");
  overlayWindow.loadFile(path.join(__dirname, "..", "web", "index.html"));
}

function setClickThrough(enabled) {
  clickThrough = Boolean(enabled);
  if (overlayWindow && !overlayWindow.isDestroyed()) {
    overlayWindow.setIgnoreMouseEvents(clickThrough, { forward: true });
    overlayWindow.webContents.send("shortcut", clickThrough ? "click-through-on" : "click-through-off");
  }
  return clickThrough;
}

function sendShortcut(action) {
  if (overlayWindow && !overlayWindow.isDestroyed()) {
    overlayWindow.webContents.send("shortcut", action);
  }
}

app.whenReady().then(() => {
  createOverlayWindow();

  globalShortcut.register("CommandOrControl+Alt+Right", () => sendShortcut("next"));
  globalShortcut.register("CommandOrControl+Alt+Left", () => sendShortcut("previous"));
  globalShortcut.register("CommandOrControl+Alt+H", () => {
    if (overlayWindow.isVisible()) {
      overlayWindow.hide();
    } else {
      overlayWindow.showInactive();
    }
  });
  globalShortcut.register("CommandOrControl+Alt+T", () => setClickThrough(!clickThrough));
});

ipcMain.handle("set-click-through", (_event, enabled) => setClickThrough(enabled));

ipcMain.handle("save-scenario", async (_event, scenario) => {
  const result = await dialog.showSaveDialog(overlayWindow, {
    title: "교육 시나리오 저장",
    defaultPath: `${scenario.id || "studyflow-course"}.json`,
    filters: [{ name: "StudyFlow Scenario", extensions: ["json"] }]
  });

  if (result.canceled || !result.filePath) {
    return { canceled: true };
  }

  await fs.writeFile(result.filePath, JSON.stringify(scenario, null, 2), "utf8");
  return { canceled: false, filePath: result.filePath };
});

ipcMain.handle("open-scenario", async () => {
  const result = await dialog.showOpenDialog(overlayWindow, {
    title: "교육 시나리오 열기",
    properties: ["openFile"],
    filters: [{ name: "StudyFlow Scenario", extensions: ["json"] }]
  });

  if (result.canceled || result.filePaths.length === 0) {
    return { canceled: true };
  }

  const text = await fs.readFile(result.filePaths[0], "utf8");
  return { canceled: false, scenario: JSON.parse(text) };
});

ipcMain.handle("scan-library-folder", async () => {
  const result = await dialog.showOpenDialog(overlayWindow, {
    title: "교육 자료 폴더 검색",
    properties: ["openDirectory"]
  });

  if (result.canceled || result.filePaths.length === 0) {
    return { canceled: true };
  }

  const items = await scanCourseFolder(result.filePaths[0], 3);
  return { canceled: false, folderPath: result.filePaths[0], items };
});

ipcMain.handle("read-library-store", async () => readLibraryStore(getLibraryStorePath()));

ipcMain.handle("write-library-store", async (_event, store) => writeLibraryStore(getLibraryStorePath(), store));

ipcMain.handle("refresh-library-status", async (_event, items) => refreshLibraryItemStatus(items));

ipcMain.handle("delete-library-source", async (_event, item) => {
  const result = await dialog.showMessageBox(overlayWindow, {
    type: "warning",
    buttons: ["삭제", "취소"],
    defaultId: 1,
    cancelId: 1,
    title: "교육 자료 파일 삭제",
    message: `"${item.title}" 자료 폴더를 실제로 삭제할까요?`,
    detail: item.sourcePath || ""
  });
  if (result.response !== 0) {
    return { canceled: true };
  }
  return { canceled: false, ...(await deleteLibrarySource(item.sourcePath)) };
});

ipcMain.handle("validate-share", async (_event, meta, scenario) => validateCourseForShare(meta, scenario));

ipcMain.handle("get-share-gate", async (_event, validationResult, warningsAccepted) => getShareGate(validationResult, warningsAccepted));

ipcMain.handle("autofix-share-meta", async (_event, meta, scenario) => autoFixCourseMeta(meta, scenario));

ipcMain.handle("get-current-course-dir", async () => getSampleCourseDir());

ipcMain.handle("write-autosave", async (_event, coursePackage, reason) => writeAutosave(coursePackage, reason));

ipcMain.handle("find-recoverable-autosaves", async (_event, courseDirs) => findRecoverableAutosaves(courseDirs));

ipcMain.handle("restore-autosave", async (_event, record) => restoreAutosave(record));

ipcMain.handle("delete-autosave", async (_event, courseDir) => {
  await deleteAutosave(courseDir);
});

ipcMain.handle("read-change-log", async (_event, courseDir) => readChangeLog(courseDir));

ipcMain.handle("append-change-log", async (_event, courseDir, entry) => appendChangeLog(courseDir, entry));

ipcMain.handle("load-classification-settings", async () => loadClassificationSettings(getDatabaseDir()));

ipcMain.handle("save-classification-settings", async (_event, settings) => saveClassificationSettings(getDatabaseDir(), settings));

ipcMain.handle("load-permission-settings", async () => loadPermissionSettings(getDatabaseDir()));

ipcMain.handle("save-permission-settings", async (_event, settings) => savePermissionSettings(getDatabaseDir(), settings));

ipcMain.handle("resolve-open-mode", async (_event, input) => resolveOpenMode(input));

ipcMain.handle("create-editable-copy", async (_event, coursePackage, employeeId) => (
  createEditableCopy(coursePackage, path.join(app.getPath("temp"), "studyflow-edit"), employeeId)
));

ipcMain.handle("finalize-edit-session", async (_event, editSession, decision) => finalizeEditSession(editSession, decision));

ipcMain.handle("validate-package-integrity", async (_event, input) => validatePackageIntegrity(input));

ipcMain.handle("capture-current-page", async (_event, stepId) => {
  const sources = await desktopCapturer.getSources({
    types: ["screen"],
    thumbnailSize: screen.getPrimaryDisplay().size
  });
  const source = sources[0];
  const assetsDir = path.join(__dirname, "..", "web", "data", "assets", "screenshots");
  await fs.mkdir(assetsDir, { recursive: true });
  const fileName = `${stepId || "step"}-${Date.now()}.png`;
  const filePath = path.join(assetsDir, fileName);
  await fs.writeFile(filePath, source.thumbnail.toPNG());
  return { screenshotPath: `web/data/assets/screenshots/${fileName}` };
});

ipcMain.handle("export-scenario", async (_event, format, scenario) => {
  const result = await dialog.showSaveDialog(overlayWindow, {
    title: "교육 교안 내보내기",
    defaultPath: `${scenario.id || "studyflow-course"}.${format}`,
    filters: [{ name: format.toUpperCase(), extensions: [format] }]
  });

  if (result.canceled || !result.filePath) {
    return { canceled: true };
  }

  if (format === "docx") await exportDocx(scenario, result.filePath);
  if (format === "pptx") await exportPptx(scenario, result.filePath);
  if (format === "pdf") await exportPdf(scenario, result.filePath);

  return { canceled: false, filePath: result.filePath };
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("will-quit", () => {
  globalShortcut.unregisterAll();
});
