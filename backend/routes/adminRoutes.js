import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import { checkPermission } from "../middleware/rbac.js";
import {
  getAllUsers,
  updateUserRole,
  getGlobalSecurityLogs,
  deleteUser,
  getPlatformStats,
} from "../controllers/adminController.js";

const router = express.Router();

// Enforce auth on all admin endpoints
router.use(protect);

router.get("/users", checkPermission("manage:users"), getAllUsers);
router.patch("/users/:userId/role", checkPermission("manage:users"), updateUserRole);
router.delete("/users/:userId", checkPermission("manage:users"), deleteUser);
router.get("/security-logs", checkPermission("view:system_audit"), getGlobalSecurityLogs);
router.get("/stats", checkPermission("view:system_audit"), getPlatformStats);

export default router;
