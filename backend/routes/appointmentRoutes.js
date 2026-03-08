import express from "express";
import {
  getAppointments,
  getAppointment,
  getAvailableSlots,
  createAppointment,
  updateAppointment,
  deleteAppointment,
} from "../controllers/appointmentController.js";
import { protect, hasPermission } from "../middleware/auth.js";
import { PERMISSIONS } from "../constants/permissions.js";

const router = express.Router();

// All routes require authentication
router.use(protect);

router
  .route("/")
  .get(hasPermission(PERMISSIONS.APPOINTMENTS_VIEW), getAppointments)
  .post(hasPermission(PERMISSIONS.APPOINTMENTS_CREATE), createAppointment);

router.get("/available-slots", hasPermission(PERMISSIONS.APPOINTMENTS_VIEW), getAvailableSlots);

router
  .route("/:id")
  .get(hasPermission(PERMISSIONS.APPOINTMENTS_VIEW), getAppointment)
  .put(hasPermission(PERMISSIONS.APPOINTMENTS_EDIT), updateAppointment)
  .delete(hasPermission(PERMISSIONS.APPOINTMENTS_DELETE), deleteAppointment);

export default router;
