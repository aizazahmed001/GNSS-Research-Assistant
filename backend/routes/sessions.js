const express = require("express");
const router = express.Router();
const { pool } = require("../db");
const { requireUser } = require("./auth");

router.use(requireUser);

router.get("/", async (req, res) => {
  const result = await pool.query(
    "SELECT id, title, mode, updated_at FROM chat_sessions WHERE user_id = $1 ORDER BY updated_at DESC",
    [req.user.id]
  );
  res.json({ sessions: result.rows });
});

router.get("/:id", async (req, res) => {
  const result = await pool.query(
    "SELECT * FROM chat_sessions WHERE id = $1 AND user_id = $2",
    [req.params.id, req.user.id]
  );
  if (result.rows.length === 0) return res.status(404).json({ error: "Session not found" });
  const session = result.rows[0];
  res.json({ session: { ...session, messages: JSON.parse(session.messages) } });
});

router.post("/", async (req, res) => {
  const { id, title, messages, mode } = req.body;
  await pool.query(
    `INSERT INTO chat_sessions (id, user_id, title, messages, mode, updated_at)
     VALUES ($1,$2,$3,$4,$5,NOW())
     ON CONFLICT (id) DO UPDATE SET title=EXCLUDED.title, messages=EXCLUDED.messages, mode=EXCLUDED.mode, updated_at=NOW()`,
    [id, req.user.id, title || "New conversation", JSON.stringify(messages || []), mode || "chat"]
  );
  res.json({ message: "Saved" });
});

router.delete("/:id", async (req, res) => {
  await pool.query("DELETE FROM chat_sessions WHERE id = $1 AND user_id = $2", [req.params.id, req.user.id]);
  res.json({ message: "Deleted" });
});

module.exports = router;