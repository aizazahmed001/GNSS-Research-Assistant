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

      const answerPrompt = `You are a research assistant answering questions about a set of academic papers on GNSS, ionosphere, and earthquake precursor research. A user asked: "${message}"

Here is the matching paper data from the database:
${papersSummary}

Answer using ONLY the information above. Cite specific values, authors, and papers by name. Use markdown formatting. If the question asks to compare papers, do so directly using the actual findings listed.`;

      const answer = await answerModel.generateContent(answerPrompt);

      res.json({ reply: answer.response.text(), filters, papers });
    } catch (err) {
      console.error("Papers bot error:", err.message);
      res.status(500).json({ error: "Something went wrong" });
    }
  });

  return router;
};