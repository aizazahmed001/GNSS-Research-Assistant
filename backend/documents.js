/**
 * documents.js
 * Handles document parsing, chunking, embedding, and semantic retrieval.
 * Uses Gemini (gemini-embedding-001) for embeddings.
 */

const pdfParse = require("pdf-parse");

const documentStore = {
  chunks: [],
  documents: [],
};

const CHUNK_SIZE = 800;
const CHUNK_OVERLAP = 150;

function chunkText(text) {
  const clean = text.replace(/\s+/g, " ").trim();
  const chunks = [];
  let start = 0;

  while (start < clean.length) {
    let end = Math.min(start + CHUNK_SIZE, clean.length);
    if (end < clean.length) {
      const lastSpace = clean.lastIndexOf(" ", end);
      if (lastSpace > start) end = lastSpace;
    }
    const chunk = clean.slice(start, end).trim();
    if (chunk) chunks.push(chunk);
    if (end >= clean.length) break;
    start = Math.max(end - CHUNK_OVERLAP, start + 1);
  }

  return chunks;
}

function cosineSimilarity(a, b) {
  const dot = a.reduce((sum, v, i) => sum + v * b[i], 0);
  const magA = Math.sqrt(a.reduce((sum, v) => sum + v * v, 0));
  const magB = Math.sqrt(b.reduce((sum, v) => sum + v * v, 0));
  return dot / (magA * magB + 1e-10);
}

// ── Gemini embedding helper ──────────────────────────────────────────────────
/**
 * Embed one or many strings using Gemini's embedding model.
 * Gemini's embedContent is one-at-a-time, so we batch with Promise.all.
 *
 * @param {import("@google/generative-ai").GoogleGenerativeAI} genAI
 * @param {string | string[]} inputs
 * @returns {Promise<number[][]>}
 */
async function embedTexts(genAI, inputs) {
  const model = genAI.getGenerativeModel({ model: "gemini-embedding-001" });
  const texts = Array.isArray(inputs) ? inputs : [inputs];

  const results = await Promise.all(texts.map((t) => model.embedContent(t)));
  return results.map((r) => r.embedding.values);
}

async function parseDocument(fileBuffer, mimetype) {
  if (mimetype === "application/pdf") {
    const data = await pdfParse(fileBuffer);
    return data.text || "";
  }
  return fileBuffer.toString("utf-8");
}

/**
 * @param {string} fileName
 * @param {Buffer} buffer
 * @param {string} mimetype
 * @param {import("@google/generative-ai").GoogleGenerativeAI} genAI
 */
async function addDocument(fileName, buffer, mimetype, genAI) {
  const text = await parseDocument(buffer, mimetype);
  const chunks = chunkText(text);

  if (chunks.length === 0) {
    throw new Error("Uploaded document contains no readable text.");
  }

  const embeddings = await embedTexts(genAI, chunks);
  const documentId = documentStore.documents.length + 1;

  documentStore.documents.push({
    id: documentId,
    name: fileName,
    chunkCount: chunks.length,
    createdAt: new Date().toISOString(),
  });

  chunks.forEach((chunk, index) => {
    documentStore.chunks.push({
      documentId,
      documentName: fileName,
      chunkId: `${documentId}-${index}`,
      text: chunk,
      embedding: embeddings[index],
    });
  });

  return { documentId, documentName: fileName, chunkCount: chunks.length };
}

/**
 * @param {string} query
 * @param {import("@google/generative-ai").GoogleGenerativeAI} genAI
 * @param {number} topK
 */
async function queryDocumentContext(query, genAI, topK = 4) {
  if (documentStore.chunks.length === 0) return [];

  const [queryEmbedding] = await embedTexts(genAI, [query]);

  return documentStore.chunks
    .filter((c) => Array.isArray(c.embedding))
    .map((c) => ({ ...c, score: cosineSimilarity(queryEmbedding, c.embedding) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
}

function deleteDocument(documentId) {
  const index = documentStore.documents.findIndex((d) => d.id === documentId);
  if (index === -1) throw new Error(`Document ${documentId} not found.`);
  documentStore.documents.splice(index, 1);
  documentStore.chunks = documentStore.chunks.filter((c) => c.documentId !== documentId);
}

function getDocumentSummaries() {
  return documentStore.documents.map((d) => ({ id: d.id, name: d.name, chunkCount: d.chunkCount }));
}

module.exports = {
  parseDocument,
  addDocument,
  queryDocumentContext,
  deleteDocument,
  getDocumentSummaries,
};