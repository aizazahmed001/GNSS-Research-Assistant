import { useState, useEffect, useRef } from "react";
import { API_URL } from "./config";

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
      width: 280,
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
    <div className="login-page">
      <div className="login-card">
        <h1 className="login-title">GNSS Research Assistant</h1>
        <p className="login-sub">{mode === "login" ? "Log in to continue" : "Create your account"}</p>

        <div ref={googleBtnRef} className="google-btn-wrapper" />

        <div className="login-divider"><span>or</span></div>

        <form onSubmit={handleSubmit} className="login-form">
          {mode === "signup" && (
            <input
              placeholder="Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="text-input"
            />
          )}
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="text-input"
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="text-input"
            required
          />
          {error && <p className="login-error">{error}</p>}
          <button type="submit" className="send-btn login-submit">
            {mode === "login" ? "Log In" : "Sign Up"}
          </button>
        </form>

        <p className="login-switch">
          {mode === "login" ? "Don't have an account? " : "Already have an account? "}
          <button className="login-switch-btn" onClick={() => setMode(mode === "login" ? "signup" : "login")}>
            {mode === "login" ? "Sign up" : "Log in"}
          </button>
        </p>
      </div>
    </div>
  );
}