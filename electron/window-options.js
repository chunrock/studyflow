"use strict";

const DEFAULT_WINDOW_WIDTH = 1280;
const DEFAULT_WINDOW_HEIGHT = 800;
const WINDOW_MARGIN = 80;

function chooseMenuDisplay(displays) {
  const availableDisplays = Array.isArray(displays) && displays.length > 0 ? displays : [];
  if (availableDisplays.length < 2) {
    return availableDisplays[0] || null;
  }
  return availableDisplays.find((display) => !display.internal) || availableDisplays[1];
}

function createWindowOptions(display, platform) {
  const workArea = display.workArea;
  const workAreaSize = display.workAreaSize;

  if (platform === "win32") {
    const width = Math.min(DEFAULT_WINDOW_WIDTH, Math.max(900, workAreaSize.width - WINDOW_MARGIN));
    const height = Math.min(DEFAULT_WINDOW_HEIGHT, Math.max(640, workAreaSize.height - WINDOW_MARGIN));
    return {
      width,
      height,
      x: Math.round(workArea.x + (workAreaSize.width - width) / 2),
      y: Math.round(workArea.y + (workAreaSize.height - height) / 2),
      frame: true,
      transparent: false,
      resizable: true,
      movable: true,
      fullscreenable: true,
      alwaysOnTop: false,
      skipTaskbar: false,
      hasShadow: true,
      backgroundColor: "#F5F7FA"
    };
  }

  return {
    width: workAreaSize.width,
    height: workAreaSize.height,
    x: workArea.x,
    y: workArea.y,
    frame: false,
    transparent: true,
    resizable: false,
    movable: false,
    fullscreenable: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    hasShadow: false,
    backgroundColor: "#00000000"
  };
}

module.exports = {
  chooseMenuDisplay,
  createWindowOptions
};
