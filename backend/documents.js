const pdfParse = require("pdf-parse");
const { pool } = require("./db");

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

function toVectorLiteral(embedding) {
  return `[${embedding.join(",")}]`; // pgvector's expected text format
}

async function addDocument(fileName, buffer, mimetype, genAI) {
  const text = await parseDocument(buffer, mimetype);
  const chunks = chunkText(text);
  if (chunks.length === 0) throw new Error("Uploaded document contains no readable text.");

  const embeddings = await embedTexts(genAI, chunks);

  const docResult = await pool.query(
    `INSERT INTO documents (name, chunk_count) VALUES ($1, $2) RETURNING id`,
    [fileName, chunks.length]
  );
  const documentId = docResult.rows[0].id;

  for (let i = 0; i < chunks.length; i++) {
    await pool.query(
      `INSERT INTO document_chunks (document_id, document_name, chunk_text, embedding)
       VALUES ($1, $2, $3, $4)`,
      [documentId, fileName, chunks[i], toVectorLiteral(embeddings[i])]
    );
  }

  return { documentId, documentName: fileName, chunkCount: chunks.length };
}

async function queryDocumentContext(query, genAI, topK = 4) {
  const [queryEmbedding] = await embedTexts(genAI, [query]);
  const vectorLiteral = toVectorLiteral(queryEmbedding);

  // <=> is pgvector's cosine distance operator; ORDER BY it ascending = most similar first
  const result = await pool.query(
    `SELECT document_name, chunk_text, 1 - (embedding <=> $1) AS score
     FROM document_chunks
     ORDER BY embedding <=> $1
     LIMIT $2`,
    [vectorLiteral, topK]
  );

  return result.rows.map((r) => ({ documentName: r.document_name, text: r.chunk_text, score: r.score }));
}

async function deleteDocument(documentId) {
  const result = await pool.query(`DELETE FROM documents WHERE id = $1`, [documentId]);
  if (result.rowCount === 0) throw new Error(`Document ${documentId} not found.`);
}

async function getDocumentSummaries() {
  const result = await pool.query(
    `SELECT id, name, chunk_count AS "chunkCount" FROM documents ORDER BY created_at DESC`
  );
  return result.rows;
}

module.exports = { parseDocument, addDocument, queryDocumentContext, deleteDocument, getDocumentSummaries };