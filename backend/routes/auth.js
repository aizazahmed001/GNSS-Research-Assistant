const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { OAuth2Client } = require("google-auth-library");
const { pool } = require("../db");

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

function issueToken(user) {
  return jwt.sign({ id: user.id, email: user.email, name: user.name }, process.env.JWT_SECRET, { expiresIn: "30d" });
}

function safeUser(user) {
  return { id: user.id, email: user.email, name: user.name, provider: user.provider };
}

router.post("/signup", async (req, res) => {
  try {
    const { email, password, name } = req.body;
    if (!email || !password) return res.status(400).json({ error: "Email and password are required" });

    const existing = await pool.query("SELECT id FROM users WHERE email = $1", [email]);
    if (existing.rows.length > 0) return res.status(409).json({ error: "An account with this email already exists" });

    const hash = await bcrypt.hash(password, 10);
    const result = await pool.query(
      "INSERT INTO users (email, password_hash, name, provider) VALUES ($1,$2,$3,'local') RETURNING *",
      [email, hash, name || email.split("@")[0]]
    );

    const user = result.rows[0];
    res.status(201).json({ token: issueToken(user), user: safeUser(user) });
  } catch (err) {
    console.error("Signup error:", err.message);
    res.status(500).json({ error: "Signup failed" });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const result = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
    const user = result.rows[0];

    if (!user || !user.password_hash) return res.status(401).json({ error: "Invalid email or password" });

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: "Invalid email or password" });

    res.json({ token: issueToken(user), user: safeUser(user) });
  } catch (err) {
    console.error("Login error:", err.message);
    res.status(500).json({ error: "Login failed" });
  }
});

router.post("/google", async (req, res) => {
  try {
    const { credential } = req.body;
    if (!credential) return res.status(400).json({ error: "Missing Google credential" });

    const ticket = await googleClient.verifyIdToken({ idToken: credential, audience: process.env.GOOGLE_CLIENT_ID });
    const payload = ticket.getPayload();

    let result = await pool.query("SELECT * FROM users WHERE google_id = $1 OR email = $2", [payload.sub, payload.email]);
    let user = result.rows[0];

    if (!user) {
      const insertResult = await pool.query(
        "INSERT INTO users (email, name, provider, google_id) VALUES ($1,$2,'google',$3) RETURNING *",
        [payload.email, payload.name, payload.sub]
      );
      user = insertResult.rows[0];
    }

    res.json({ token: issueToken(user), user: safeUser(user) });
  } catch (err) {
    console.error("Google auth error:", err.message);
    res.status(401).json({ error: "Google authentication failed" });
  }
});

function requireUser(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) return res.status(401).json({ error: "Not authenticated" });
  try {
    req.user = jwt.verify(authHeader.replace("Bearer ", ""), process.env.JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired session" });
  }
}

router.get("/me", requireUser, (req, res) => res.json({ user: req.user }));

module.exports = { router, requireUser };