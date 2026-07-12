const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { OAuth2Client } = require("google-auth-library");
const db = require("../db");

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

function issueToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, name: user.name },
    process.env.JWT_SECRET,
    { expiresIn: "30d" }
  );
}

function safeUser(user) {
  return { id: user.id, email: user.email, name: user.name, provider: user.provider };
}

// ── Signup (email/password) ────────────────────────────────────────────────
router.post("/signup", async (req, res) => {
  try {
    const { email, password, name } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const existing = db.prepare("SELECT id FROM users WHERE email = ?").get(email);
    if (existing) return res.status(409).json({ error: "An account with this email already exists" });

    const hash = await bcrypt.hash(password, 10);
    const result = db
      .prepare("INSERT INTO users (email, password_hash, name, provider) VALUES (?, ?, ?, 'local')")
      .run(email, hash, name || email.split("@")[0]);

    const user = db.prepare("SELECT * FROM users WHERE id = ?").get(result.lastInsertRowid);
    res.status(201).json({ token: issueToken(user), user: safeUser(user) });
  } catch (err) {
    console.error("Signup error:", err.message);
    res.status(500).json({ error: "Signup failed" });
  }
});

// ── Login (email/password) ─────────────────────────────────────────────────
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email);

    if (!user || !user.password_hash) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: "Invalid email or password" });

    res.json({ token: issueToken(user), user: safeUser(user) });
  } catch (err) {
    console.error("Login error:", err.message);
    res.status(500).json({ error: "Login failed" });
  }
});

// ── Google login ──────────────────────────────────────────────────────────
router.post("/google", async (req, res) => {
  try {
    const { credential } = req.body; // the ID token from Google's frontend widget
    if (!credential) return res.status(400).json({ error: "Missing Google credential" });

    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload(); // verified identity, comes from Google directly

    let user = db.prepare("SELECT * FROM users WHERE google_id = ? OR email = ?").get(payload.sub, payload.email);

    if (!user) {
      const result = db
        .prepare("INSERT INTO users (email, name, provider, google_id) VALUES (?, ?, 'google', ?)")
        .run(payload.email, payload.name, payload.sub);
      user = db.prepare("SELECT * FROM users WHERE id = ?").get(result.lastInsertRowid);
    }

    res.json({ token: issueToken(user), user: safeUser(user) });
  } catch (err) {
    console.error("Google auth error:", err.message);
    res.status(401).json({ error: "Google authentication failed" });
  }
});

// ── Middleware: require a logged-in user ────────────────────────────────────
function requireUser(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Not authenticated" });
  }
  try {
    const decoded = jwt.verify(authHeader.replace("Bearer ", ""), process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired session" });
  }
}

// ── Get current user (used to restore session on page reload) ──────────────
router.get("/me", requireUser, (req, res) => {
  res.json({ user: req.user });
});

module.exports = { router, requireUser };