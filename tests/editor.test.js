const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const context = {
  window: {
    StudyFlowGeometry: {
      clampRect(rect, bounds) {
        return {
          x: Math.max(0, Math.min(rect.x, bounds.width)),
          y: Math.max(0, Math.min(rect.y, bounds.height)),
          width: Math.max(1, Math.min(rect.width, bounds.width - Math.max(0, rect.x))),
          height: Math.max(1, Math.min(rect.height, bounds.height - Math.max(0, rect.y)))
        };
      }
    }
  }
};

vm.createContext(context);
vm.runInContext(
  fs.readFileSync(path.join(__dirname, "..", "web", "scripts", "editor.js"), "utf8"),
  context
);

test("rectFromDrag normalizes a drag selection regardless of direction", () => {
  const rect = context.window.StudyFlowEditor.rectFromDrag(
    { x: 420.4, y: 280.6 },
    { x: 120.2, y: 100.1 },
    { width: 800, height: 600 }
  );

  assert.deepEqual(rect, { x: 120, y: 100, width: 300, height: 181 });
});

test("rectFromDrag keeps selection inside the viewport", () => {
  const rect = context.window.StudyFlowEditor.rectFromDrag(
    { x: -20, y: 50 },
    { x: 900, y: 700 },
    { width: 800, height: 600 }
  );

  assert.deepEqual(rect, { x: 0, y: 50, width: 800, height: 550 });
});

test("createAnnotationFromRect creates numbered editable annotation data", () => {
  const annotation = context.window.StudyFlowEditor.createAnnotationFromRect(
    { x: 10, y: 20, width: 120, height: 60 },
    1
  );

  assert.equal(annotation.number, 2);
  assert.equal(annotation.title, "영역 2");
  assert.equal(annotation.body, "설명을 입력하세요.");
  assert.deepEqual(annotation.highlight, { x: 10, y: 20, width: 120, height: 60 });
});
