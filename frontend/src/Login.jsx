import { useState, useEffect, useRef } from "react";
import { API_URL } from "./config";
import logo from "./assets/logo.webp";
import { Satellite } from "lucide-react";
import ThemeToggle from "./ThemeToggle";


export default function Login({ onLogin }) {
  const [mode, setMode] = useState("login"); // "login" | "signup"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const googleBtnRef = useRef(null);

  useEffect(() => {
    if (!window.google || !googleBtnRef.current) return;
    window.google.accounts.id.initialize({
      client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
      callback: handleGoogleResponse,
    });
    window.google.accounts.id.renderButton(googleBtnRef.current, {
      theme: "filled_black",
      size: "large",
      width: 320,
      shape: "pill",
    });
  }, []);

  async function handleGoogleResponse(response) {
    try {
      const res = await fetch(`${API_URL}/api/auth/google`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ credential: response.credential }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Google login failed");
      onLogin(data.token, data.user);
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    try {
      const endpoint = mode === "login" ? "/api/auth/login" : "/api/auth/signup";
      const res = await fetch(`${API_URL}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, name }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong");
      onLogin(data.token, data.user);
    } catch (err) {
      setError(err.message);
    }
  }



  return (
    <div className="auth-page">
      <div className="theme-toggle-corner">
    <ThemeToggle />
  </div>
      {/* Subtle orbital background lines — decorative only */}
      <div className="auth-orbit auth-orbit-1" />
      <div className="auth-orbit auth-orbit-2" />
      <div className="auth-glow auth-glow-cyan" />
      <div className="auth-glow auth-glow-indigo" />

      <div className="auth-card">
        <div className="auth-brand">
          <div className="auth-brand-icon">
            <img src={logo} alt="" className="auth-brand-logo" />
            <span className="auth-brand-ping" />
          </div>
          <h1 className="auth-title">GNSS Research AI</h1>
          <p className="auth-subtitle">
            {mode === "login" ? "Welcome back — log in to continue" : "Create your account to get started"}
          </p>
        </div>

        <div className="auth-google-wrapper" ref={googleBtnRef} />

        <div className="auth-divider"><span>or continue with email</span></div>

        <form onSubmit={handleSubmit} className="auth-form">
          {mode === "signup" && (
            <div className="auth-field">
              <input
                placeholder="Full name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="auth-input"
              />
            </div>
          )}
          <div className="auth-field">
            <input
              type="email"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="auth-input"
              required
            />
          </div>
          <div className="auth-field">
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="auth-input"
              required
            />
          </div>

          {error && <p className="auth-error">{error}</p>}

          <button type="submit" className="auth-submit-btn">
            <Satellite size={15} />
            {mode === "login" ? "Log In" : "Create Account"}
          </button>
        </form>

        <p className="auth-switch">
          {mode === "login" ? "Don't have an account? " : "Already have an account? "}
          <button className="auth-switch-btn" onClick={() => { setMode(mode === "login" ? "signup" : "login"); setError(""); }}>
            {mode === "login" ? "Sign up" : "Log in"}
          </button>
        </p>
      </div>
    </div>
  );
}