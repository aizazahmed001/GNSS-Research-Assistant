require("dotenv").config();
const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function initDb() {
  await pool.query(`CREATE EXTENSION IF NOT EXISTS vector;`);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS grants (
      id SERIAL PRIMARY KEY,
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
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT,
      name TEXT,
      provider TEXT NOT NULL DEFAULT 'local',
      google_id TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS chat_sessions (
      id TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id),
      title TEXT NOT NULL DEFAULT 'New conversation',
      messages TEXT NOT NULL DEFAULT '[]',
      mode TEXT DEFAULT 'chat',
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS documents (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      chunk_count INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS document_chunks (
      id SERIAL PRIMARY KEY,
      document_id INTEGER NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
      document_name TEXT NOT NULL,
      chunk_text TEXT NOT NULL,
      embedding vector(768)
    );
  `);

  console.log("Database tables ready.");
}

module.exports = { pool, initDb };