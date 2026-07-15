const test = require("node:test");
const assert = require("node:assert/strict");
const { createOverlayState } = require("../web/scripts/overlay-state");

const scenario = {
  id: "sample",
  title: "교육",
  targetApp: "업무 프로그램",
  currentStepIndex: 0,
  steps: [
    { id: "a", title: "A", body: "A body", clickThrough: true, highlight: { x: 0, y: 0, width: 10, height: 10 }, callout: { placement: "right" }, accent: "guide" },
    { id: "b", title: "B", body: "B body", clickThrough: false, highlight: { x: 10, y: 10, width: 10, height: 10 }, callout: { placement: "right" }, accent: "warning" }
  ]
};

test("state advances and stops at the last step", () => {
  const state = createOverlayState(scenario);

  assert.equal(state.getCurrentStep().id, "a");
  assert.equal(state.next().id, "b");
  assert.equal(state.next().id, "b");
  assert.equal(state.snapshot().currentStepIndex, 1);
});

test("state goes back and stops at the first step", () => {
  const state = createOverlayState(scenario);

  state.next();
  assert.equal(state.previous().id, "a");
  assert.equal(state.previous().id, "a");
  assert.equal(state.snapshot().currentStepIndex, 0);
});

test("state can jump directly to a step", () => {
  const state = createOverlayState(scenario);

  assert.equal(state.goTo(1).id, "b");
  assert.equal(state.snapshot().currentStepIndex, 1);
  assert.equal(state.goTo(99).id, "b");
  assert.equal(state.goTo(-1).id, "a");
});

test("click-through can be overridden during training", () => {
  const state = createOverlayState(scenario);

  assert.equal(state.snapshot().clickThrough, true);
  assert.equal(state.setClickThrough(false), false);
  assert.equal(state.snapshot().clickThrough, false);
});
