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

      // ── Step 1: extract structured filters from natural language ──────────
      const extractionPrompt = `Extract search filters from this grant-related question. Respond with ONLY valid JSON, no markdown, no explanation, matching exactly this shape (use null for any field not mentioned):

{
  "country": string or null,
  "research_domain": string or null,
  "funding_type": string or null,
  "grant_category": string or null,
  "keyword": string or null,
  "deadline_before": "YYYY-MM-DD" or null
}

Today's date is ${new Date().toISOString().split("T")[0]}. If the user says "this year", "closing soon", etc., convert it to an actual date.

Question: "${message}"`;

      const extraction = await extractionModel.generateContent(extractionPrompt);
      let rawJson = extraction.response.text().trim();

      // Strip markdown code fences if the model added them despite instructions
      rawJson = rawJson.replace(/^```json\s*/i, "").replace(/```$/, "").trim();

      let filters;
      try {
        filters = JSON.parse(rawJson);
      } catch (parseErr) {
        console.error("Failed to parse extracted filters:", rawJson);
        filters = {};
      }

      // ── Step 2: run the extracted filters through real SQL (Postgres) ─────
      let query = "SELECT * FROM grants WHERE 1=1";
      const params = [];
      let i = 1;

      if (filters.country) {
        query += ` AND country ILIKE $${i++}`;
        params.push(`%${filters.country}%`);
      }
      if (filters.research_domain) {
        query += ` AND research_domain ILIKE $${i++}`;
        params.push(`%${filters.research_domain}%`);
      }
      if (filters.funding_type) {
        query += ` AND funding_type ILIKE $${i++}`;
        params.push(`%${filters.funding_type}%`);
      }
      if (filters.grant_category) {
        query += ` AND grant_category ILIKE $${i++}`;
        params.push(`%${filters.grant_category}%`);
      }
      if (filters.keyword) {
        query += ` AND (title ILIKE $${i} OR description ILIKE $${i})`;
        params.push(`%${filters.keyword}%`);
        i++;
      }
      if (filters.deadline_before) {
        query += ` AND deadline <= $${i++}`;
        params.push(filters.deadline_before);
      }

      query += " ORDER BY deadline ASC LIMIT 8";

      const result = await pool.query(query, params);
      const grants = result.rows;

      // ── Step 3: phrase a natural answer using the real results ────────────
      if (grants.length === 0) {
        return res.json({
          reply: "I couldn't find any grants matching that. Try broadening your search — a different country, domain, or removing the deadline constraint.",
          filters,
          grants: [],
        });
      }

      const grantsSummary = grants
        .map(
          (g) =>
            `- ${g.title} | ${g.funding_agency} | ${g.country} | Deadline: ${g.deadline} | ${g.description}`
        )
        .join("\n");

      const answerPrompt = `You are a research grants assistant. A user asked: "${message}"

Here are the matching grants from the database:
${grantsSummary}

Write a natural, helpful response summarizing these options. Use markdown: bold the grant titles, mention deadlines clearly, keep it concise. Only use the grants listed above — do not invent any.`;

      const answer = await answerModel.generateContent(answerPrompt);

      res.json({
        reply: answer.response.text(),
        filters,
        grants,
      });
    } catch (err) {
      console.error("Grants bot error:", err.message);
      res.status(500).json({ error: "Something went wrong" });
    }
  });

  return router;
};