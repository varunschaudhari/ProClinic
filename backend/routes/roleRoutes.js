import express from "express";
import {
  getRoles,
  getRole,
  createRole,
  updateRole,
  deleteRole,
  getPermissions,
} from "../controllers/roleController.js";
import { protect, authorize } from "../middleware/auth.js";

const router = express.Router();

// All routes require authentication and admin role
router.use(protect);
router.use(authorize("admin"));

router.route("/").get(getRoles).post(createRole);
router.route("/permissions").get(getPermissions);
router.route("/:id").get(getRole).put(updateRole).delete(deleteRole);

export default router;
