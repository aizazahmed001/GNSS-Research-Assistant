const express = require("express");
const router = express.Router();
const { pool } = require("../db");


module.exports = function (genAI) {
  const extractionModel = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
  const answerModel = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

  router.post("/", async (req, res) => {
    try {
      const { message } = req.body;
      if (!message) return res.status(400).json({ error: "message is required" });

      const extractionPrompt = `Extract search parameters from this research-paper question. Respond with ONLY valid JSON, no markdown, matching this exact shape (null for anything not mentioned):

{
  "author": string or null,
  "location": string or null,
  "topic": string or null,
  "keyword": string or null,
  "year": number or null
}

Question: "${message}"`;

      const extraction = await extractionModel.generateContent(extractionPrompt);
      let rawJson = extraction.response.text().trim();
      rawJson = rawJson.replace(/^```json\s*/i, "").replace(/```$/, "").trim();

      let filters;
      try {
        filters = JSON.parse(rawJson);
      } catch {
        filters = {};
      }

      let query = "SELECT * FROM papers WHERE 1=1";
      const params = [];
      let i = 1;

      if (filters.author) {
        query += ` AND EXISTS (SELECT 1 FROM unnest(authors) a WHERE a ILIKE $${i++})`;
        params.push(`%${filters.author}%`);
      }
      if (filters.location) {
        query += ` AND location ILIKE $${i++}`;
        params.push(`%${filters.location}%`);
      }
      if (filters.topic) {
        query += ` AND main_topic ILIKE $${i++}`;
        params.push(`%${filters.topic}%`);
      }
      if (filters.year) {
        query += ` AND year = $${i++}`;
        params.push(filters.year);
      }
      if (filters.keyword) {
        query += ` AND (title ILIKE $${i} OR abstract ILIKE $${i} OR $${i + 1} = ANY(keywords))`;
        params.push(`%${filters.keyword}%`, filters.keyword);
        i += 2;
      }

      query += " ORDER BY year DESC LIMIT 5";

      const paperResult = await pool.query(query, params);
      const papers = paperResult.rows;

      if (papers.length === 0) {
        return res.json({
          reply: "I couldn't find any papers matching that. Try a different author, location, topic, or keyword.",
          filters,
          papers: [],
        });
      }

      const paperIds = papers.map((p) => p.paper_id);
      const findingsResult = await pool.query(
        `SELECT * FROM key_findings WHERE paper_id = ANY($1)`,
        [paperIds]
      );
      const findings = findingsResult.rows;

      const papersSummary = papers
        .map((p) => {
          const paperFindings = findings
            .filter((f) => f.paper_id === p.paper_id)
            .map((f) => `  - [${f.category}] ${f.description}${f.value ? ` (${f.value})` : ""}`)
            .join("\n");
          return `**${p.title}** (${p.authors?.join(", ") || "Unknown authors"}, ${p.year || "n.d."}, ${p.journal || "Unknown journal"})
Location: ${p.location || "N/A"}${p.magnitude ? ` | Magnitude: ${p.magnitude}` : ""}
Abstract: ${p.abstract || "N/A"}
Key findings:\n${paperFindings || "  (none recorded)"}`;
        })
        .join("\n\n---\n\n");

        const formulasSummary = formulas
       .map((f) => `- [${f.id}] ${f.name}: ${f.latex} — ${f.description}`)
        .join("\n");

        const caseStudiesSummary = caseStudies
      .map((c) => `- ${c.region} Mw${c.magnitude_mw} (${c.date}): prep zone ${c.prep_zone_km}km, lead time ${c.lead_time_days}`)
      .join("\n");

      const referencesSummary = references
      .map((r) => `- [${r.ref_num}] ${r.citation}`)
      .join("\n");


      // Also pull relevant math formulas, case studies, and references —
// broad match since these are thesis-specific reference data, not filtered like papers
const formulasResult = await pool.query(`SELECT * FROM math_formulas LIMIT 15`);
const caseStudiesResult = await pool.query(`SELECT * FROM thesis_case_studies LIMIT 15`);
const referencesResult = await pool.query(`SELECT * FROM academic_references LIMIT 15`);

const formulas = formulasResult.rows;
const caseStudies = caseStudiesResult.rows;
const references = referencesResult.rows;


      const answerPrompt = `You are a research assistant answering questions about a set of academic papers on GNSS, ionosphere, and earthquake precursor research. A user asked: "${message}"

MATCHING PAPERS:
${papersSummary}

RELEVANT FORMULAS (reference only when directly relevant to the question):
${formulasSummary}

EARTHQUAKE CASE STUDY DATA (reference only when directly relevant):
${caseStudiesSummary}

ACADEMIC REFERENCES (cite by [number] when relevant):
${referencesSummary}

Answer using ONLY the information above. Cite specific values, authors, papers, formulas, or case studies by name/number. Use markdown formatting, including LaTeX-style notation for formulas where relevant. If the question asks to compare papers or case studies, do so directly using the actual data listed.`;

      const answer = await answerModel.generateContent(answerPrompt);

      res.json({ reply: answer.response.text(), filters, papers });
    } catch (err) {
      console.error("Papers bot error:", err.message);
      res.status(500).json({ error: "Something went wrong" });
    }
  });

  return router;
};