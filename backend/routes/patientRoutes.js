import express from "express";
import {
  getPatients,
  getPatient,
  createPatient,
  updatePatient,
  deletePatient,
  updatePatientStatus,
  getConsultationSummary,
  getOperativeSummary,
  getBillingInformation,
} from "../controllers/patientController.js";
import {
  getPatientRemarks,
  createPatientRemark,
  updatePatientRemark,
  deletePatientRemark,
} from "../controllers/patientRemarkController.js";
import {
  getPatientEngagement,
  updatePatientEngagement,
  acknowledgeMaterial,
} from "../controllers/patientEngagementController.js";
import {
  getClinicalData,
  createClinicalData,
  addVitalSigns,
  addLabResult,
  addImagingReport,
  addClinicalObservation,
} from "../controllers/clinicalDataController.js";
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

// Aggregation endpoints
router.get("/:patientId/consultation-summary", hasPermission(PERMISSIONS.PATIENTS_VIEW), getConsultationSummary);
router.get("/:patientId/operative-summary", hasPermission(PERMISSIONS.PATIENTS_VIEW), getOperativeSummary);
router.get("/:patientId/billing-information", hasPermission(PERMISSIONS.PATIENTS_VIEW), getBillingInformation);

// Remarks routes
router
  .route("/:patientId/remarks")
  .get(hasPermission(PERMISSIONS.PATIENTS_VIEW), getPatientRemarks)
  .post(hasPermission(PERMISSIONS.PATIENTS_EDIT), createPatientRemark);

router
  .route("/:patientId/remarks/:remarkId")
  .put(hasPermission(PERMISSIONS.PATIENTS_EDIT), updatePatientRemark)
  .delete(hasPermission(PERMISSIONS.PATIENTS_EDIT), deletePatientRemark);

// Engagement routes
router
  .route("/:patientId/engagement")
  .get(hasPermission(PERMISSIONS.PATIENTS_VIEW), getPatientEngagement)
  .put(hasPermission(PERMISSIONS.PATIENTS_EDIT), updatePatientEngagement);

router.put("/:patientId/engagement/materials/:materialId/acknowledge", hasPermission(PERMISSIONS.PATIENTS_EDIT), acknowledgeMaterial);

// Clinical data routes
router
  .route("/:patientId/clinical-data")
  .get(hasPermission(PERMISSIONS.PATIENTS_VIEW), getClinicalData)
  .post(hasPermission(PERMISSIONS.PATIENTS_EDIT), createClinicalData);

router.post("/:patientId/clinical-data/vital-signs", hasPermission(PERMISSIONS.PATIENTS_EDIT), addVitalSigns);
router.post("/:patientId/clinical-data/lab-results", hasPermission(PERMISSIONS.PATIENTS_EDIT), addLabResult);
router.post("/:patientId/clinical-data/imaging-reports", hasPermission(PERMISSIONS.PATIENTS_EDIT), addImagingReport);
router.post("/:patientId/clinical-data/observations", hasPermission(PERMISSIONS.PATIENTS_EDIT), addClinicalObservation);

export default router;
