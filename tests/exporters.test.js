const test = require("node:test");
const assert = require("node:assert/strict");
const { buildPageModel } = require("../electron/exporters/render-page");

test("buildPageModel turns scenario steps into page records", () => {
  const pages = buildPageModel({
    title: "접수 교육",
    steps: [
      {
        id: "step-1",
        title: "메뉴 확인",
        body: "접수 메뉴를 확인합니다.",
        screenshotPath: "web/data/assets/screenshots/step-1.png",
        videoPath: "videos/demo.mp4",
        accent: "focus",
        highlight: { x: 100, y: 120, width: 240, height: 80 },
        callout: { placement: "right" }
      }
    ]
  });

  assert.deepEqual(pages, [
    {
      pageNumber: 1,
      title: "메뉴 확인",
      body: "접수 메뉴를 확인합니다.",
      screenshotPath: "web/data/assets/screenshots/step-1.png",
      videoPath: "videos/demo.mp4",
      accent: "focus",
      highlight: { x: 100, y: 120, width: 240, height: 80 },
      callout: { placement: "right" }
    }
  ]);
});
