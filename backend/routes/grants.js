const express = require("express");
const router = express.Router();
const { pool } = require("../db");
const { requireAdmin } = require("../auth");

router.post("/", requireAdmin, async (req, res) => {
  try {
    const {
      title, country, funding_agency, eligibility, deadline,
      required_documents, application_link, research_domain,
      funding_type, grant_category, description,
    } = req.body;

    if (!title || !country || !funding_agency) {
      return res.status(400).json({ error: "title, country, and funding_agency are required" });
    }

    const result = await pool.query(
      `INSERT INTO grants
        (title, country, funding_agency, eligibility, deadline, required_documents,
         application_link, research_domain, funding_type, grant_category, description)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       RETURNING id`,
      [title, country, funding_agency, eligibility || null, deadline || null,
       required_documents || null, application_link || null, research_domain || null,
       funding_type || null, grant_category || null, description || null]
    );

    res.status(201).json({ id: result.rows[0].id, message: "Grant created" });
  } catch (err) {
    console.error("Create grant error:", err.message);
    res.status(500).json({ error: "Failed to create grant" });
  }
});

router.get("/", async (req, res) => {
  try {
    const { country, research_domain, funding_type, grant_category, search } = req.query;
    let query = "SELECT * FROM grants WHERE 1=1";
    const params = [];
    let i = 1;

    if (country) { query += ` AND country = $${i++}`; params.push(country); }
    if (research_domain) { query += ` AND research_domain = $${i++}`; params.push(research_domain); }
    if (funding_type) { query += ` AND funding_type = $${i++}`; params.push(funding_type); }
    if (grant_category) { query += ` AND grant_category = $${i++}`; params.push(grant_category); }
    if (search) {
      query += ` AND (title ILIKE $${i} OR description ILIKE $${i})`;
      params.push(`%${search}%`);
      i++;
    }
    query += " ORDER BY deadline ASC";

    const result = await pool.query(query, params);
    res.json({ grants: result.rows, total: result.rows.length });
  } catch (err) {
    console.error("Fetch grants error:", err.message);
    res.status(500).json({ error: "Failed to fetch grants" });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM grants WHERE id = $1", [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: "Grant not found" });
    res.json({ grant: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put("/:id", requireAdmin, async (req, res) => {
  try {
    const existingResult = await pool.query("SELECT * FROM grants WHERE id = $1", [req.params.id]);
    if (existingResult.rows.length === 0) return res.status(404).json({ error: "Grant not found" });
    const existing = existingResult.rows[0];

    const fields = {
      title: req.body.title ?? existing.title,
      country: req.body.country ?? existing.country,
      funding_agency: req.body.funding_agency ?? existing.funding_agency,
      eligibility: req.body.eligibility ?? existing.eligibility,
      deadline: req.body.deadline ?? existing.deadline,
      required_documents: req.body.required_documents ?? existing.required_documents,
      application_link: req.body.application_link ?? existing.application_link,
      research_domain: req.body.research_domain ?? existing.research_domain,
      funding_type: req.body.funding_type ?? existing.funding_type,
      grant_category: req.body.grant_category ?? existing.grant_category,
      description: req.body.description ?? existing.description,
    };

    await pool.query(
      `UPDATE grants SET title=$1, country=$2, funding_agency=$3, eligibility=$4, deadline=$5,
        required_documents=$6, application_link=$7, research_domain=$8, funding_type=$9,
        grant_category=$10, description=$11 WHERE id=$12`,
      [...Object.values(fields), req.params.id]
    );

    res.json({ message: "Grant updated" });
  } catch (err) {
    console.error("Update grant error:", err.message);
    res.status(500).json({ error: "Failed to update grant" });
  }
});

router.delete("/:id", requireAdmin, async (req, res) => {
  try {
    const result = await pool.query("DELETE FROM grants WHERE id = $1", [req.params.id]);
    if (result.rowCount === 0) return res.status(404).json({ error: "Grant not found" });
    res.json({ message: "Grant deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;