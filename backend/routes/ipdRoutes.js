import express from "express";
import {
  getIPDRecords,
  getCurrentIPD,
  getIPDRecord,
  createIPDRecord,
  updateIPDRecord,
  dischargePatient,
  addProgressNote,
  addPrescription,
  addLabReport,
  processPayment,
  getIPDStats,
  deleteIPDRecord,
} from "../controllers/ipdController.js";
import { protect, hasPermission } from "../middleware/auth.js";
import { PERMISSIONS } from "../constants/permissions.js";

const router = express.Router();

// All routes require authentication
router.use(protect);

router
  .route("/")
  .get(hasPermission(PERMISSIONS.IPD_VIEW), getIPDRecords)
  .post(hasPermission(PERMISSIONS.IPD_CREATE), createIPDRecord);

router.get("/current", hasPermission(PERMISSIONS.IPD_VIEW), getCurrentIPD);
router.get("/stats", hasPermission(PERMISSIONS.IPD_VIEW), getIPDStats);

router
  .route("/:id")
  .get(hasPermission(PERMISSIONS.IPD_VIEW), getIPDRecord)
  .put(hasPermission(PERMISSIONS.IPD_EDIT), updateIPDRecord)
  .delete(hasPermission(PERMISSIONS.IPD_DELETE), deleteIPDRecord);

router.put("/:id/discharge", hasPermission(PERMISSIONS.IPD_EDIT), dischargePatient);
router.post("/:id/progress-note", hasPermission(PERMISSIONS.IPD_EDIT), addProgressNote);
router.post("/:id/prescription", hasPermission(PERMISSIONS.IPD_EDIT), addPrescription);
router.post("/:id/lab-report", hasPermission(PERMISSIONS.IPD_EDIT), addLabReport);
router.put("/:id/payment", hasPermission(PERMISSIONS.IPD_BILLING), processPayment);

export default router;
