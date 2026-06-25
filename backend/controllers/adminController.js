// Administrative data actions — user management, role modification, security audit streaming

import mongoose from "mongoose";
import User from "../models/User.js";
import { VALID_ROLES } from "../config/roles.js";

// ─── Helper ────────────────────────────────────────────────────────────────────

/**
 * Builds a structured global security log entry and pushes it to the
 * performing admin's securityLogs array. Used for high-severity audit trails.
 *
 * @param {string} adminId       - The admin user's Mongoose _id
 * @param {object} logPayload    - Arbitrary metadata about the event
 * @param {import("express").Request} req
 */
async function writeGlobalSecurityLog(adminId, logPayload, req) {
  const entry = {
    ...logPayload,
    timestamp: new Date(),
    performedBy: adminId,
    ip: req.ip ?? req.connection?.remoteAddress ?? "unknown",
    userAgent: req.headers["user-agent"] ?? "unknown",
  };

  await User.findByIdAndUpdate(
    adminId,
    { $push: { securityLogs: entry } },
    { new: false }
  );

  // Emit to stdout for external SIEM / log shipper
  console.info(JSON.stringify({ level: "AUDIT", ...entry }));
}

// ─── Controllers ───────────────────────────────────────────────────────────────

/**
 * GET /api/admin/users
 * Returns a paginated list of all system users with their active roles.
 *
 * Query params:
 *   page     {number}  default 1
 *   limit    {number}  default 20  (max 100)
 *   role     {string}  optional role filter
 *   search   {string}  optional name/email search
 *   sortBy   {string}  field to sort by (default: createdAt)
 *   sortDir  {string}  "asc" | "desc" (default: "desc")
 */
export async function getAllUsers(req, res) {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const skip = (page - 1) * limit;
    const roleFilter = req.query.role;
    const searchQuery = req.query.search?.trim();
    const sortBy = req.query.sortBy || "createdAt";
    const sortDir = req.query.sortDir === "asc" ? 1 : -1;

    // Build filter object
    const filter = {};

    if (roleFilter && VALID_ROLES.includes(roleFilter)) {
      filter.role = roleFilter;
    }

    if (searchQuery) {
      filter.$or = [
        { name: { $regex: searchQuery, $options: "i" } },
        { email: { $regex: searchQuery, $options: "i" } },
      ];
    }

    const [users, totalCount] = await Promise.all([
      User.find(filter)
        .select(
          "name email role createdAt lastLogin isActive profilePicture cgpa"
        )
        .sort({ [sortBy]: sortDir })
        .skip(skip)
        .limit(limit)
        .lean(),
      User.countDocuments(filter),
    ]);

    const totalPages = Math.ceil(totalCount / limit);

    return res.status(200).json({
      success: true,
      data: {
        users,
        pagination: {
          currentPage: page,
          totalPages,
          totalCount,
          limit,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1,
        },
      },
    });
  } catch (err) {
    console.error("[adminController.getAllUsers] Error:", err);
    return res.status(500).json({
      success: false,
      error: "INTERNAL_SERVER_ERROR",
      message: "Failed to retrieve user list.",
    });
  }
}

/**
 * PATCH /api/admin/users/:userId/role
 * Updates a target user's role and records a ROLE_MODIFIED security audit log.
 *
 * Body:
 *   newRole {string} — must be one of VALID_ROLES
 */
export async function updateUserRole(req, res) {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { userId } = req.params;
    const { newRole } = req.body;
    const adminId = req.user.id;

    // ── Validation ────────────────────────────────────────────────────────────

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        success: false,
        error: "INVALID_USER_ID",
        message: "The provided userId is not a valid ObjectId.",
      });
    }

    if (!newRole || !VALID_ROLES.includes(newRole)) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        success: false,
        error: "INVALID_ROLE",
        message: `'${newRole}' is not a valid role. Accepted values: ${VALID_ROLES.join(", ")}.`,
      });
    }

    // Prevent self-role modification to guard against privilege escalation
    if (userId === adminId) {
      await session.abortTransaction();
      session.endSession();
      return res.status(403).json({
        success: false,
        error: "SELF_MODIFICATION_DENIED",
        message: "Administrators cannot modify their own role.",
      });
    }

    // ── Fetch target user ─────────────────────────────────────────────────────

    const targetUser = await User.findById(userId).session(session);

    if (!targetUser) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({
        success: false,
        error: "USER_NOT_FOUND",
        message: `No user found with id: ${userId}`,
      });
    }

    const previousRole = targetUser.role;

    if (previousRole === newRole) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        success: false,
        error: "ROLE_UNCHANGED",
        message: `User already has the role '${newRole}'. No changes made.`,
      });
    }

    // ── Apply role change ─────────────────────────────────────────────────────

    targetUser.role = newRole;

    const roleModificationLog = {
      EVENT_TYPE: "ROLE_MODIFIED",
      timestamp: new Date(),
      severity: "HIGH",
      targetUserId: userId,
      targetUserEmail: targetUser.email,
      previousRole,
      newRole,
      performedBy: adminId,
      performedByEmail: req.user.email,
      ip: req.ip ?? req.connection?.remoteAddress ?? "unknown",
      userAgent: req.headers["user-agent"] ?? "unknown",
    };

    // Push log into target user's record and the admin's audit trail
    targetUser.securityLogs.push(roleModificationLog);
    await targetUser.save({ session });

    await User.findByIdAndUpdate(
      adminId,
      { $push: { securityLogs: roleModificationLog } },
      { session, new: false }
    );

    await session.commitTransaction();
    session.endSession();

    // Structured audit log for external SIEM
    console.info(JSON.stringify({ level: "AUDIT", ...roleModificationLog }));

    return res.status(200).json({
      success: true,
      message: `User role successfully updated from '${previousRole}' to '${newRole}'.`,
      data: {
        userId,
        email: targetUser.email,
        name: targetUser.name,
        previousRole,
        newRole,
        modifiedAt: roleModificationLog.timestamp,
      },
    });
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    console.error("[adminController.updateUserRole] Error:", err);
    return res.status(500).json({
      success: false,
      error: "INTERNAL_SERVER_ERROR",
      message: "Failed to update user role due to an internal error.",
    });
  }
}

