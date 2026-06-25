// Role-Based Access Control enforcement middleware
// Runs after JWT authentication middleware (req.user must already be populated)

import { roleHasPermission, ROLE_PERMISSIONS } from "../config/roles.js";
import User from "../models/User.js";

/**
 * Factory function that returns an Express middleware enforcing a required permission.
 *
 * Usage in route files:
 *   router.get("/admin/users", authenticate, checkPermission("manage:users"), getAllUsers);
 *
 * @param {string} requiredPermission - One of the PERMISSIONS values from roles.js
 * @returns {Function} Express middleware (req, res, next)
 */
export function checkPermission(requiredPermission) {
  return async function rbacGate(req, res, next) {
    try {
      // Guard: authentication middleware must have populated req.user
      if (!req.user || !req.user.id || !req.user.role) {
        return res.status(401).json({
          success: false,
          error: "UNAUTHENTICATED",
          message: "Authentication credentials are missing or invalid.",
        });
      }

      const { id: userId, role, email } = req.user;
      const hasPermission = roleHasPermission(role, requiredPermission);

      if (!hasPermission) {
        // ── Security audit: persist the unauthorized access attempt ──────────
        const unauthorizedLog = {
          EVENT_TYPE: "UNAUTHORIZED_ACCESS_ATTEMPT",
          timestamp: new Date(),
          userId,
          email: email ?? "unknown",
          role,
          requiredPermission,
          endpoint: req.originalUrl,
          method: req.method,
          ip: req.ip ?? req.connection?.remoteAddress ?? "unknown",
          userAgent: req.headers["user-agent"] ?? "unknown",
          severity: "HIGH",
        };

        // Persist log to the user's securityLogs array (non-blocking — we do
        // not await this so the 403 is returned to the client immediately while
        // the DB write completes in the background).
        User.findByIdAndUpdate(
          userId,
          { $push: { securityLogs: unauthorizedLog } },
          { new: false }
        ).catch((dbErr) => {
          console.error(
            "[RBAC] Failed to persist security log for user",
            userId,
            dbErr
          );
        });

        // Structured console output for server-side SIEM / log aggregators
        console.warn(
          JSON.stringify({
            level: "WARN",
            ...unauthorizedLog,
          })
        );

        return res.status(403).json({
          success: false,
          error: "FORBIDDEN",
          message: `Access denied. Your current role '${role}' does not have the required permission: '${requiredPermission}'.`,
          EVENT_TYPE: "UNAUTHORIZED_ACCESS_ATTEMPT",
          timestamp: unauthorizedLog.timestamp,
        });
      }

      // Permission verified — continue to the next handler
      next();
    } catch (err) {
      console.error("[RBAC] Unexpected error in rbacGate middleware:", err);
      return res.status(500).json({
        success: false,
        error: "INTERNAL_SERVER_ERROR",
        message: "An internal error occurred during permission verification.",
      });
    }
  };
}

/**
 * Middleware that restricts a route to a specific list of roles.
 * Useful as a lightweight alternative when you want role-level (not permission-level) gating.
 *
 * Usage:
 *   router.delete("/users/:id", authenticate, requireRole("admin"), deleteUser);
 *
 * @param {...string} allowedRoles - One or more role strings
 * @returns {Function} Express middleware
 */
export function requireRole(...allowedRoles) {
  return async function roleGate(req, res, next) {
    try {
      if (!req.user || !req.user.role) {
        return res.status(401).json({
          success: false,
          error: "UNAUTHENTICATED",
          message: "Authentication credentials are missing.",
        });
      }

      const { role, id: userId, email } = req.user;

      if (!allowedRoles.includes(role)) {
        const unauthorizedLog = {
          EVENT_TYPE: "ROLE_ACCESS_DENIED",
          timestamp: new Date(),
          userId,
          email: email ?? "unknown",
          userRole: role,
          allowedRoles,
          endpoint: req.originalUrl,
          method: req.method,
          ip: req.ip ?? req.connection?.remoteAddress ?? "unknown",
          severity: "HIGH",
        };

        User.findByIdAndUpdate(
          userId,
          { $push: { securityLogs: unauthorizedLog } },
          { new: false }
        ).catch((dbErr) =>
          console.error("[RBAC] DB log write error:", dbErr)
        );

        console.warn(JSON.stringify({ level: "WARN", ...unauthorizedLog }));

        return res.status(403).json({
          success: false,
          error: "FORBIDDEN",
          message: `Role '${role}' is not permitted to access this resource.`,
        });
      }

      next();
    } catch (err) {
      console.error("[RBAC] Unexpected error in roleGate middleware:", err);
      return res.status(500).json({
        success: false,
        error: "INTERNAL_SERVER_ERROR",
        message: "Permission check failed due to an internal error.",
      });
    }
  };
}
