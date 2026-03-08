import express from "express";
import {
  getSettings,
  getSetting,
  getRoomTypes,
  getWardTypes,
  createSetting,
  updateSetting,
  deleteSetting,
  addRoomType,
  addWardType,
} from "../controllers/settingsController.js";
import { protect, hasPermission } from "../middleware/auth.js";
import { PERMISSIONS } from "../constants/permissions.js";

const router = express.Router();

// All routes require authentication
router.use(protect);

router
  .route("/")
  .get(hasPermission(PERMISSIONS.SETTINGS_VIEW), getSettings)
  .post(hasPermission(PERMISSIONS.SETTINGS_EDIT), createSetting);

router.get("/room-types", hasPermission(PERMISSIONS.SETTINGS_VIEW), getRoomTypes);
router.post("/room-types", hasPermission(PERMISSIONS.SETTINGS_EDIT), addRoomType);
router.get("/ward-types", hasPermission(PERMISSIONS.SETTINGS_VIEW), getWardTypes);
router.post("/ward-types", hasPermission(PERMISSIONS.SETTINGS_EDIT), addWardType);

router
  .route("/:id")
  .get(hasPermission(PERMISSIONS.SETTINGS_VIEW), getSetting)
  .put(hasPermission(PERMISSIONS.SETTINGS_EDIT), updateSetting)
  .delete(hasPermission(PERMISSIONS.SETTINGS_EDIT), deleteSetting);

export default router;
