import express from "express";
import {
  getServiceCategories,
  getServiceCategory,
  createServiceCategory,
  updateServiceCategory,
  deleteServiceCategory,
} from "../controllers/serviceCategoryController.js";
import { protect, hasPermission } from "../middleware/auth.js";
import { PERMISSIONS } from "../constants/permissions.js";

const router = express.Router();

// All routes require authentication
router.use(protect);

router
  .route("/")
  .get(hasPermission(PERMISSIONS.SERVICE_CATEGORIES_VIEW), getServiceCategories)
  .post(hasPermission(PERMISSIONS.SERVICE_CATEGORIES_CREATE), createServiceCategory);

router
  .route("/:id")
  .get(hasPermission(PERMISSIONS.SERVICE_CATEGORIES_VIEW), getServiceCategory)
  .put(hasPermission(PERMISSIONS.SERVICE_CATEGORIES_EDIT), updateServiceCategory)
  .delete(hasPermission(PERMISSIONS.SERVICE_CATEGORIES_DELETE), deleteServiceCategory);

export default router;
