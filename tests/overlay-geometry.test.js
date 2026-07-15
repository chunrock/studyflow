const test = require("node:test");
const assert = require("node:assert/strict");
const { clampRect, getCalloutPosition, toCssRect } = require("../web/scripts/overlay-geometry");

test("clampRect keeps a highlight inside the screen", () => {
  const rect = clampRect(
    { x: -20, y: 10, width: 900, height: 700 },
    { width: 800, height: 600 }
  );

  assert.deepEqual(rect, { x: 0, y: 10, width: 800, height: 590 });
});

test("getCalloutPosition falls back when right side has no room", () => {
  const position = getCalloutPosition(
    { x: 680, y: 120, width: 100, height: 80 },
    "right",
    { width: 800, height: 600 }
  );

  assert.deepEqual(position, { left: 452, top: 120, placement: "left" });
});

test("toCssRect returns pixel strings", () => {
  assert.deepEqual(toCssRect({ x: 10, y: 20, width: 30, height: 40 }), {
    left: "10px",
    top: "20px",
    width: "30px",
    height: "40px"
  });
});
