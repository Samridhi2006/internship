import User from "../models/User.js";

function extractIpAddress(req) {
  const forwarded = req.headers["x-forwarded-for"];
  if (forwarded) return forwarded.split(",")[0].trim();
  return req.headers["x-real-ip"] || req.connection?.remoteAddress || req.socket?.remoteAddress || "0.0.0.0";
}

function parseUserAgentSimple(userAgentString) {
  const ua = userAgentString || "";
  let deviceType = "desktop";
  let os = "Unknown OS";
  let browser = "Unknown Browser";
  if (/mobile/i.test(ua)) deviceType = "mobile";
  else if (/tablet|ipad/i.test(ua)) deviceType = "tablet";
  if (/windows nt/i.test(ua)) os = "Windows";
  else if (/mac os x/i.test(ua)) os = "macOS";
  else if (/linux/i.test(ua)) os = "Linux";
  if (/chrome\//i.test(ua) && !/edg\//i.test(ua)) browser = "Chrome";
  else if (/firefox\//i.test(ua)) browser = "Firefox";
  else if (/safari\//i.test(ua)) browser = "Safari";
  return { deviceType, os, browser, userAgent: ua };
}

export async function getActiveSessions(req, res) {
  const user = await User.findById(req.user.sub).select("activeSessions name email");
  if (!user) return res.status(404).json({ success: false, message: "User not found." });
  const sessions = user.activeSessions.map((session) => ({
    id: session._id.toString(),
    deviceType: session.deviceType,
    os: session.os,
    browser: session.browser,
    ipAddress: session.ipAddress,
    location: session.location,
    lastActive: session.lastActive,
    createdAt: session.createdAt,
    isCurrent: session._id.toString() === req.user.sessionId,
  }));
  return res.status(200).json({ success: true, data: { sessions, totalCount: sessions.length } });
}

export async function revokeSession(req, res) {
  const user = await User.findById(req.user.sub).select("+activeSessions +securityLogs");
  if (!user) return res.status(404).json({ success: false, message: "User not found." });
  const sessionToRevoke = user.activeSessions.find((s) => s._id.toString() === req.params.sessionId);
  if (!sessionToRevoke) return res.status(404).json({ success: false, message: "Session already revoked." });

  user.activeSessions = user.activeSessions.filter((s) => s._id.toString() !== req.params.sessionId);
  user.securityLogs.push({ timestamp: new Date(), eventType: "SESSION_REVOKED", ipAddress: extractIpAddress(req), deviceDetails: parseUserAgentSimple(req.headers["user-agent"]), status: "SUCCESS", metadata: { revokedSessionId: req.params.sessionId, revokedIpAddress: sessionToRevoke.ipAddress } });
  await user.save();
  return res.status(200).json({ success: true, message: "Session revoked cleanly." });
}

export async function revokeAllOtherSessions(req, res) {
  const user = await User.findById(req.user.sub).select("+activeSessions +securityLogs");
  if (!user) return res.status(404).json({ success: false, message: "User not found." });
  const count = user.activeSessions.filter((s) => s._id.toString() !== req.user.sessionId).length;
  user.activeSessions = user.activeSessions.filter((s) => s._id.toString() === req.user.sessionId);
  user.securityLogs.push({ timestamp: new Date(), eventType: "SESSION_REVOKED", ipAddress: extractIpAddress(req), deviceDetails: parseUserAgentSimple(req.headers["user-agent"]), status: "SUCCESS", metadata: { revokedCount: count, action: "REVOKE_ALL_OTHER" } });
  await user.save();
  return res.status(200).json({ success: true, message: `All other ${count} sessions revoked.` });
}

export async function getSecurityLogs(req, res) {
  const user = await User.findById(req.user.sub).select("securityLogs");
  if (!user) return res.status(404).json({ success: false, message: "User not found." });
  let logs = [...user.securityLogs].reverse();
  const page = parseInt(req.query.page) || 1, limit = parseInt(req.query.limit) || 20;
  return res.status(200).json({ success: true, data: { logs: logs.slice((page - 1) * limit, page * limit), pagination: { page, limit, totalCount: logs.length, totalPages: Math.ceil(logs.length / limit) } } });
}

export async function getSecuritySummary(req, res) {
  const user = await User.findById(req.user.sub).select("activeSessions securityLogs loginAttempts lockoutUntil lastLoginAt lastLoginIp isVerified");
  if (!user) return res.status(404).json({ success: false, message: "User not found." });
  const recentLogs = user.securityLogs.slice(-100);
  return res.status(200).json({ success: true, data: { accountStatus: user.lockoutUntil > new Date() ? "LOCKED" : recentLogs.filter(l => l.eventType === "SUSPICIOUS_LOGIN").length > 0 ? "SUSPICIOUS" : "SECURE", isLockedOut: user.lockoutUntil > new Date(), lockoutUntil: user.lockoutUntil, activeSessionCount: user.activeSessions.length, lastLoginAt: user.lastLoginAt, lastLoginIp: user.lastLoginIp, isVerified: user.isVerified } });
}
