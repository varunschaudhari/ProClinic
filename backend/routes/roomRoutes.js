import express from "express";
import {
  getRooms,
  getRoom,
  createRoom,
  updateRoom,
  deleteRoom,
  getAvailableBeds,
  getRoomStats,
} from "../controllers/roomController.js";
import { protect, hasPermission } from "../middleware/auth.js";
import { PERMISSIONS } from "../constants/permissions.js";

const router = express.Router();

// All routes require authentication
router.use(protect);

router
  .route("/")
  .get(hasPermission(PERMISSIONS.IPD_VIEW), getRooms)
  .post(hasPermission(PERMISSIONS.IPD_EDIT), createRoom);

router.get("/available-beds", hasPermission(PERMISSIONS.IPD_VIEW), getAvailableBeds);
router.get("/stats", hasPermission(PERMISSIONS.IPD_VIEW), getRoomStats);

router
  .route("/:id")
  .get(hasPermission(PERMISSIONS.IPD_VIEW), getRoom)
  .put(hasPermission(PERMISSIONS.IPD_EDIT), updateRoom)
  .delete(hasPermission(PERMISSIONS.IPD_DELETE), deleteRoom);

export default router;
