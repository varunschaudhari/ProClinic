import express from "express";
import { login, getMe, register } from "../controllers/authController.js";
import { protect, authorize } from "../middleware/auth.js";

const router = express.Router();

// Public routes
router.post("/login", login);

// Protected routes
router.get("/me", protect, getMe);
router.post("/register", protect, authorize("admin"), register);

export default router;
