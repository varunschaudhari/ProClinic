import express from "express";
import {
  getWards,
  getWard,
  createWard,
  updateWard,
  deleteWard,
  getWardStats,
} from "../controllers/wardController.js";
import { protect, hasPermission } from "../middleware/auth.js";
import { PERMISSIONS } from "../constants/permissions.js";

const router = express.Router();

// All routes require authentication
router.use(protect);

// Stats route
router.get("/stats", hasPermission(PERMISSIONS.WARDS_VIEW), getWardStats);

// Main routes
router
  .route("/")
  .get(hasPermission(PERMISSIONS.WARDS_VIEW), getWards)
  .post(hasPermission(PERMISSIONS.WARDS_CREATE), createWard);

router
  .route("/:id")
  .get(hasPermission(PERMISSIONS.WARDS_VIEW), getWard)
  .put(hasPermission(PERMISSIONS.WARDS_EDIT), updateWard)
  .delete(hasPermission(PERMISSIONS.WARDS_DELETE), deleteWard);

export default router;
