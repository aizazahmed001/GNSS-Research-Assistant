const express = require("express");
const router = express.Router();
const db = require("../db");
const { requireUser } = require("./auth");

router.use(requireUser); // every route below requires login

router.get("/", (req, res) => {
  const sessions = db
    .prepare("SELECT id, title, mode, updated_at FROM chat_sessions WHERE user_id = ? ORDER BY updated_at DESC")
    .all(req.user.id);
  res.json({ sessions });
});

router.get("/:id", (req, res) => {
  const session = db
    .prepare("SELECT * FROM chat_sessions WHERE id = ? AND user_id = ?")
    .get(req.params.id, req.user.id);
  if (!session) return res.status(404).json({ error: "Session not found" });
  res.json({ session: { ...session, messages: JSON.parse(session.messages) } });
});

router.post("/", (req, res) => {
  const { id, title, messages, mode } = req.body;
  db.prepare(
    `INSERT INTO chat_sessions (id, user_id, title, messages, mode, updated_at)
     VALUES (?, ?, ?, ?, ?, datetime('now'))
     ON CONFLICT(id) DO UPDATE SET title=excluded.title, messages=excluded.messages, mode=excluded.mode, updated_at=datetime('now')`
  ).run(id, req.user.id, title || "New conversation", JSON.stringify(messages || []), mode || "chat");
  res.json({ message: "Saved" });
});

router.delete("/:id", (req, res) => {
  db.prepare("DELETE FROM chat_sessions WHERE id = ? AND user_id = ?").run(req.params.id, req.user.id);
  res.json({ message: "Deleted" });
});

module.exports = router;