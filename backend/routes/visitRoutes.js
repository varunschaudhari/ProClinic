import express from "express";
import {
  getPatientVisits,
  getVisit,
  createVisit,
  updateVisit,
  deleteVisit,
} from "../controllers/visitController.js";
import { protect, hasPermission } from "../middleware/auth.js";
import { PERMISSIONS } from "../constants/permissions.js";

const router = express.Router();

// All routes require authentication
router.use(protect);

router
  .route("/patient/:patientId")
  .get(hasPermission(PERMISSIONS.PATIENTS_VIEW), getPatientVisits);

router
  .route("/")
  .post(hasPermission(PERMISSIONS.PATIENTS_EDIT), createVisit);

router
  .route("/:id")
  .get(hasPermission(PERMISSIONS.PATIENTS_VIEW), getVisit)
  .put(hasPermission(PERMISSIONS.PATIENTS_EDIT), updateVisit)
  .delete(hasPermission(PERMISSIONS.PATIENTS_DELETE), deleteVisit);

export default router;
