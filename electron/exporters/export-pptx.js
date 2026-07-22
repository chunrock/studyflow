"use strict";

const pptxgen = require("pptxgenjs");
const path = require("node:path");
const { buildPageModel, getAccentColor } = require("./render-page");

async function exportPptx(scenario, outputPath) {
  const pptx = new pptxgen();
  pptx.layout = "LAYOUT_WIDE";

  for (const page of buildPageModel(scenario)) {
    const slide = pptx.addSlide();
    slide.background = { color: "F7FBFE" };
    slide.addText(`${page.pageNumber}. ${page.title}`, { x: 0.35, y: 0.2, w: 12.6, h: 0.35, bold: true, fontFace: "Noto Sans KR", fontSize: 18, color: "172534" });
    slide.addImage({ path: path.resolve(page.screenshotPath), x: 0.35, y: 0.7, w: 8.6, h: 4.85 });
    slide.addShape(pptx.ShapeType.rect, { x: 0.35 + page.highlight.x / 150, y: 0.7 + page.highlight.y / 150, w: page.highlight.width / 150, h: page.highlight.height / 150, line: { color: getAccentColor(page.accent), width: 3 }, fill: { color: getAccentColor(page.accent), transparency: 85 } });
    slide.addText(page.body, { x: 9.25, y: 0.7, w: 3.6, h: 4.25, fontFace: "Noto Sans KR", fontSize: 13, color: "172534", valign: "top", fit: "shrink" });
    if (page.videoPath) {
      slide.addText(`영상: ${page.videoPath}`, { x: 9.25, y: 5.05, w: 3.6, h: 0.35, fontFace: "Noto Sans KR", fontSize: 10, color: "6B7885" });
    }
  }

  await pptx.writeFile({ fileName: outputPath });
  return outputPath;
}

module.exports = { exportPptx };
