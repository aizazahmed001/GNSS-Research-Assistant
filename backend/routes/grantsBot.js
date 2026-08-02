const express = require("express");
const router = express.Router();
const { pool } = require("../db");

const learnedRegionAliases = new Map();
const learnedKeywordAliases = new Map();

function normalizeText(value = "") {
  return value.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}

function rememberFromSearch(message, grants) {
  const cleanMessage = normalizeText(message);
  const keywordMatches = {
    scholorship: "scholarship",
    scholorships: "scholarships",
    scholar: "scholarship",
    phd: "phd",
    fellowship: "fellowship",
  };

  for (const [bad, good] of Object.entries(keywordMatches)) {
    if (cleanMessage.includes(bad)) {
      learnedKeywordAliases.set(bad, good);
    }
  }

  const regionAliases = [
    ["europe", ["europe", "european union", "eu", "european commission", "esa"]],
    ["eu", ["europe", "european union", "eu", "european commission", "esa"]],
  ];

  for (const [meaning, aliases] of regionAliases) {
    if (cleanMessage.includes(meaning)) {
      learnedRegionAliases.set(meaning, aliases);
    }
  }

  for (const grant of grants) {
    const countryNorm = normalizeText(grant.country);
    if (!countryNorm) continue;
    if (cleanMessage.includes("europe") && /europe|union|esa/.test(countryNorm)) {
      learnedRegionAliases.set("europe", ["europe", "european union", "eu", "european commission", "esa"]);
    }
  }
}

function expandCountryFilters(country, learned = new Map()) {
  if (!country) return [];
  const normalizedCountry = normalizeText(country);
  const regionSet = new Set([normalizedCountry]);
  const aliases = learned.get(normalizedCountry) || [];
  aliases.forEach((value) => regionSet.add(normalizeText(value)));

  if (normalizedCountry.includes("europe")) {
    ["europe", "european union", "eu", "european commission", "esa"].forEach((value) => regionSet.add(value));
  }

  return [...regionSet];
}

function inferKeywordVariants(keyword = "") {
  const clean = normalizeText(keyword);
  const variants = new Set([clean]);
  const alias = learnedKeywordAliases.get(clean);
  if (alias) variants.add(alias);

  if (clean.includes("scholarship")) {
    variants.add("scholarship");
    variants.add("scholarships");
  }

  if (clean.includes("scholorship")) {
    variants.add("scholarship");
    variants.add("scholarships");
  }

  return [...variants].filter(Boolean);
}

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
      function buildGrantQuery(candidateFilters) {
        let query = "SELECT * FROM grants WHERE 1=1";
        const params = [];
        let i = 1;

        if (candidateFilters.country) {
          const countryAliases = expandCountryFilters(candidateFilters.country, learnedRegionAliases);
          const clauses = countryAliases.map((countryValue) => `country ILIKE $${i++}`);
          query += ` AND (${clauses.join(" OR ")})`;
          countryAliases.forEach((countryValue) => params.push(`%${countryValue}%`));
        }
        if (candidateFilters.research_domain) {
          query += ` AND research_domain ILIKE $${i++}`;
          params.push(`%${candidateFilters.research_domain}%`);
        }
        if (candidateFilters.funding_type) {
          query += ` AND funding_type ILIKE $${i++}`;
          params.push(`%${candidateFilters.funding_type}%`);
        }
        if (candidateFilters.grant_category) {
          query += ` AND grant_category ILIKE $${i++}`;
          params.push(`%${candidateFilters.grant_category}%`);
        }
        if (candidateFilters.keyword) {
          const keywordVariants = inferKeywordVariants(candidateFilters.keyword);
          const keywordClauses = [];

          keywordVariants.forEach((variant) => {
            keywordClauses.push(`(title ILIKE $${i} OR description ILIKE $${i})`);
            params.push(`%${variant}%`);
            i++;
          });

          query += ` AND (${keywordClauses.join(" OR ")})`;
        }
        if (candidateFilters.deadline_before) {
          query += ` AND deadline <= $${i++}`;
          params.push(candidateFilters.deadline_before);
        }

        query += " ORDER BY deadline ASC LIMIT 8";
        return { query, params };
      }

      const baseCandidate = {
        ...filters,
        keyword: filters.keyword || (message.toLowerCase().includes("scholar") ? "scholarship" : null),
      };

      const searchCandidates = [
        baseCandidate,
        { ...baseCandidate, country: null },
        { ...baseCandidate, keyword: null },
        { ...baseCandidate, deadline_before: null },
        { ...baseCandidate, funding_type: null },
        { ...baseCandidate, research_domain: null },
        { ...baseCandidate, grant_category: null },
        { ...baseCandidate, keyword: "gnss" },
        { ...baseCandidate, country: "europe", keyword: "gnss" },
        { ...baseCandidate, country: "europe", keyword: null },
        { ...baseCandidate, country: "European Union", keyword: null },
        { ...baseCandidate, country: "European Union", keyword: "GNSS" },
      ];

      let grants = [];
      for (const candidate of searchCandidates) {
        const { query, params } = buildGrantQuery(candidate);
        const result = await pool.query(query, params);
        if (result.rows.length > 0) {
          grants = result.rows;
          rememberFromSearch(message, grants);
          break;
        }
      }

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