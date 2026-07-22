const test = require("node:test");
const assert = require("node:assert/strict");
const { createWindowOptions } = require("../electron/window-options");

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
  assert.equal(options.alwaysOnTop, false);
  assert.equal(options.skipTaskbar, false);
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
