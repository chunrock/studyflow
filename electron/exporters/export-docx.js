"use strict";

const { Document, ImageRun, Packer, Paragraph, TextRun } = require("docx");
const fs = require("node:fs/promises");
const path = require("node:path");
const { buildPageModel } = require("./render-page");

async function exportDocx(scenario, outputPath) {
  const pages = buildPageModel(scenario);
  const children = [];

  for (const page of pages) {
    const imagePath = path.resolve(page.screenshotPath);
    const imageBuffer = await fs.readFile(imagePath);
    children.push(new Paragraph({ children: [new TextRun({ text: `${page.pageNumber}. ${page.title}`, bold: true, size: 28 })] }));
    children.push(new Paragraph({ children: [new ImageRun({ data: imageBuffer, transformation: { width: 640, height: 360 } })] }));
    children.push(new Paragraph({ children: [new TextRun({ text: page.body, size: 22 })] }));
    if (page.videoPath) {
      children.push(new Paragraph({ children: [new TextRun({ text: `영상: ${page.videoPath}`, size: 18 })] }));
    }
  }

  const doc = new Document({ sections: [{ children }] });
  const buffer = await Packer.toBuffer(doc);
  await fs.writeFile(outputPath, buffer);
  return outputPath;
}

module.exports = { exportDocx };
