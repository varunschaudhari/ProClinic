import express from "express";
import {
  getDepartments,
  getDepartment,
  createDepartment,
  updateDepartment,
  deleteDepartment,
} from "../controllers/departmentController.js";
import { protect, hasPermission } from "../middleware/auth.js";
import { PERMISSIONS } from "../constants/permissions.js";

const router = express.Router();

// All routes require authentication
router.use(protect);

router
  .route("/")
  .get(hasPermission(PERMISSIONS.DEPARTMENTS_VIEW), getDepartments)
  .post(hasPermission(PERMISSIONS.DEPARTMENTS_CREATE), createDepartment);

router
  .route("/:id")
  .get(hasPermission(PERMISSIONS.DEPARTMENTS_VIEW), getDepartment)
  .put(hasPermission(PERMISSIONS.DEPARTMENTS_EDIT), updateDepartment)
  .delete(hasPermission(PERMISSIONS.DEPARTMENTS_DELETE), deleteDepartment);

export default router;
