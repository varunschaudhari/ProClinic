import express from "express";
import {
  getServices,
  getService,
  createService,
  updateService,
  deleteService,
} from "../controllers/serviceController.js";
import { protect, hasPermission } from "../middleware/auth.js";
import { PERMISSIONS } from "../constants/permissions.js";

const router = express.Router();

// All routes require authentication
router.use(protect);

router
  .route("/")
  .get(hasPermission(PERMISSIONS.SERVICES_VIEW), getServices)
  .post(hasPermission(PERMISSIONS.SERVICES_CREATE), createService);

router
  .route("/:id")
  .get(hasPermission(PERMISSIONS.SERVICES_VIEW), getService)
  .put(hasPermission(PERMISSIONS.SERVICES_EDIT), updateService)
  .delete(hasPermission(PERMISSIONS.SERVICES_DELETE), deleteService);

export default router;
