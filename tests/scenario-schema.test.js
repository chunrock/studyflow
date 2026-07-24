const test = require("node:test");
const assert = require("node:assert/strict");
const { normalizeScenario, validateScenario } = require("../web/scripts/scenario-schema");

test("valid scenario is normalized with a selected first step", () => {
  const scenario = normalizeScenario({
    id: "sample",
    title: "접수 프로그램 교육",
    targetApp: "Reception.exe",
    steps: [
      {
        id: "step-1",
        title: "접수 메뉴 확인",
        body: "좌측 상단의 접수 메뉴를 클릭합니다.",
        screenshotPath: "web/data/assets/screenshots/step-1.png",
        screenshotSize: { width: 1920, height: 1080 },
        highlightPx: { x: 100, y: 120, width: 240, height: 80 },
        highlightRatio: { x: 0.0521, y: 0.1111, width: 0.125, height: 0.0741 },
        callout: { placement: "right" }
      }
    ]
  });

  assert.equal(scenario.currentStepIndex, 0);
  assert.equal(scenario.steps[0].accent, "guide");
  assert.equal(scenario.steps[0].clickThrough, true);
  assert.equal(scenario.steps[0].screenshotPath, "web/data/assets/screenshots/step-1.png");
  assert.deepEqual(scenario.steps[0].highlight, { x: 100, y: 120, width: 240, height: 80 });
  assert.deepEqual(scenario.steps[0].highlightPx, { x: 100, y: 120, width: 240, height: 80 });
});

test("invalid scenario reports exact missing fields", () => {
  const result = validateScenario({ id: "broken", steps: [] });

  assert.equal(result.ok, false);
  assert.deepEqual(result.errors, [
    "title must be a non-empty string",
    "targetApp must be a non-empty string",
    "steps must contain at least one step"
  ]);
});

test("normalizeScenario preserves multiple step annotations", () => {
  const scenario = normalizeScenario({
    id: "sample",
    title: "접수 프로그램 교육",
    targetApp: "Reception.exe",
    steps: [
      {
        id: "step-1",
        title: "접수 메뉴 확인",
        body: "좌측 상단의 접수 메뉴를 클릭합니다.",
        screenshotPath: "web/data/assets/screenshots/step-1.png",
        screenshotSize: { width: 1920, height: 1080 },
        highlightPx: { x: 100, y: 120, width: 240, height: 80 },
        highlightRatio: { x: 0.0521, y: 0.1111, width: 0.125, height: 0.0741 },
        annotations: [
          {
            title: "마우스 클릭",
            body: "날짜 확인 및 전표 구분 확인",
            highlight: { x: 40, y: 60, width: 280, height: 70 },
            callout: { placement: "right" }
          },
          {
            title: "계정과목 입력",
            body: "확인 및 기타",
            highlight: { x: 80, y: 360, width: 220, height: 60 }
          }
        ]
      }
    ]
  });

  assert.equal(scenario.steps[0].annotations.length, 2);
  assert.equal(scenario.steps[0].annotations[0].number, 1);
  assert.equal(scenario.steps[0].annotations[1].title, "계정과목 입력");
  assert.deepEqual(scenario.steps[0].annotations[1].highlight, { x: 80, y: 360, width: 220, height: 60 });
});
