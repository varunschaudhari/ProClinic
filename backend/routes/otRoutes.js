import express from "express";
import {
  getOperationTheaters,
  getOperationTheater,
  createOperationTheater,
  updateOperationTheater,
  deleteOperationTheater,
} from "../controllers/otController.js";
import {
  getOTSchedules,
  getOTSchedule,
  createOTSchedule,
  updateOTSchedule,
  updateOTScheduleStatus,
  deleteOTSchedule,
  getOTScheduleStats,
} from "../controllers/otSchedulerController.js";
import {
  getOTComplexes,
  getOTComplex,
  createOTComplex,
  updateOTComplex,
  deleteOTComplex,
} from "../controllers/otComplexController.js";
import { protect, hasPermission } from "../middleware/auth.js";
import { PERMISSIONS } from "../constants/permissions.js";

const router = express.Router();

// All routes require authentication
router.use(protect);

// OT Complex routes
router
  .route("/complexes")
  .get(hasPermission(PERMISSIONS.OT_VIEW), getOTComplexes)
  .post(hasPermission(PERMISSIONS.OT_CREATE), createOTComplex);

router
  .route("/complexes/:id")
  .get(hasPermission(PERMISSIONS.OT_VIEW), getOTComplex)
  .put(hasPermission(PERMISSIONS.OT_EDIT), updateOTComplex)
  .delete(hasPermission(PERMISSIONS.OT_DELETE), deleteOTComplex);

// OT Management routes
router
  .route("/")
  .get(hasPermission(PERMISSIONS.OT_VIEW), getOperationTheaters)
  .post(hasPermission(PERMISSIONS.OT_CREATE), createOperationTheater);

router
  .route("/:id")
  .get(hasPermission(PERMISSIONS.OT_VIEW), getOperationTheater)
  .put(hasPermission(PERMISSIONS.OT_EDIT), updateOperationTheater)
  .delete(hasPermission(PERMISSIONS.OT_DELETE), deleteOperationTheater);

// OT Scheduler routes
router.get("/schedules/stats", hasPermission(PERMISSIONS.OT_SCHEDULE_VIEW), getOTScheduleStats);

router
  .route("/schedules")
  .get(hasPermission(PERMISSIONS.OT_SCHEDULE_VIEW), getOTSchedules)
  .post(hasPermission(PERMISSIONS.OT_SCHEDULE_CREATE), createOTSchedule);

router
  .route("/schedules/:id")
  .get(hasPermission(PERMISSIONS.OT_SCHEDULE_VIEW), getOTSchedule)
  .put(hasPermission(PERMISSIONS.OT_SCHEDULE_EDIT), updateOTSchedule)
  .delete(hasPermission(PERMISSIONS.OT_SCHEDULE_DELETE), deleteOTSchedule);

router.patch("/schedules/:id/status", hasPermission(PERMISSIONS.OT_SCHEDULE_EDIT), updateOTScheduleStatus);

export default router;
