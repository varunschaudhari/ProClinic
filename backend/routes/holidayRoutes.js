import express from "express";
import {
  getHolidays,
  createHoliday,
  updateHoliday,
  deleteHoliday,
} from "../controllers/holidayController.js";
import { protect, hasPermission } from "../middleware/auth.js";
import { PERMISSIONS } from "../constants/permissions.js";

const router = express.Router();

// All routes require authentication
router.use(protect);

router
  .route("/")
  .get(hasPermission(PERMISSIONS.APPOINTMENTS_VIEW), getHolidays)
  .post(hasPermission(PERMISSIONS.APPOINTMENTS_EDIT), createHoliday);

router
  .route("/:id")
  .put(hasPermission(PERMISSIONS.APPOINTMENTS_EDIT), updateHoliday)
  .delete(hasPermission(PERMISSIONS.APPOINTMENTS_DELETE), deleteHoliday);

export default router;
