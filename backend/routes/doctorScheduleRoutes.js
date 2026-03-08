import express from "express";
import {
  getDoctorSchedule,
  createOrUpdateDoctorSchedule,
} from "../controllers/doctorScheduleController.js";
import { protect, hasPermission } from "../middleware/auth.js";
import { PERMISSIONS } from "../constants/permissions.js";

const router = express.Router();

// All routes require authentication
router.use(protect);

router
  .route("/:doctorId")
  .get(hasPermission(PERMISSIONS.APPOINTMENTS_VIEW), getDoctorSchedule);

router
  .route("/")
  .post(hasPermission(PERMISSIONS.APPOINTMENTS_EDIT), createOrUpdateDoctorSchedule);

export default router;
