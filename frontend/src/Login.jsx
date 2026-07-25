import { useState, useEffect, useRef } from "react";
import { API_URL } from "./config";
import logo from "./assets/logo.webp";

export default function Login({ onLogin }) {
  const [mode, setMode] = useState("login"); // "login" | "signup" | "verify"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
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
    setInfo("");
    try {
      const endpoint = mode === "login" ? "/api/auth/login" : "/api/auth/signup";
      const res = await fetch(`${API_URL}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, name }),
      });
      const data = await res.json();

      if (!res.ok) {
        if (data.requiresVerification) {
          setMode("verify");
          setInfo("Please enter the verification code sent to your email.");
          return;
        }
        throw new Error(data.error || "Something went wrong");
      }

      if (data.requiresVerification) {
        setMode("verify");
        setInfo(`We've sent a verification code to ${email}.`);
        return;
      }

      onLogin(data.token, data.user);
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleVerify(e) {
    e.preventDefault();
    setError("");
    try {
      const res = await fetch(`${API_URL}/api/auth/verify-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Verification failed");
      onLogin(data.token, data.user);
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleResend() {
    setError("");
    setInfo("");
    try {
      const res = await fetch(`${API_URL}/api/auth/resend-code`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to resend code");
      setInfo("A new code has been sent to your email.");
    } catch (err) {
      setError(err.message);
    }
  }

  if (mode === "verify") {
    return (
      <div className="login-page">
        <div className="login-card">
          <img src={logo} alt="GNSS Research Assistant logo" className="login-logo" />
          <h1 className="login-title">Verify your email</h1>
          <p className="login-sub">{info || `Enter the code sent to ${email}`}</p>

          <form onSubmit={handleVerify} className="login-form">
            <input
              placeholder="6-digit code"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              className="text-input"
              style={{ textAlign: "center", letterSpacing: "6px", fontSize: "18px" }}
              maxLength={6}
              required
              autoFocus
            />
            {error && <p className="login-error">{error}</p>}
            <button type="submit" className="send-btn login-submit">
              Verify & Continue
            </button>
          </form>

          <p className="login-switch">
            Didn't get a code?{" "}
            <button className="login-switch-btn" onClick={handleResend}>
              Resend code
            </button>
          </p>
          <p className="login-switch">
            <button className="login-switch-btn" onClick={() => { setMode("login"); setError(""); setInfo(""); }}>
              ← Back to login
            </button>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <img src={logo} alt="GNSS Research Assistant logo" className="login-logo" />
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
          <button className="login-switch-btn" onClick={() => { setMode(mode === "login" ? "signup" : "login"); setError(""); }}>
            {mode === "login" ? "Sign up" : "Log in"}
          </button>
        </p>
      </div>
    </div>
  );
}