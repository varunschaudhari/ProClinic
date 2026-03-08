import express from "express";
import {
  getAppointments,
  getAppointment,
  getAppointmentStats,
  getAvailableSlots,
  createAppointment,
  updateAppointment,
  rescheduleAppointment,
  cancelAppointment,
  convertToOPD,
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

router.get("/stats", hasPermission(PERMISSIONS.APPOINTMENTS_VIEW), getAppointmentStats);
router.get("/available-slots", hasPermission(PERMISSIONS.APPOINTMENTS_VIEW), getAvailableSlots);

router
  .route("/:id")
  .get(hasPermission(PERMISSIONS.APPOINTMENTS_VIEW), getAppointment)
  .put(hasPermission(PERMISSIONS.APPOINTMENTS_EDIT), updateAppointment)
  .delete(hasPermission(PERMISSIONS.APPOINTMENTS_DELETE), deleteAppointment);

router.put("/:id/reschedule", hasPermission(PERMISSIONS.APPOINTMENTS_EDIT), rescheduleAppointment);
router.put("/:id/cancel", hasPermission(PERMISSIONS.APPOINTMENTS_EDIT), cancelAppointment);
router.post("/:id/convert-to-opd", hasPermission(PERMISSIONS.APPOINTMENTS_EDIT), convertToOPD);

export default router;
