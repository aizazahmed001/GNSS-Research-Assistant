# GNSS Knowledge Bot & Research Grants Bot

An AI-powered assistant suite for GNSS (Global Navigation Satellite System) research — combining domain-specific Q&A, document-grounded search, research proposal drafting, and a natural-language research grants finder in a single application.

Built with **React**, **Node.js/Express**, **SQLite**, and the **Gemini API**.

## Features

### 🛰️ GNSS Knowledge Bot
Ask questions about GPS, GLONASS, Galileo, BeiDou, PPP, RTK, ionospheric effects, space weather, GNSS receivers, spoofing, jamming, and LEO-PNT. Powered by a specialized system prompt with multi-turn conversation memory.

### 📄 Document-Based Q&A (RAG)
Upload research papers, program documents, or lab material (PDF/TXT) and ask questions answered strictly from the uploaded content. Built on a full retrieval-augmented generation pipeline: chunking → embeddings → cosine-similarity retrieval → grounded generation, with source citations and hallucination guardrails.

### 🎓 Research Grants Bot
Ask in plain English — *"Find me GNSS scholarships in Europe closing this year"* — and get back real matches from a structured grants database. Natural language questions are converted to structured filters (country, domain, funding type, deadline) via LLM extraction, then queried against SQLite for accurate results.

### 📝 Proposal Support
A conversational assistant for drafting research proposals — title, abstract, objectives, methodology, expected outcomes, budget headings, and work plan — tailored to GNSS research topics, referencing real tools (RTKLIB, GNSS-SDR, gLAB) and datasets (IGS, CORS).

### 🛠️ Admin Panel
Token-authenticated panel for managing the grants database (add/edit/delete) and uploaded documents, with PDF and Word (.docx) export of the full grants list.

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React (Vite), react-markdown, lucide-react |
| Backend | Node.js, Express |
| Database | SQLite (better-sqlite3) |
| AI | Google Gemini API (`gemini-2.5-flash`, `gemini-embedding-001`) |
| Document parsing | pdf-parse |
| Export | pdfkit, docx |
| Auth | HMAC-signed token auth for admin routes |

## Architecture

```
frontend/          React chat UI — mode switcher, session history, file upload, admin panel
backend/
  server.js        Express app, route registration
  documents.js      RAG pipeline: chunking, embeddings, retrieval
  db.js             SQLite schema
  auth.js           Admin token signing/verification
  routes/
    grants.js        Grants CRUD + filtering API
    grantsBot.js      Natural-language grants search
    export.js         PDF/DOCX report generation
```

## Getting Started

### Prerequisites
- Node.js 18+
- A Gemini API key from [Google AI Studio](https://aistudio.google.com/apikey)

### Setup

```bash
# Backend
cd backend
npm install
cp .env.example .env   # add your GEMINI_API_KEY, ADMIN_PASSWORD, ADMIN_TOKEN_SECRET
node seed.js            # optional: seed sample grant data
node server.js

# Frontend
cd frontend
npm install
npm run dev
```

Visit `http://localhost:5173`.

### Environment Variables

```
GEMINI_API_KEY=your_gemini_api_key
PORT=5000
ADMIN_PASSWORD=your_admin_password
ADMIN_TOKEN_SECRET=a_long_random_string
```

## Roadmap

- [ ] Dedicated search & filter UI for browsing grants outside the chatbot
- [ ] Deployment (currently local-only)
- [ ] Persistent (non-in-memory) document storage
- [ ] Multi-user accounts beyond single-admin auth

## License

MIT
