import express from "express";
import {
  getOPDRecords,
  getTodayOPD,
  getOPDQueue,
  getOPDRecord,
  createOPDRecord,
  updateOPDRecord,
  updateOPDStatus,
  processPayment,
  processRefund,
  addCreditNote,
  recordAdvance,
  deleteOPDRecord,
  getOPDStats,
} from "../controllers/opdController.js";
import { protect, hasPermission } from "../middleware/auth.js";
import { PERMISSIONS } from "../constants/permissions.js";

const router = express.Router();

// All routes require authentication
router.use(protect);

// Stats route (no specific permission required, but authenticated)
router.get("/stats", getOPDStats);

// Today's OPD records
router.get("/today", hasPermission(PERMISSIONS.OPD_VIEW), getTodayOPD);

// Queue route
router.get("/queue/:doctorId", hasPermission(PERMISSIONS.OPD_VIEW), getOPDQueue);

// Main routes
router
  .route("/")
  .get(hasPermission(PERMISSIONS.OPD_VIEW), getOPDRecords)
  .post(hasPermission(PERMISSIONS.OPD_CREATE), createOPDRecord);

router
  .route("/:id")
  .get(hasPermission(PERMISSIONS.OPD_VIEW), getOPDRecord)
  .put(hasPermission(PERMISSIONS.OPD_EDIT), updateOPDRecord)
  .delete(hasPermission(PERMISSIONS.OPD_DELETE), deleteOPDRecord);

// Status update
router.patch("/:id/status", hasPermission(PERMISSIONS.OPD_EDIT), updateOPDStatus);

// Payment processing
router.patch("/:id/payment", hasPermission(PERMISSIONS.OPD_BILLING), processPayment);

// Refund processing
router.patch("/:id/refund", hasPermission(PERMISSIONS.OPD_BILLING), processRefund);

// Credit Notes
router.patch("/:id/credit-note", hasPermission(PERMISSIONS.OPD_BILLING), addCreditNote);

// Billing Advance
router.patch("/:id/advance", hasPermission(PERMISSIONS.OPD_BILLING), recordAdvance);

export default router;
