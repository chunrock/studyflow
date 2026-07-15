"use strict";

const path = require("node:path");
const { app, BrowserWindow, globalShortcut, ipcMain, screen } = require("electron");

let overlayWindow;
let clickThrough = false;

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

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("will-quit", () => {
  globalShortcut.unregisterAll();
});
