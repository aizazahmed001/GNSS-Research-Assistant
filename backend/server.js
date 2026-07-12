const express = require("express");
const cors = require("cors");
require("dotenv").config();
const { GoogleGenerativeAI } = require("@google/generative-ai");
const multer = require("multer");
const grantsRouter = require("./routes/grants");
const grantsBotRouter = require("./routes/grantsBot");
const exportRouter = require("./routes/export");
const { router: authRouter } = require("./routes/auth");
const sessionsRouter = require("./routes/sessions");


const {
  addDocument,
  queryDocumentContext,
  deleteDocument,
  getDocumentSummaries,
} = require("./documents");

const app = express();
app.use(cors());
app.use(express.json());
app.use("/api/grants", grantsRouter);
app.use("/api/export", exportRouter);
app.use("/api/auth", authRouter);
app.use("/api/sessions", sessionsRouter);

const { signToken, requireAdmin } = require("./auth");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const upload = multer({ storage: multer.memoryStorage() });
app.use("/api/grants-chat", grantsBotRouter(genAI));


const PROPOSAL_SYSTEM_PROMPT = `You are a Research Proposal Assistant specializing in GNSS and satellite navigation research. You help users draft and structure strong research proposals.

You can help with any of these proposal sections when asked:
- TITLE — concise, specific, reflects the research question
- ABSTRACT — 150-250 word summary: problem, approach, expected contribution
- OBJECTIVES — 3-5 clear, measurable research objectives
- METHODOLOGY — research design, tools/software (e.g. RTKLIB, GNSS-SDR, MATLAB), data sources (e.g. IGS, CORS), analysis approach
- EXPECTED OUTCOMES — concrete deliverables and anticipated contributions to the field
- BUDGET HEADINGS — typical categories (personnel, equipment, travel, publication costs, overheads) with guidance on what belongs in each, without inventing specific numbers unless the user provides them
- WORK PLAN — a phased timeline (e.g. Phase 1: literature review, Phase 2: data collection...) with realistic sequencing

Rules:
- If the user hasn't specified their research topic yet, ask ONE clarifying question about their topic/focus area before generating content — don't guess.
- When generating a section, format it clearly with a markdown heading matching that section name.
- Keep guidance GNSS/satellite-navigation-research relevant; if asked about totally unrelated fields, note that your expertise is GNSS but still try to give generally sound proposal-writing structure.
- Be specific and actionable, not generic boilerplate. Reference real GNSS tools, datasets, and methods where relevant.
- Never fabricate specific budget figures, institution names, or grant amounts — leave those as placeholders for the user to fill in.`;

const proposalModel = genAI.getGenerativeModel({
  model: "gemini-2.5-flash",
  systemInstruction: PROPOSAL_SYSTEM_PROMPT,
});

app.post("/api/proposal-chat", async (req, res) => {
  try {
    const { message, history } = req.body;
    if (!message) return res.status(400).json({ error: "message is required" });

    const chat = proposalModel.startChat({ history: Array.isArray(history) ? history : [] });
    const result = await chat.sendMessage(message);

    res.json({ reply: result.response.text() });
  } catch (err) {
    console.error("Proposal chat error:", err.message);
    res.status(500).json({ error: "Something went wrong" });
  }
});



const SYSTEM_PROMPT = `You are GNSS Assistant, a specialized AI assistant focused exclusively on Global Navigation Satellite Systems (GNSS) and related research.

Your two responsibilities:

1. GNSS KNOWLEDGE — Answer technical questions about GPS, GLONASS, Galileo, BeiDou, PPP (Precise Point Positioning), RTK (Real-Time Kinematic), ionospheric effects, space weather, GNSS receivers, spoofing, jamming, and LEO-PNT (Low Earth Orbit Positioning, Navigation and Timing).

2. RESEARCH TOPIC GUIDANCE — When a user asks for research ideas, thesis topics, literature direction, methodology, tools, or datasets, give specific, actionable guidance. Reference real tools (e.g. RTKLIB, GNSS-SDR, gLAB) and real datasets (e.g. IGS, CORS networks) instead of vague suggestions.

Rules:
- Stay within the GNSS / satellite navigation / space weather / related research domain.
- If asked something clearly unrelated, politely decline and steer back to GNSS topics in one short sentence.
- Format responses in markdown: headers for sections, bold for key terms, bullet lists for enumerable options.
- Be technically accurate. If uncertain, say so rather than guessing.
- Default to concise answers; expand only when asked or genuinely needed.`;

const chatModel = genAI.getGenerativeModel({
  model: "gemini-2.5-flash",
  systemInstruction: SYSTEM_PROMPT,
});

// ── General GNSS chat ─────────────────────────────────────────────────────────
app.post("/api/chat", async (req, res) => {
  try {
    const { message, history } = req.body;
    if (!message) return res.status(400).json({ error: "message is required" });

    const chat = chatModel.startChat({ history: Array.isArray(history) ? history : [] });
    const result = await chat.sendMessage(message);

    res.json({ reply: result.response.text() });
  } catch (err) {
    console.error("Chat error:", err.message);
    res.status(500).json({ error: "Something went wrong" });
  }
});

app.post("/api/admin/login", (req, res) => {
  const { password } = req.body;
  if (password !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ error: "Incorrect password" });
  }
  const token = signToken(process.env.ADMIN_TOKEN_SECRET);
  res.json({ token });
});

// ── Upload a document ─────────────────────────────────────────────────────────
app.post("/api/upload", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

    const result = await addDocument(
      req.file.originalname,
      req.file.buffer,
      req.file.mimetype,
      genAI
    );

    res.json({ message: "Document processed", ...result });
  } catch (err) {
    console.error("Upload error:", err.message);
    res.status(500).json({ error: err.message || "Failed to process document" });
  }
});

// ── List uploaded documents ───────────────────────────────────────────────────
app.get("/api/documents", (req, res) => {
  res.json({ documents: getDocumentSummaries() });
});

// ── Delete a document ──────────────────────────────────────────────────────────
app.delete("/api/documents/:id", requireAdmin, (req, res) => {
  try {
    deleteDocument(Number(req.params.id));
    res.json({ message: "Deleted" });
  } catch (err) {
    res.status(404).json({ error: err.message });
  }
});

// ── Document-grounded Q&A ─────────────────────────────────────────────────────
app.post("/api/document-chat", async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) return res.status(400).json({ error: "message is required" });

    const topChunks = await queryDocumentContext(message, genAI, 4);

    if (topChunks.length === 0) {
      return res.json({ reply: "No documents have been uploaded yet — upload one first." });
    }

    const context = topChunks
      .map((c, i) => `[Source ${i + 1}: ${c.documentName}]\n${c.text}`)
      .join("\n\n---\n\n");

    const ragPrompt = `You answer questions using ONLY the provided document excerpts below. If the answer isn't in the excerpts, say so clearly instead of guessing. Always mention which source(s) you used (by document name).

DOCUMENT EXCERPTS:
${context}

QUESTION: ${message}`;

    const ragModel = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const result = await ragModel.generateContent(ragPrompt);

    res.json({ reply: result.response.text() });
  } catch (err) {
    console.error("Document chat error:", err.message);
    res.status(500).json({ error: "Something went wrong" });
  }
});


const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));