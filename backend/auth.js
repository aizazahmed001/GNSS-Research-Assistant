const crypto = require("crypto");

function signToken(secret) {
  const payload = `admin:${Date.now()}`;
  const signature = crypto.createHmac("sha256", secret).update(payload).digest("hex");
  return Buffer.from(`${payload}:${signature}`).toString("base64");
}

function verifyToken(token, secret) {
  try {
    const decoded = Buffer.from(token, "base64").toString("utf-8");
    const [role, timestamp, signature] = decoded.split(":");
    const payload = `${role}:${timestamp}`;
    const expected = crypto.createHmac("sha256", secret).update(payload).digest("hex");
    return signature === expected;
  } catch {
    return false;
  }
}

function requireAdmin(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing or invalid authorization header" });
  }

  const token = authHeader.replace("Bearer ", "");
  if (!verifyToken(token, process.env.ADMIN_TOKEN_SECRET)) {
    return res.status(403).json({ error: "Invalid or expired token" });
  }

  next();
}

module.exports = { signToken, verifyToken, requireAdmin };