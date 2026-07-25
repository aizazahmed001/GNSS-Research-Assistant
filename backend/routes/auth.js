const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { OAuth2Client } = require("google-auth-library");
const { Resend } = require("resend");
const { pool } = require("../db");

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
const resend = new Resend(process.env.RESEND_API_KEY);

function issueToken(user) {
  return jwt.sign({ id: user.id, email: user.email, name: user.name }, process.env.JWT_SECRET, { expiresIn: "24h" });
}

function safeUser(user) {
  return { id: user.id, email: user.email, name: user.name, provider: user.provider, email_verified: user.email_verified };
}

function generateCode() {
  return Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit code
}

async function sendVerificationEmail(email, code) {
  await resend.emails.send({
    from: "GNSS Research Assistant <onboarding@resend.dev>",
    to: email,
    subject: "Verify your email — GNSS Research Assistant",
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2 style="color: #1a1a1a;">Verify your email</h2>
        <p>Enter this code in the app to activate your account:</p>
        <div style="font-size: 32px; font-weight: 700; letter-spacing: 8px; background: #f4f4f4; padding: 16px; text-align: center; border-radius: 8px; margin: 16px 0;">
          ${code}
        </div>
        <p style="color: #666; font-size: 13px;">This code expires in 10 minutes. If you didn't request this, you can ignore this email.</p>
      </div>
    `,
  });
}

// ── Signup ────────────────────────────────────────────────────────────────
router.post("/signup", async (req, res) => {
  try {
    const { email, password, name } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const existing = await pool.query("SELECT id, email_verified FROM users WHERE email = $1", [email]);
    if (existing.rows.length > 0 && existing.rows[0].email_verified) {
      return res.status(409).json({ error: "An account with this email already exists" });
    }

    const hash = await bcrypt.hash(password, 10);
    const code = generateCode();
    const expires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now

    let user;
    if (existing.rows.length > 0) {
      // Unverified account already exists — update it with a fresh code instead of erroring
      const result = await pool.query(
        `UPDATE users SET password_hash=$1, name=$2, verification_code=$3, verification_code_expires=$4
         WHERE email=$5 RETURNING *`,
        [hash, name || email.split("@")[0], code, expires, email]
      );
      user = result.rows[0];
    } else {
      const result = await pool.query(
        `INSERT INTO users (email, password_hash, name, provider, verification_code, verification_code_expires)
         VALUES ($1,$2,$3,'local',$4,$5) RETURNING *`,
        [email, hash, name || email.split("@")[0], code, expires]
      );
      user = result.rows[0];
    }

    await sendVerificationEmail(email, code);

    res.status(201).json({ message: "Verification code sent", email: user.email, requiresVerification: true });
  } catch (err) {
    console.error("Signup error:", err.message);
    res.status(500).json({ error: "Signup failed" });
  }
});

// ── Verify email ─────────────────────────────────────────────────────────
router.post("/verify-email", async (req, res) => {
  try {
    const { email, code } = req.body;
    if (!email || !code) return res.status(400).json({ error: "Email and code are required" });

    const result = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
    const user = result.rows[0];

    if (!user) return res.status(404).json({ error: "Account not found" });
    if (user.email_verified) return res.status(400).json({ error: "Email already verified" });

    if (user.verification_code !== code) {
      return res.status(400).json({ error: "Incorrect verification code" });
    }
    if (new Date() > new Date(user.verification_code_expires)) {
      return res.status(400).json({ error: "Verification code has expired. Please request a new one." });
    }

    const updated = await pool.query(
      `UPDATE users SET email_verified = TRUE, verification_code = NULL, verification_code_expires = NULL
       WHERE email = $1 RETURNING *`,
      [email]
    );
    const verifiedUser = updated.rows[0];

    res.json({ token: issueToken(verifiedUser), user: safeUser(verifiedUser) });
  } catch (err) {
    console.error("Verify email error:", err.message);
    res.status(500).json({ error: "Verification failed" });
  }
});

// ── Resend verification code ────────────────────────────────────────────
router.post("/resend-code", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: "Email is required" });

    const result = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
    const user = result.rows[0];

    if (!user) return res.status(404).json({ error: "Account not found" });
    if (user.email_verified) return res.status(400).json({ error: "Email already verified" });

    const code = generateCode();
    const expires = new Date(Date.now() + 10 * 60 * 1000);

    await pool.query(
      "UPDATE users SET verification_code = $1, verification_code_expires = $2 WHERE email = $3",
      [code, expires, email]
    );

    await sendVerificationEmail(email, code);
    res.json({ message: "Verification code resent" });
  } catch (err) {
    console.error("Resend code error:", err.message);
    res.status(500).json({ error: "Failed to resend code" });
  }
});

// ── Login ────────────────────────────────────────────────────────────────
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const result = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
    const user = result.rows[0];

    if (!user || !user.password_hash) return res.status(401).json({ error: "Invalid email or password" });

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: "Invalid email or password" });

    if (!user.email_verified) {
      return res.status(403).json({ error: "Please verify your email first", requiresVerification: true, email: user.email });
    }

    res.json({ token: issueToken(user), user: safeUser(user) });
  } catch (err) {
    console.error("Login error:", err.message);
    res.status(500).json({ error: "Login failed" });
  }
});

// ── Google login (auto-verified — Google already confirmed the email) ─────
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
        `INSERT INTO users (email, name, provider, google_id, email_verified)
         VALUES ($1,$2,'google',$3, TRUE) RETURNING *`,
        [payload.email, payload.name, payload.sub]
      );
      user = insertResult.rows[0];
    } else if (!user.email_verified) {
      // Existing unverified local account signing in with Google for the first time
      const updated = await pool.query(
        "UPDATE users SET email_verified = TRUE, google_id = $1 WHERE email = $2 RETURNING *",
        [payload.sub, payload.email]
      );
      user = updated.rows[0];
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