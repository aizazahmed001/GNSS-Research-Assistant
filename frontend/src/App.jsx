import { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import "./App.css";
import AdminPanel from "./AdminPanel";
import { Satellite, FileText, GraduationCap, FilePenLine, ShieldCheck } from "lucide-react";

const STORAGE_KEY = "gnss_chat_sessions";

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

function loadSessions() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

function saveSessions(sessions) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
}

function formatSessionTime(ts) {
  if (!ts) return "";
  const d = new Date(ts);
  const now = new Date();
  const isToday =
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear();
  const time = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  if (isToday) return `Today · ${time}`;
  const isYesterday =
    d.getDate() === now.getDate() - 1 &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear();
  if (isYesterday) return `Yesterday · ${time}`;
  return (
    d.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" }) +
    ` · ${time}`
  );
}

// Mode config — NOTE: "admin" added here, this was the actual bug
const MODES = [
  { id: "chat",     label: "GNSS Chat",        icon: Satellite,     placeholder: "Ask about GNSS…" },
  { id: "docs",     label: "Document Q&A",     icon: FileText,      placeholder: "Ask about your documents…" },
  { id: "grants",   label: "Research Grants",  icon: GraduationCap, placeholder: "e.g. Find GNSS scholarships in Europe closing this year…" },
  { id: "proposal", label: "Proposal Support", icon: FilePenLine,   placeholder: "e.g. Help me draft a proposal on GNSS spoofing detection…" },
  { id: "admin",    label: "Admin",            icon: ShieldCheck,   placeholder: "" },
];

const ENDPOINT_MAP = {
  chat:     "/api/chat",
  docs:     "/api/document-chat",
  grants:   "/api/grants-chat",
  proposal: "/api/proposal-chat",
};

