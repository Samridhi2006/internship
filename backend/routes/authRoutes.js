import express from "express";
import { register, verifyEmail, login, requestPasswordReset, resetPassword } from "../controllers/authController.js";

const router = express.Router();

router.post("/register", register);
router.get("/verify-email/:token", verifyEmail);
router.post("/login", login);
router.post("/request-reset", requestPasswordReset);
router.post("/reset-password/:token", resetPassword);

export default router;
