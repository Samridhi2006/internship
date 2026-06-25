import jwt from "jsonwebtoken";
import User from "../models/User.js";

const JWT_SECRET = process.env.JWT_SECRET || "supersecretsecuritytokenkeysystem123!";

export async function protect(req, res, next) {
  try {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
      token = req.headers.authorization.split(" ")[1];
    }

    if (!token) {
      return res.status(401).json({ success: false, message: "Not authorized to access this route" });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Check if user still exists and if session is still active
    const user = await User.findById(decoded.sub).select("+activeSessions");
    if (!user) {
      return res.status(401).json({ success: false, message: "User no longer exists" });
    }

    const sessionActive = user.activeSessions.some(
      (session) => session._id.toString() === decoded.sessionId
    );

    if (!sessionActive) {
      return res.status(401).json({ success: false, message: "Session has been revoked or expired" });
    }

    req.user = {
      ...decoded,
      id: decoded.id || decoded.sub,
      role: decoded.role || user.role
    };
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: "Token verification failed" });
  }
}