export default function App() {
  const [sessions, setSessions]       = useState(() => loadSessions());
  const [activeId, setActiveId]       = useState(null);
  const [messages, setMessages]       = useState([]);
  const [input, setInput]             = useState("");
  const [loading, setLoading]         = useState(false);
  const [uploading, setUploading]     = useState(false);
  const [uploadedDocs, setUploadedDocs] = useState([]);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mode, setMode]               = useState("chat"); // fixed: useState only takes one initial value
  const bottomRef  = useRef(null);
  const fileInputRef = useRef(null);
  const [adminToken, setAdminToken] = useState(sessionStorage.getItem("admin_token"));
  

  useEffect(() => {
    if (!activeId) return;
    setSessions((prev) => {
      const updated = prev.map((s) =>
        s.id === activeId ? { ...s, messages, updatedAt: Date.now() } : s
      );
      saveSessions(updated);
      return updated;
    });
  }, [messages]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  function newChat() {
    const id = generateId();
    const session = { id, title: "New conversation", messages: [], createdAt: Date.now(), updatedAt: Date.now() };
    const updated = [session, ...sessions];
    setSessions(updated);
    saveSessions(updated);
    setActiveId(id);
    setMessages([]);
    setInput("");
  }

  function openSession(id) {
    const s = sessions.find((s) => s.id === id);
    if (!s) return;
    setActiveId(id);
    setMessages(s.messages);
    setInput("");
  }

  function deleteSession(e, id) {
    e.stopPropagation();
    const updated = sessions.filter((s) => s.id !== id);
    saveSessions(updated);
    setSessions(updated);
    if (activeId === id) { setActiveId(null); setMessages([]); }
  }

  function derivedTitle(msgs) {
    const first = msgs.find((m) => m.role === "user");
    if (!first) return "New conversation";
    return first.text.length > 40 ? first.text.slice(0, 40) + "…" : first.text;
  }

  async function handleFileChange(e) {
    const chosen = e.target.files[0];
    if (!chosen) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", chosen);
      const res  = await fetch("http://localhost:5000/api/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      setUploadedDocs((prev) => [...prev, { id: data.documentId, name: data.documentName, chunkCount: data.chunkCount }]);
      setMessages((prev) => [...prev, {
        role: "system",
        text: `📄 **${data.documentName}** uploaded — split into **${data.chunkCount} chunks**. Ask anything about it.`,
      }]);
    } catch (err) {
      console.error(err);
      setMessages((prev) => [...prev, { role: "system", text: `⚠️ Upload failed: ${err.message}` }]);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function removeDoc(docId) {
    fetch(`http://localhost:5000/api/documents/${docId}`, { method: "DELETE" }).catch(console.error);
    setUploadedDocs((prev) => prev.filter((d) => d.id !== docId));
  }

  async function sendMessage() {
    if (!input.trim()) return;

    let currentId = activeId;
    if (!currentId) {
      const id = generateId();
      const session = { id, title: "New conversation", messages: [], createdAt: Date.now(), updatedAt: Date.now() };
      setSessions((prev) => { const u = [session, ...prev]; saveSessions(u); return u; });
      currentId = id;
      setActiveId(id);
    }

    const userMsg = { role: "user", text: input, mode };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

  const history = (mode === "chat" || mode === "proposal")
  ? messages
      .filter((m) => m.role === "user" || m.role === "bot")
      .map((m) => ({ role: m.role === "user" ? "user" : "model", parts: [{ text: m.text }] }))
  : [{ role: "model", parts: [{ text: "Tell me your research topic, and I'll help draft your title, abstract, objectives, methodology, and more." }] }];

    try {
      const res = await fetch(`http://localhost:5000${ENDPOINT_MAP[mode]}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMsg.text, history }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      const botMsg = { role: "bot", text: data.reply, mode };
      setMessages((prev) => {
        const next = [...prev, botMsg];
        setSessions((prevS) => {
          const title   = derivedTitle(next);
          const updated = prevS.map((s) => s.id === currentId ? { ...s, messages: next, title, updatedAt: Date.now() } : s);
          saveSessions(updated);
          return updated;
        });
        return next;
      });
    } catch (err) {
      console.error(err);
      setMessages((prev) => [...prev, { role: "bot", text: `⚠️ ${err.message || "Signal lost."}`, mode }]);
    } finally {
      setLoading(false);
    }
  }

  // Fallback added defensively — if mode is ever unrecognized, don't crash
  const currentMode = MODES.find((m) => m.id === mode) || MODES[0];

  return (
    <div className="page">
      <div className="page-heading">
        <div className="page-heading-icon">⊕</div>
        <div>
          <h1 className="page-title">GNSS Knowledge Bot</h1>
          <p className="page-subtitle">AI assistant for GPS · GLONASS · Galileo · BeiDou · RTK · PPP</p>
        </div>
      </div>

      <div className="layout">
        <aside className={`sidebar ${sidebarOpen ? "sidebar-open" : "sidebar-closed"}`}>
          <div className="sidebar-header">
            <button className="new-chat-btn" onClick={newChat}>+ New Chat</button>
            <button className="sidebar-toggle" onClick={() => setSidebarOpen((v) => !v)} title="Toggle sidebar">
              {sidebarOpen ? "◀" : "▶"}
            </button>
          </div>

         {sidebarOpen && (
  <div className="session-list">
    {sessions.length === 0 && <p className="no-sessions">No history yet</p>}
    {sessions.map((s) => (
      <div
        key={s.id}
        className={`session-item ${s.id === activeId ? "session-active" : ""}`}
        onClick={() => openSession(s.id)}
      >
        <span className="session-dot" />
        <span className="session-title">{s.title}</span>
        <button className="session-delete" onClick={(e) => deleteSession(e, s.id)} title="Delete">✕</button>
      </div>
    ))}
  </div>
)}
        </aside>

        <div className="chat-window">
          <div className="header">
            <div className="header-left">
              <span className="status-dot" />
              <span className="header-title">GNSS KNOWLEDGE BOT</span>
            </div>
            <span className="header-sub">v0.1 · online</span>
          </div>

          {/* Mode bar — buttons only, nothing else belongs here */}
          <div className="mode-bar">
            {MODES.map((m) => (
  <button
    key={m.id}
    className={`mode-btn ${mode === m.id ? "mode-active" : ""}`}
    onClick={() => setMode(m.id)}
  >
    <m.icon size={15} className="mode-icon" />
    {m.label}
  </button>
))}
          </div>

          {/* Admin mode replaces the entire chat body; everything else is unchanged */}
          {mode === "admin" ? (
            <AdminPanel token={adminToken} setToken={setAdminToken} />
          ) : (
            <>
              <div className="message-area">
                {messages.length === 0 && (
                  <div className="empty-state">
                    <div className="empty-icon">
  <currentMode.icon size={32} strokeWidth={1.5} />
</div>
                    <div className="empty-title">{currentMode.label}</div>
                    <div className="empty-sub">
                      {mode === "chat"   && "Ask anything about GNSS, RTK, PPP, or research topics."}
                      {mode === "docs"   && "Upload a document above, then ask questions about it."}
                      {mode === "grants" && "Ask in plain English — e.g. \"Find GNSS PhD scholarships in Europe closing this year.\""}
                    </div>
                  </div>
                )}

  {messages.map((m, i) => (
  <div key={i} className={`message-row ${m.role === "user" ? "row-user" : m.role === "system" ? "row-system" : "row-bot"}`}>
    <div className="message-col">
      {m.role === "bot" && m.mode === "grants" && (
        <span className="mode-badge"><GraduationCap size={12} /> Grants</span>
      )}
      {m.role === "bot" && m.mode === "docs" && (
        <span className="mode-badge"><FileText size={12} /> Docs</span>
      )}
      <div className={`bubble ${m.role === "user" ? "bubble-user" : m.role === "system" ? "bubble-system" : "bubble-bot"}`}>
        {m.role === "bot" || m.role === "system" ? (
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.text}</ReactMarkdown>
        ) : (
          m.text
        )}
      </div>
    </div>
  </div>
))}

                {loading && (
                  <div className="message-row row-bot">
                    <div className="bubble bubble-bot signal-lock">
                      <span className="ping-ring" />
                      <span className="ping-dot" />
                      <span className="signal-text">
                        {mode === "grants" ? "Searching grants…" : "Acquiring signal…"}
                      </span>
                    </div>
                  </div>
                )}

                <div ref={bottomRef} />
              </div>

              {mode === "docs" && uploadedDocs.length > 0 && (
                <div className="docs-bar">
                  {uploadedDocs.map((d) => (
                    <span key={d.id} className="doc-tag">
                      📄 {d.name}
                      <span className="doc-chunks">{d.chunkCount} chunks</span>
                      <button className="doc-remove" onClick={() => removeDoc(d.id)} title="Remove">✕</button>
                    </span>
                  ))}
                </div>
              )}
              {uploading && (
                <div className="docs-bar">
                  <span className="doc-tag uploading-tag">⏳ Processing file…</span>
                </div>
              )}

              <div className="input-row">
                {mode === "docs" && (
                  <>
                    <button
                      className="attach-btn"
                      onClick={() => fileInputRef.current?.click()}
                      title="Upload file (.txt, .pdf, .csv, .json, .md)"
                      disabled={uploading}
                    >
                      📎
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".txt,.pdf,.csv,.json,.md"
                      style={{ display: "none" }}
                      onChange={handleFileChange}
                    />
                  </>
                )}

                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                  className="text-input"
                  placeholder={currentMode.placeholder}
                  disabled={uploading}
                />
                <button onClick={sendMessage} className="send-btn" disabled={loading || uploading}>
                  Send
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}