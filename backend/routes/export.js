const express = require("express");
const router = express.Router();
const PDFDocument = require("pdfkit");
const { Document, Packer, Paragraph, TextRun, HeadingLevel } = require("docx");
const db = require("../db");

function getGrantsForExport(req) {
  const { ids } = req.query; // comma-separated ids, or omit for all
  if (ids) {
    const idList = ids.split(",").map(Number);
    const placeholders = idList.map(() => "?").join(",");
    return db.prepare(`SELECT * FROM grants WHERE id IN (${placeholders})`).all(...idList);
  }
  return db.prepare("SELECT * FROM grants ORDER BY deadline ASC").all();
}

// ── PDF export ────────────────────────────────────────────────────────────
router.get("/pdf", (req, res) => {
  try {
    const grants = getGrantsForExport(req);

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", "attachment; filename=grants-report.pdf");

    const doc = new PDFDocument({ margin: 50 });
    doc.pipe(res); // stream directly to the HTTP response

    doc.fontSize(20).text("Research Grants Report", { align: "center" });
    doc.moveDown();
    doc.fontSize(10).fillColor("#666").text(`Generated: ${new Date().toLocaleDateString()}`, { align: "center" });
    doc.moveDown(2);

    if (grants.length === 0) {
      doc.fontSize(12).fillColor("#000").text("No grants found.");
    }

    grants.forEach((g, i) => {
      doc.fontSize(14).fillColor("#000").text(`${i + 1}. ${g.title}`, { underline: true });
      doc.fontSize(10).fillColor("#333");
      doc.text(`Funding Agency: ${g.funding_agency}`);
      doc.text(`Country: ${g.country}`);
      doc.text(`Deadline: ${g.deadline || "Not specified"}`);
      doc.text(`Category: ${g.grant_category || "—"}   Type: ${g.funding_type || "—"}`);
      if (g.eligibility) doc.text(`Eligibility: ${g.eligibility}`);
      if (g.description) doc.text(`Description: ${g.description}`);
      if (g.application_link) doc.fillColor("#2f6fed").text(`Apply: ${g.application_link}`);
      doc.moveDown(1.5);
    });

    doc.end(); // finalizes the PDF and completes the stream
  } catch (err) {
    console.error("PDF export error:", err.message);
    res.status(500).json({ error: "Failed to generate PDF" });
  }
});

// ── Word (.docx) export ──────────────────────────────────────────────────
router.get("/docx", async (req, res) => {
  try {
    const grants = getGrantsForExport(req);

    const children = [
      new Paragraph({
        text: "Research Grants Report",
        heading: HeadingLevel.TITLE,
      }),
      new Paragraph({
        text: `Generated: ${new Date().toLocaleDateString()}`,
        spacing: { after: 400 },
      }),
    ];

    if (grants.length === 0) {
      children.push(new Paragraph({ text: "No grants found." }));
    }

    grants.forEach((g, i) => {
      children.push(
        new Paragraph({
          text: `${i + 1}. ${g.title}`,
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 300 },
        }),
        new Paragraph({ children: [new TextRun({ text: `Funding Agency: `, bold: true }), new TextRun(g.funding_agency || "—")] }),
        new Paragraph({ children: [new TextRun({ text: `Country: `, bold: true }), new TextRun(g.country || "—")] }),
        new Paragraph({ children: [new TextRun({ text: `Deadline: `, bold: true }), new TextRun(g.deadline || "Not specified")] }),
        new Paragraph({ children: [new TextRun({ text: `Category: `, bold: true }), new TextRun(g.grant_category || "—"), new TextRun("   "), new TextRun({ text: `Type: `, bold: true }), new TextRun(g.funding_type || "—")] }),
      );
      if (g.eligibility) {
        children.push(new Paragraph({ children: [new TextRun({ text: `Eligibility: `, bold: true }), new TextRun(g.eligibility)] }));
      }
      if (g.description) {
        children.push(new Paragraph({ children: [new TextRun({ text: `Description: `, bold: true }), new TextRun(g.description)] }));
      }
      if (g.application_link) {
        children.push(new Paragraph({ children: [new TextRun({ text: `Apply: `, bold: true }), new TextRun(g.application_link)] }));
      }
    });

    const doc = new Document({ sections: [{ children }] });
    const buffer = await Packer.toBuffer(doc);

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
    res.setHeader("Content-Disposition", "attachment; filename=grants-report.docx");
    res.send(buffer);
  } catch (err) {
    console.error("DOCX export error:", err.message);
    res.status(500).json({ error: "Failed to generate document" });
  }
});

module.exports = router;