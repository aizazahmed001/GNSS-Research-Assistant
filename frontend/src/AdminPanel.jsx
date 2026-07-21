import { useState, useEffect } from "react";
import { API_URL } from "./config";

export default function AdminPanel({ token, setToken }) {
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [grants, setGrants] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [editingGrant, setEditingGrant] = useState(null);

  const emptyGrant = {
    title: "", country: "", funding_agency: "", eligibility: "",
    deadline: "", required_documents: "", application_link: "",
    research_domain: "", funding_type: "", grant_category: "", description: "",
  };
  const [form, setForm] = useState(emptyGrant);

  useEffect(() => {
    if (token) {
      fetchGrants();
      fetchDocuments();
    }
  }, [token]);

  async function login() {
    setLoginError("");
    try {
      const res = await fetch(`${API_URL}/api/admin/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) throw new Error("Incorrect password");
      const data = await res.json();
      setToken(data.token);
      sessionStorage.setItem("admin_token", data.token);
    } catch (err) {
      setLoginError(err.message);
    }
  }

  function logout() {
    setToken(null);
    sessionStorage.removeItem("admin_token");
  }

  async function fetchGrants() {
    const res = await fetch(`${API_URL}/api/grants`);
    const data = await res.json();
    setGrants(data.grants || []);
  }

  async function fetchDocuments() {
    const res = await fetch(`${API_URL}/api/documents`);
    const data = await res.json();
    setDocuments(data.documents || []);
  }

  async function saveGrant() {
    const isEdit = Boolean(editingGrant);
    const url = isEdit
      ? `${API_URL}/api/grants/${editingGrant.id}`
      : `${API_URL}/api/grants`;
    const method = isEdit ? "PUT" : "POST";

    const res = await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(form),
    });

    if (res.ok) {
      setForm(emptyGrant);
      setEditingGrant(null);
      fetchGrants();
    } else {
      alert("Failed to save grant — check console for details.");
    }
  }

  async function deleteGrant(id) {
    if (!confirm("Delete this grant permanently?")) return;
    await fetch(`${API_URL}/api/grants/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    fetchGrants();
  }

  async function deleteDocument(id) {
    if (!confirm("Delete this document permanently?")) return;
    await fetch(`${API_URL}/api/documents/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    fetchDocuments();
  }

  function startEdit(grant) {
    setEditingGrant(grant);
    setForm(grant);
  }

  if (!token) {
    return (
      <div className="admin-login">
        <h3>Admin Login</h3>
        <input
          type="password"
          placeholder="Admin password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && login()}
          className="text-input"
        />
        <button onClick={login} className="send-btn" style={{ marginTop: 10 }}>
          Log in
        </button>
        {loginError && <p style={{ color: "#f66" }}>{loginError}</p>}
      </div>
    );
  }

  return (
    <div className="admin-panel">
      <div className="admin-header">
        <h3>Admin Panel</h3>
        <button onClick={logout} className="mode-btn">Log out</button>
      </div>

      {/* EXPORT BUTTONS */}
      <div className="export-bar" style={{ display: "flex", gap: 8, margin: "12px 0 20px" }}>
        <a href={`${API_URL}/api/export/pdf`} className="send-btn" style={{ textDecoration: "none", display: "inline-block" }}>
          Export PDF
        </a>
        <a href={`${API_URL}/api/export/docx`} className="send-btn" style={{ textDecoration: "none", display: "inline-block" }}>
          Export Word
        </a>
      </div>

      <h4>{editingGrant ? "Edit Grant" : "Add New Grant"}</h4>
      <div className="admin-form">
        {Object.keys(emptyGrant).map((field) => (
          <input
            key={field}
            placeholder={field.replace(/_/g, " ")}
            value={form[field] || ""}
            onChange={(e) => setForm({ ...form, [field]: e.target.value })}
            className="text-input"
          />
        ))}
        <button onClick={saveGrant} className="send-btn">
          {editingGrant ? "Update Grant" : "Add Grant"}
        </button>
        {editingGrant && (
          <button onClick={() => { setEditingGrant(null); setForm(emptyGrant); }} className="mode-btn">
            Cancel Edit
          </button>
        )}
      </div>

      <h4>Existing Grants ({grants.length})</h4>
      <div className="admin-list">
        {grants.map((g) => (
          <div key={g.id} className="admin-list-item">
            <span>{g.title} — {g.country}</span>
            <div>
              <button onClick={() => startEdit(g)} className="mode-btn">Edit</button>
              <button onClick={() => deleteGrant(g.id)} className="mode-btn">Delete</button>
            </div>
          </div>
        ))}
      </div>

      <h4>Uploaded Documents ({documents.length})</h4>
      <div className="admin-list">
        {documents.map((d) => (
          <div key={d.id} className="admin-list-item">
            <span>{d.name} ({d.chunkCount} chunks)</span>
            <button onClick={() => deleteDocument(d.id)} className="mode-btn">Delete</button>
          </div>
        ))}
      </div>
    </div>
  );
}