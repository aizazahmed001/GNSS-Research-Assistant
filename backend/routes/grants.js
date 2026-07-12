const express = require("express");
const router = express.Router();
const db = require("../db");
const { requireAdmin } = require("../auth");

// ── CREATE ────────────────────────────────────────────────────────────────────
router.post("/", requireAdmin, (req, res) => {
  try {
    const {
      title, country, funding_agency, eligibility, deadline,
      required_documents, application_link, research_domain,
      funding_type, grant_category, description,
    } = req.body;

    if (!title || !country || !funding_agency) {
      return res.status(400).json({ error: "title, country, and funding_agency are required" });
    }

    const stmt = db.prepare(`
      INSERT INTO grants
        (title, country, funding_agency, eligibility, deadline, required_documents,
         application_link, research_domain, funding_type, grant_category, description)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      title, country, funding_agency,
      eligibility || null, deadline || null,
      required_documents || null, application_link || null,
      research_domain || null, funding_type || null,
      grant_category || null, description || null
    );

    res.status(201).json({ id: result.lastInsertRowid, message: "Grant created" });
  } catch (err) {
    console.error("Create grant error:", err.message);
    res.status(500).json({ error: "Failed to create grant" });
  }
});

// ── READ ALL (with optional filters) ─────────────────────────────────────────
router.get("/", (req, res) => {
  try {
    const { country, research_domain, funding_type, grant_category, search } = req.query;

    let query = "SELECT * FROM grants WHERE 1=1";
    const params = [];

    if (country) {
      query += " AND country = ?";
      params.push(country);
    }
    if (research_domain) {
      query += " AND research_domain = ?";
      params.push(research_domain);
    }
    if (funding_type) {
      query += " AND funding_type = ?";
      params.push(funding_type);
    }
    if (grant_category) {
      query += " AND grant_category = ?";
      params.push(grant_category);
    }
    if (search) {
      query += " AND (title LIKE ? OR description LIKE ? OR funding_agency LIKE ?)";
      params.push("%" + search + "%", "%" + search + "%", "%" + search + "%");
    }

    query += " ORDER BY deadline ASC";

    const grants = db.prepare(query).all(...params);
    res.json({ grants, total: grants.length });
  } catch (err) {
    console.error("Fetch grants error:", err.message);
    res.status(500).json({ error: "Failed to fetch grants" });
  }
});

// ── READ ONE ──────────────────────────────────────────────────────────────────
router.get("/:id", (req, res) => {
  try {
    const grant = db.prepare("SELECT * FROM grants WHERE id = ?").get(req.params.id);
    if (!grant) return res.status(404).json({ error: "Grant not found" });
    res.json({ grant });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── UPDATE ────────────────────────────────────────────────────────────────────
router.put("/:id", requireAdmin, (req, res) => {
  try {
    const existing = db.prepare("SELECT * FROM grants WHERE id = ?").get(req.params.id);
    if (!existing) return res.status(404).json({ error: "Grant not found" });

    const fields = {
      title:                req.body.title                ?? existing.title,
      country:              req.body.country              ?? existing.country,
      funding_agency:       req.body.funding_agency       ?? existing.funding_agency,
      eligibility:          req.body.eligibility          ?? existing.eligibility,
      deadline:             req.body.deadline             ?? existing.deadline,
      required_documents:   req.body.required_documents   ?? existing.required_documents,
      application_link:     req.body.application_link     ?? existing.application_link,
      research_domain:      req.body.research_domain      ?? existing.research_domain,
      funding_type:         req.body.funding_type         ?? existing.funding_type,
      grant_category:       req.body.grant_category       ?? existing.grant_category,
      description:          req.body.description          ?? existing.description,
    };

    db.prepare(`
      UPDATE grants
      SET title=?, country=?, funding_agency=?, eligibility=?, deadline=?,
          required_documents=?, application_link=?, research_domain=?,
          funding_type=?, grant_category=?, description=?
      WHERE id=?
    `).run(...Object.values(fields), req.params.id);

    res.json({ message: "Grant updated" });
  } catch (err) {
    console.error("Update grant error:", err.message);
    res.status(500).json({ error: "Failed to update grant" });
  }
});

// ── DELETE ────────────────────────────────────────────────────────────────────
router.delete("/:id", requireAdmin, (req, res) => {
  try {
    const result = db.prepare("DELETE FROM grants WHERE id = ?").run(req.params.id);
    if (result.changes === 0) return res.status(404).json({ error: "Grant not found" });
    res.json({ message: "Grant deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
