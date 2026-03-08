import express from "express";
import {
  getPatientDocuments,
  getDocument,
  createDocument,
  updateDocument,
  deleteDocument,
} from "../controllers/documentController.js";
import { protect, hasPermission } from "../middleware/auth.js";
import upload from "../middleware/documentUpload.js";
import { PERMISSIONS } from "../constants/permissions.js";

const router = express.Router();

// All routes require authentication
router.use(protect);

router
  .route("/patient/:patientId")
  .get(hasPermission(PERMISSIONS.PATIENTS_VIEW), getPatientDocuments);

router
  .route("/")
  .post(hasPermission(PERMISSIONS.PATIENTS_EDIT), upload.single("file"), createDocument);

router
  .route("/:id")
  .get(hasPermission(PERMISSIONS.PATIENTS_VIEW), getDocument)
  .put(hasPermission(PERMISSIONS.PATIENTS_EDIT), updateDocument)
  .delete(hasPermission(PERMISSIONS.PATIENTS_DELETE), deleteDocument);

export default router;
