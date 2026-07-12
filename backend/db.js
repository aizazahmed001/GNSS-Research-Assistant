const fs = require("fs");
const path = require("path");
const Database = require("better-sqlite3");

// Ensure data/ folder exists before opening the DB file
const dataDir = path.join(__dirname, "data");
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const db = new Database(path.join(dataDir, "grants.db"));

db.exec(`
  CREATE TABLE IF NOT EXISTS grants (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    country TEXT NOT NULL,
    funding_agency TEXT NOT NULL,
    eligibility TEXT,
    deadline TEXT,
    required_documents TEXT,
    application_link TEXT,
    research_domain TEXT,
    funding_type TEXT,
    grant_category TEXT,
    description TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  )
`);

module.exports = db;
