import { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import "./App.css";
import AdminPanel from "./AdminPanel";
import Login from "./Login";
import { API_URL } from "./config";
import logo from "./assets/logo.webp";
import { Satellite, FileText, GraduationCap, FilePenLine, ShieldCheck, LogOut, Menu, X, Pencil, Check, Copy, Search, MessageSquare, Trash2, Paperclip } from "lucide-react";
import ThemeToggle from "./ThemeToggle";

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

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

const IDLE_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes — adjust as needed

export default function App() {
  const [authToken, setAuthToken] = useState(localStorage.getItem("auth_token"));
  const [user, setUser] = useState(null);

  const [sessions, setSessions]       = useState([]);
  const [activeId, setActiveId]       = useState(null);
  const [messages, setMessages]       = useState([]);
  const [input, setInput]             = useState("");
  const [loading, setLoading]         = useState(false);
  const [uploading, setUploading]     = useState(false);
  const [uploadedDocs, setUploadedDocs] = useState([]);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mode, setMode]               = useState("chat");
  const bottomRef  = useRef(null);
  const fileInputRef = useRef(null);
  const [adminToken, setAdminToken] = useState(sessionStorage.getItem("admin_token"));
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [editingIndex, setEditingIndex] = useState(null);
  const [editText, setEditText] = useState("");
  const idleTimerRef = useRef(null);
  const [copiedIndex, setCopiedIndex] = useState(null);
  const [sessionSearch, setSessionSearch] = useState("");
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // ── Auth helpers ────────────────────────────────────────────────────────
  function handleLogin(token, userData) {
    localStorage.setItem("auth_token", token);
    setAuthToken(token);
    setUser(userData);
  }

  function resetIdleTimer() {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    if (!authToken) return;

    localStorage.setItem("last_activity", Date.now().toString());

    idleTimerRef.current = setTimeout(() => {
      forceLogout();
    }, IDLE_TIMEOUT_MS);
  }

  function forceLogout() {
    localStorage.removeItem("auth_token");
    localStorage.removeItem("last_activity");
    setAuthToken(null);
    setUser(null);
    setSessions([]);
    setActiveId(null);
    setMessages([]);
    setShowLogoutConfirm(false);
  }

  function requestLogout() {
    setShowLogoutConfirm(true);
  }

  function confirmLogout() {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    window.setTimeout(() => {
      forceLogout();
      setIsLoggingOut(false);
    }, 300);
  }

  function cancelLogout() {
    setShowLogoutConfirm(false);
  }

  function authHeaders() {
    return { Authorization: `Bearer ${authToken}` };
  }

  useEffect(() => {
    if (!authToken) return;

    const lastActivity = parseInt(localStorage.getItem("last_activity") || "0", 10);
    const elapsed = Date.now() - lastActivity;

    if (lastActivity && elapsed > IDLE_TIMEOUT_MS) {
      forceLogout();
      return;
    }

    fetch(`${API_URL}/api/auth/me`, { headers: authHeaders() })
      .then((res) => {
        if (!res.ok) throw new Error("Session expired");
        return res.json();
      })
      .then((data) => setUser(data.user))
      .catch(() => forceLogout());

    fetch(`${API_URL}/api/sessions`, { headers: authHeaders() })
      .then((res) => res.json())
      .then((data) => setSessions(data.sessions || []))
      .catch(console.error);
  }, [authToken]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!authToken) return;

    const events = ["mousedown", "mousemove", "keydown", "scroll", "touchstart"];
    events.forEach((event) => window.addEventListener(event, resetIdleTimer));

    resetIdleTimer();

    return () => {
      events.forEach((event) => window.removeEventListener(event, resetIdleTimer));
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    };
  }, [authToken]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!activeId || !authToken) return;
    const title = derivedTitle(messages);

    fetch(`${API_URL}/api/sessions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify({ id: activeId, title, messages, mode }),
    }).catch(console.error);

    setSessions((prev) => {
      const exists = prev.some((s) => s.id === activeId);
      const updated = exists
        ? prev.map((s) => (s.id === activeId ? { ...s, title, updated_at: new Date().toISOString() } : s))
        : [{ id: activeId, title, updated_at: new Date().toISOString() }, ...prev];
      return updated.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
    });
  }, [messages]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  function newChat() {
    const id = generateId();
    setActiveId(id);
    setMessages([]);
    setInput("");
    if (window.innerWidth <= 640) setSidebarOpen(false);
  }

  async function openSession(id) {
    try {
      const res = await fetch(`${API_URL}/api/sessions/${id}`, { headers: authHeaders() });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setActiveId(id);
      setMessages(data.session.messages || []);
      setInput("");
      if (window.innerWidth <= 640) setSidebarOpen(false);
    } catch (err) {
      console.error(err);
    }
  }

  async function deleteSession(e, id) {
    e.stopPropagation();
    try {
      await fetch(`${API_URL}/api/sessions/${id}`, { method: "DELETE", headers: authHeaders() });
      setSessions((prev) => prev.filter((s) => s.id !== id));
      if (activeId === id) { setActiveId(null); setMessages([]); }
    } catch (err) {
      console.error(err);
    }
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
      const res = await fetch(`${API_URL}/api/upload`, { method: "POST", body: formData });
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

  async function copyMessage(text, index) {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 1500);
    } catch (err) {
      console.error("Copy failed:", err);
    }
  }

  function removeDoc(docId) {
    fetch(`${API_URL}/api/documents/${docId}`, { method: "DELETE" }).catch(console.error);
    setUploadedDocs((prev) => prev.filter((d) => d.id !== docId));
  }

  async function sendToBackend(text, baseMessages) {
    let currentId = activeId;
    if (!currentId) {
      currentId = generateId();
      setActiveId(currentId);
    }

    const userMsg = { role: "user", text, mode };
    const messagesWithUser = [...baseMessages, userMsg];
    setMessages(messagesWithUser);
    setLoading(true);

    const history = (mode === "chat" || mode === "proposal")
      ? baseMessages
          .filter((m) => m.role === "user" || m.role === "bot")
          .map((m) => ({ role: m.role === "user" ? "user" : "model", parts: [{ text: m.text }] }))
      : [];

    try {
      const res = await fetch(`${API_URL}${ENDPOINT_MAP[mode]}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, history }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      const botMsg = { role: "bot", text: data.reply, mode };
      setMessages([...messagesWithUser, botMsg]);
    } catch (err) {
      console.error(err);
      setMessages([...messagesWithUser, { role: "bot", text: `⚠️ ${err.message || "Signal lost."}`, mode }]);
    } finally {
      setLoading(false);
    }
  }

  async function sendMessage() {
    if (!input.trim()) return;
    const text = input;
    setInput("");
    await sendToBackend(text, messages);
  }

  function startEdit(index) {
    setEditingIndex(index);
    setEditText(messages[index].text);
  }

  function cancelEdit() {
    setEditingIndex(null);
    setEditText("");
  }

  async function saveEdit(index) {
    const trimmed = editText.trim();
    if (!trimmed) return;

    const baseMessages = messages.slice(0, index);
    setEditingIndex(null);
    setEditText("");
    await sendToBackend(trimmed, baseMessages);
  }

  const currentMode = MODES.find((m) => m.id === mode) || MODES[0];

  // Fixed: must be inside the component (it reads `sessions` and `sessionSearch` state)
  const filteredSessions = sessions.filter((s) =>
    s.title.toLowerCase().includes(sessionSearch.toLowerCase())
  );

  if (!authToken) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className="page">
      <div className="layout">
        {sidebarOpen && <div className="gs-sidebar-backdrop" onClick={() => setSidebarOpen(false)} />}
        <aside className={`gs-sidebar ${sidebarOpen ? "gs-sidebar-open" : "gs-sidebar-closed"}`}>
          <div className="gs-sidebar-brand">
            <img src={logo} alt="" className="gs-sidebar-logo" />
            {sidebarOpen && <span className="gs-sidebar-brand-text">GNSS Research AI</span>}
            <button className="gs-mobile-close-btn" onClick={() => setSidebarOpen(false)} aria-label="Close menu">
              <X size={18} />
            </button>
          </div>

          <div className="gs-sidebar-actions">
            <button className="gs-new-chat-btn" onClick={newChat}>
              <span className="gs-new-chat-plus">+</span>
              {sidebarOpen && <span>New Chat</span>}
            </button>
            <button className="gs-sidebar-toggle" onClick={() => setSidebarOpen((v) => !v)} title="Toggle sidebar">
              {sidebarOpen ? "◀" : "▶"}
            </button>
          </div>

          {sidebarOpen && (
            <div className="gs-search-wrapper">
              <Search size={14} className="gs-search-icon" />
              <input
                className="gs-search-input"
                placeholder="Search conversations..."
                value={sessionSearch}
                onChange={(e) => setSessionSearch(e.target.value)}
              />
            </div>
          )}

          {sidebarOpen && (
            <div className="gs-session-list">
              {filteredSessions.length === 0 && (
                <p className="gs-no-sessions">
                  {sessionSearch ? "No matching conversations" : "No history yet"}
                </p>
              )}
              {filteredSessions.map((s) => (
                <div
                  key={s.id}
                  className={`gs-session-item ${s.id === activeId ? "gs-session-active" : ""}`}
                  onClick={() => openSession(s.id)}
                >
                  <MessageSquare size={13} className="gs-session-icon" />
                  <span className="gs-session-title">{s.title}</span>
                  <button className="gs-session-delete" onClick={(e) => deleteSession(e, s.id)} title="Delete">
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="gs-sidebar-footer">
            <div className="gs-user-info">
              <div className="gs-user-avatar">{user?.email?.[0]?.toUpperCase() || "U"}</div>
              {sidebarOpen && <span className="gs-user-email">{user?.email}</span>}
            </div>
            <button className="gs-logout-btn" onClick={requestLogout} title="Log out">
              <LogOut size={15} />
            </button>
          </div>
        </aside>

        <div className="gs-chat-window">
         <div className="gs-header">
  <div className="gs-header-left">
    <button className="gs-mobile-menu-btn" onClick={() => setSidebarOpen(true)} aria-label="Open menu">
      <Menu size={18} />
    </button>
    <span className="gs-status-dot" />
    <span className="gs-header-title">GNSS Research AI</span>
  </div>
  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
    
    <ThemeToggle />
  </div>
</div>
          <div className="gs-mode-bar">
            {MODES.map((m) => (
              <button
                key={m.id}
                className={`gs-mode-btn ${mode === m.id ? "gs-mode-active" : ""}`}
                onClick={() => setMode(m.id)}
              >
                <m.icon size={15} className="gs-mode-icon" />
                <span className="gs-mode-label">{m.label}</span>
              </button>
            ))}
          </div>

          {mode === "admin" ? (
            <AdminPanel token={adminToken} setToken={setAdminToken} />
          ) : (
            <>
              <div className="gs-message-area">
                {messages.length === 0 && (
                  <div className="gs-empty-state">
                    <div className="gs-empty-icon">
                      <currentMode.icon size={30} strokeWidth={1.5} />
                    </div>
                    <div className="gs-empty-title">{currentMode.label}</div>
                    <div className="gs-empty-sub">
                      {mode === "chat"   && "Ask anything about GNSS, RTK, PPP, or research topics."}
                      {mode === "docs"   && "Upload a document above, then ask questions about it."}
                      {mode === "grants" && "Ask in plain English — e.g. \"Find GNSS PhD scholarships in Europe closing this year.\""}
                      {mode === "proposal" && "Tell me your research topic, and I'll help draft your title, abstract, objectives, methodology, and more."}
                    </div>
                  </div>
                )}

                {messages.map((m, i) => (
                  <div key={i} className={`gs-message-row ${m.role === "user" ? "gs-row-user" : m.role === "system" ? "gs-row-system" : "gs-row-bot"}`}>
                    <div className="gs-message-col">
                      {m.role === "bot" && m.mode === "grants" && (
                        <span className="gs-mode-badge"><GraduationCap size={11} /> Grants</span>
                      )}
                      {m.role === "bot" && m.mode === "docs" && (
                        <span className="gs-mode-badge"><FileText size={11} /> Docs</span>
                      )}

                      {m.role === "user" && editingIndex === i ? (
                        <div className="gs-edit-box">
                          <textarea
                            value={editText}
                            onChange={(e) => setEditText(e.target.value)}
                            className="gs-edit-textarea"
                            rows={Math.min(6, Math.max(2, Math.ceil(editText.length / 40)))}
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && !e.shiftKey) {
                                e.preventDefault();
                                saveEdit(i);
                              }
                              if (e.key === "Escape") cancelEdit();
                            }}
                          />
                          <div className="gs-edit-actions">
                            <button className="gs-edit-cancel-btn" onClick={cancelEdit}>Cancel</button>
                            <button className="gs-edit-save-btn" onClick={() => saveEdit(i)}>
                              <Check size={13} /> Save & Submit
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className={`gs-bubble-wrapper ${m.role === "user" ? "gs-bubble-wrapper-user" : ""}`}>
                          {m.role === "user" ? (
                            <div className="gs-bubble-user">{m.text}</div>
                          ) : m.role === "system" ? (
                            <div className="gs-bubble-system">
                              <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.text}</ReactMarkdown>
                            </div>
                          ) : (
                            <div className="gs-bubble-bot">
                              <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.text}</ReactMarkdown>
                            </div>
                          )}

                          {m.role === "user" && (
                            <button className="gs-edit-trigger-btn" onClick={() => startEdit(i)} title="Edit message">
                              <Pencil size={12} />
                            </button>
                          )}

                          {(m.role === "bot" || m.role === "system") && (
                            <button className="gs-copy-trigger-btn" onClick={() => copyMessage(m.text, i)} title="Copy">
                              {copiedIndex === i ? <Check size={12} /> : <Copy size={12} />}
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {loading && (
                  <div className="gs-message-row gs-row-bot">
                    <div className="gs-loading-indicator">
                      <span className="gs-loading-dot" />
                      <span className="gs-loading-dot" />
                      <span className="gs-loading-dot" />
                      <span className="gs-loading-text">
                        {mode === "grants"   && "Searching grants…"}
                        {mode === "docs"     && "Reading documents…"}
                        {mode === "proposal" && "Drafting response…"}
                        {mode === "chat"     && "Generating response…"}
                      </span>
                    </div>
                  </div>
                )}

                <div ref={bottomRef} />
              </div>

              {mode === "docs" && uploadedDocs.length > 0 && (
                <div className="gs-docs-bar">
                  {uploadedDocs.map((d) => (
                    <span key={d.id} className="gs-doc-tag">
                      <FileText size={12} />
                      {d.name}
                      <span className="gs-doc-chunks">{d.chunkCount} chunks</span>
                      <button className="gs-doc-remove" onClick={() => removeDoc(d.id)} title="Remove">
                        <X size={11} />
                      </button>
                    </span>
                  ))}
                </div>
              )}
              {uploading && (
                <div className="gs-docs-bar">
                  <span className="gs-doc-tag gs-uploading-tag">⏳ Processing file…</span>
                </div>
              )}

              <div className="gs-input-row">
                <div className="gs-input-shell">
                  {mode === "docs" && (
                    <>
                      <button
                        className="gs-attach-btn"
                        onClick={() => fileInputRef.current?.click()}
                        title="Upload file (.txt, .pdf, .csv, .json, .md)"
                        disabled={uploading}
                      >
                        <Paperclip size={17} />
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
                    className="gs-text-input"
                    placeholder={currentMode.placeholder}
                    disabled={uploading}
                  />
                  <button onClick={sendMessage} className="gs-send-btn" disabled={loading || uploading}>
                    <Satellite size={16} />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {showLogoutConfirm && (
        <div className="modal-overlay" onClick={cancelLogout}>  
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-icon">
              <LogOut size={22} />
            </div>
            <h3 className="modal-title">Log out?</h3>
            <p className="modal-text">You'll need to sign in again to access your chats.</p>
            <div className="modal-actions">
              <button className="modal-btn modal-btn-cancel" onClick={cancelLogout} disabled={isLoggingOut}>Cancel</button>
              <button className="modal-btn modal-btn-confirm" onClick={confirmLogout} disabled={isLoggingOut}>
                {isLoggingOut ? <span className="loader-spinner modal-loader-spinner" /> : "Log out"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}