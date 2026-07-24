const test = require("node:test");
const assert = require("node:assert/strict");
const { chooseMenuDisplay, createWindowOptions } = require("../electron/window-options");

const display = {
  workArea: { x: 0, y: 0 },
  workAreaSize: { width: 1920, height: 1040 }
};

test("createWindowOptions uses normal window mode on Windows", () => {
  const options = createWindowOptions(display, "win32");

  assert.equal(options.width, 1280);
  assert.equal(options.height, 800);
  assert.equal(options.x, 320);
  assert.equal(options.y, 120);
  assert.equal(options.frame, true);
  assert.equal(options.transparent, false);
  assert.equal(options.resizable, true);
  assert.equal(options.minimizable, true);
  assert.equal(options.maximizable, true);
  assert.equal(options.closable, true);
  assert.equal(options.alwaysOnTop, false);
  assert.equal(options.skipTaskbar, false);
  assert.equal(options.autoHideMenuBar, false);
});

test("createWindowOptions keeps overlay behavior on other platforms", () => {
  const options = createWindowOptions(display, "darwin");

  assert.equal(options.width, 1920);
  assert.equal(options.height, 1040);
  assert.equal(options.frame, false);
  assert.equal(options.transparent, true);
  assert.equal(options.resizable, false);
  assert.equal(options.alwaysOnTop, true);
  assert.equal(options.skipTaskbar, true);
});

test("chooseMenuDisplay prefers the external second monitor", () => {
  const primary = {
    id: 1,
    internal: true,
    workArea: { x: 0, y: 0 },
    workAreaSize: { width: 1440, height: 900 }
  };
  const secondary = {
    id: 2,
    internal: false,
    workArea: { x: 1440, y: 0 },
    workAreaSize: { width: 1920, height: 1040 }
  };

  assert.equal(chooseMenuDisplay([primary, secondary]), secondary);
});

test("createWindowOptions centers the Windows menu on monitor 2", () => {
  const options = createWindowOptions({
    workArea: { x: 1440, y: 0 },
    workAreaSize: { width: 1920, height: 1040 }
  }, "win32");

  assert.equal(options.width, 1280);
  assert.equal(options.height, 800);
  assert.equal(options.x, 1760);
  assert.equal(options.y, 120);
  assert.equal(options.title, "StudyFlow Control");
  assert.equal(options.frame, true);
  assert.equal(options.minimizable, true);
  assert.equal(options.maximizable, true);
  assert.equal(options.closable, true);
});
