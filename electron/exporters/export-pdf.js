"use strict";

const PDFDocument = require("pdfkit");
const fs = require("node:fs");
const path = require("node:path");
const { buildPageModel } = require("./render-page");

function exportPdf(scenario, outputPath) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", layout: "landscape", margin: 28 });
    const stream = fs.createWriteStream(outputPath);
    doc.pipe(stream);

    for (const page of buildPageModel(scenario)) {
      if (page.pageNumber > 1) doc.addPage();
      doc.fontSize(18).fillColor("#172534").text(`${page.pageNumber}. ${page.title}`, 28, 24);
      doc.image(path.resolve(page.screenshotPath), 28, 62, { width: 520 });
      doc.lineWidth(3).strokeColor("#FFD84D").rect(28 + page.highlight.x / 2, 62 + page.highlight.y / 2, page.highlight.width / 2, page.highlight.height / 2).stroke();
      doc.fontSize(12).fillColor("#172534").text(page.body, 570, 62, { width: 230 });
      if (page.videoPath) {
        doc.fontSize(10).fillColor("#6B7885").text(`영상: ${page.videoPath}`, 570, 430, { width: 230 });
      }
    }

    doc.end();
    stream.on("finish", () => resolve(outputPath));
    stream.on("error", reject);
  });
}

module.exports = { exportPdf };
