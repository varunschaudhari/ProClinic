import express from "express";
import {
  getPatients,
  getPatient,
  createPatient,
  updatePatient,
  deletePatient,
  updatePatientStatus,
} from "../controllers/patientController.js";
import { protect, hasPermission } from "../middleware/auth.js";
import upload from "../middleware/upload.js";
import { PERMISSIONS } from "../constants/permissions.js";

const router = express.Router();

// All routes require authentication
router.use(protect);

router
  .route("/")
  .get(hasPermission(PERMISSIONS.PATIENTS_VIEW), getPatients)
  .post(hasPermission(PERMISSIONS.PATIENTS_CREATE), upload.single("profileImage"), createPatient);

router
  .route("/:id")
  .get(hasPermission(PERMISSIONS.PATIENTS_VIEW), getPatient)
  .put(hasPermission(PERMISSIONS.PATIENTS_EDIT), upload.single("profileImage"), updatePatient)
  .delete(hasPermission(PERMISSIONS.PATIENTS_DELETE), deletePatient);

router.patch("/:id/status", hasPermission(PERMISSIONS.PATIENTS_EDIT), updatePatientStatus);

export default router;