/**
 * GET /api/admin/security-logs
 * Streams paginated security logs across all users for the Admin audit panel.
 *
 * Query params:
 *   page         {number}  default 1
 *   limit        {number}  default 50
 *   eventType    {string}  filter by EVENT_TYPE
 *   severity     {string}  filter by severity (LOW | MEDIUM | HIGH | CRITICAL)
 *   startDate    {string}  ISO date string
 *   endDate      {string}  ISO date string
 */
export async function getGlobalSecurityLogs(req, res) {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(200, Math.max(1, parseInt(req.query.limit) || 50));
    const skip = (page - 1) * limit;
    const { eventType, severity, startDate, endDate } = req.query;

    // Build a pipeline that unwinds securityLogs across all users
    const matchStage = {};

    if (eventType) matchStage["securityLogs.EVENT_TYPE"] = eventType;
    if (severity) matchStage["securityLogs.severity"] = severity;
    if (startDate || endDate) {
      matchStage["securityLogs.timestamp"] = {};
      if (startDate) matchStage["securityLogs.timestamp"].$gte = new Date(startDate);
      if (endDate) matchStage["securityLogs.timestamp"].$lte = new Date(endDate);
    }

    const pipeline = [
      { $unwind: "$securityLogs" },
      { $match: matchStage },
      { $sort: { "securityLogs.timestamp": -1 } },
      {
        $facet: {
          logs: [
            { $skip: skip },
            { $limit: limit },
            {
              $project: {
                _id: 0,
                ownerEmail: "$email",
                ownerName: "$name",
                log: "$securityLogs",
              },
            },
          ],
          totalCount: [{ $count: "count" }],
        },
      },
    ];

    const [result] = await User.aggregate(pipeline);
    const logs = result?.logs ?? [];
    const totalCount = result?.totalCount?.[0]?.count ?? 0;
    const totalPages = Math.ceil(totalCount / limit);

    return res.status(200).json({
      success: true,
      data: {
        logs,
        pagination: {
          currentPage: page,
          totalPages,
          totalCount,
          limit,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1,
        },
      },
    });
  } catch (err) {
    console.error("[adminController.getGlobalSecurityLogs] Error:", err);
    return res.status(500).json({
      success: false,
      error: "INTERNAL_SERVER_ERROR",
      message: "Failed to retrieve security logs.",
    });
  }
}

/**
 * DELETE /api/admin/users/:userId
 * Permanently removes a user from the platform. Restricted to admin only.
 */
export async function deleteUser(req, res) {
  try {
    const { userId } = req.params;
    const adminId = req.user.id;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        error: "INVALID_USER_ID",
        message: "The provided userId is not a valid ObjectId.",
      });
    }

    if (userId === adminId) {
      return res.status(403).json({
        success: false,
        error: "SELF_DELETE_DENIED",
        message: "Administrators cannot delete their own account.",
      });
    }

    const deleted = await User.findByIdAndDelete(userId);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: "USER_NOT_FOUND",
        message: `No user found with id: ${userId}`,
      });
    }

    await writeGlobalSecurityLog(
      adminId,
      {
        EVENT_TYPE: "USER_DELETED",
        severity: "CRITICAL",
        targetUserId: userId,
        targetEmail: deleted.email,
        performedByEmail: req.user.email,
      },
      req
    );

    return res.status(200).json({
      success: true,
      message: `User '${deleted.email}' has been permanently deleted.`,
    });
  } catch (err) {
    console.error("[adminController.deleteUser] Error:", err);
    return res.status(500).json({
      success: false,
      error: "INTERNAL_SERVER_ERROR",
      message: "Failed to delete user.",
    });
  }
}

/**
 * GET /api/admin/stats
 * Returns high-level platform statistics for the admin dashboard.
 */
export async function getPlatformStats(req, res) {
  try {
    const [roleCounts, recentUsers, totalUsers] = await Promise.all([
      User.aggregate([
        { $group: { _id: "$role", count: { $sum: 1 } } },
      ]),
      User.find()
        .sort({ createdAt: -1 })
        .limit(5)
        .select("name email role createdAt")
        .lean(),
      User.countDocuments(),
    ]);

    const roleMap = {};
    for (const rc of roleCounts) {
      roleMap[rc._id] = rc.count;
    }

    return res.status(200).json({
      success: true,
      data: {
        totalUsers,
        byRole: {
          student: roleMap.student ?? 0,
          mentor: roleMap.mentor ?? 0,
          admin: roleMap.admin ?? 0,
        },
        recentUsers,
      },
    });
  } catch (err) {
    console.error("[adminController.getPlatformStats] Error:", err);
    return res.status(500).json({
      success: false,
      error: "INTERNAL_SERVER_ERROR",
      message: "Failed to retrieve platform statistics.",
    });
  }
}
