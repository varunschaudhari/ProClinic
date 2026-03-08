import OTScheduler from "../models/OTScheduler.js";
import OperationTheater from "../models/OperationTheater.js";
import Patient from "../models/Patient.js";
import IPD from "../models/IPD.js";
import { logInfo, logError } from "../config/logger.js";

// @desc    Get all OT schedules
// @route   GET /api/ot/schedules
// @access  Private
export const getOTSchedules = async (req, res) => {
  try {
    const { patientId, otId, surgeonId, status, scheduledDate, priority } = req.query;

    const query = {};
    if (patientId) query.patientId = patientId;
    if (otId) query.otId = otId;
    if (surgeonId) query.surgeonId = surgeonId;
    if (status) query.status = status;
    if (priority) query.priority = priority;

    if (scheduledDate) {
      const startOfDay = new Date(scheduledDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(scheduledDate);
      endOfDay.setHours(23, 59, 59, 999);
      query.scheduledDate = { $gte: startOfDay, $lte: endOfDay };
    }

    const schedules = await OTScheduler.find(query)
      .populate("patientId", "name patientId phone dateOfBirth gender")
      .populate("ipdId", "ipdNumber")
      .populate("otId", "otNumber otName otType")
      .populate("surgeonId", "name email")
      .populate("anesthetistId", "name email")
      .populate("createdBy", "name email")
      .sort({ scheduledDate: 1, scheduledTime: 1 });

    logInfo("OT schedules fetched", {
      userId: req.user.id,
      count: schedules.length,
    });

    res.status(200).json({
      success: true,
      count: schedules.length,
      data: { schedules },
    });
  } catch (error) {
    logError("Get OT schedules error", error, {
      userId: req.user?.id,
    });
    res.status(500).json({
      success: false,
      message: "Server error. Please try again later.",
    });
  }
};

// @desc    Get single OT schedule
// @route   GET /api/ot/schedules/:id
// @access  Private
export const getOTSchedule = async (req, res) => {
  try {
    const schedule = await OTScheduler.findById(req.params.id)
      .populate("patientId", "name patientId phone email dateOfBirth gender")
      .populate("ipdId", "ipdNumber roomId bedNumber")
      .populate("otId", "otNumber otName otType floor ward equipment")
      .populate("surgeonId", "name email phone")
      .populate("anesthetistId", "name email phone")
      .populate("createdBy", "name email")
      .populate("updatedBy", "name email");

    if (!schedule) {
      return res.status(404).json({
        success: false,
        message: "OT schedule not found",
      });
    }

    res.status(200).json({
      success: true,
      data: { schedule },
    });
  } catch (error) {
    logError("Get OT schedule error", error, {
      userId: req.user?.id,
      scheduleId: req.params.id,
    });
    res.status(500).json({
      success: false,
      message: "Server error. Please try again later.",
    });
  }
};

// @desc    Create OT schedule
// @route   POST /api/ot/schedules
// @access  Private
export const createOTSchedule = async (req, res) => {
  try {
    const {
      patientId,
      ipdId,
      otId,
      surgeonId,
      anesthetistId,
      operationType,
      operationName,
      scheduledDate,
      scheduledTime,
      estimatedDuration,
      priority,
      preoperativeNotes,
    } = req.body;

    if (!patientId || !otId || !surgeonId || !operationType || !operationName || !scheduledDate || !scheduledTime) {
      return res.status(400).json({
        success: false,
        message: "Please provide all required fields",
      });
    }

    // Validate patient
    const patient = await Patient.findById(patientId);
    if (!patient) {
      return res.status(404).json({
        success: false,
        message: "Patient not found",
      });
    }

    // Validate IPD if provided
    if (ipdId) {
      const ipd = await IPD.findById(ipdId);
      if (!ipd) {
        return res.status(404).json({
          success: false,
          message: "IPD record not found",
        });
      }
    }

    // Validate OT
    const ot = await OperationTheater.findById(otId);
    if (!ot) {
      return res.status(404).json({
        success: false,
        message: "Operation theater not found",
      });
    }
    if (!ot.isActive) {
      return res.status(400).json({
        success: false,
        message: "Operation theater is not active",
      });
    }

    // Validate surgeon
    const User = (await import("../models/User.js")).default;
    const surgeon = await User.findById(surgeonId);
    if (!surgeon) {
      return res.status(404).json({
        success: false,
        message: "Surgeon not found",
      });
    }

    // Validate anesthetist if provided
    if (anesthetistId) {
      const anesthetist = await User.findById(anesthetistId);
      if (!anesthetist) {
        return res.status(404).json({
          success: false,
          message: "Anesthetist not found",
        });
      }
    }

    // Check for OT availability (no overlapping schedules)
    const scheduledDateTime = new Date(`${scheduledDate}T${scheduledTime}`);
    const endDateTime = new Date(scheduledDateTime);
    endDateTime.setMinutes(endDateTime.getMinutes() + (estimatedDuration || 60));

    const conflictingSchedule = await OTScheduler.findOne({
      otId,
      scheduledDate: new Date(scheduledDate),
      status: { $in: ["scheduled", "in-progress"] },
      $or: [
        {
          scheduledTime: scheduledTime,
        },
        {
          $and: [
            { scheduledTime: { $lte: scheduledTime } },
            {
              $expr: {
                $gte: [
                  {
                    $add: [
                      { $toDate: { $concat: ["$scheduledDate", "T", "$scheduledTime"] } },
                      { $multiply: ["$estimatedDuration", 60000] },
                    ],
                  },
                  scheduledDateTime,
                ],
              },
            },
          ],
        },
      ],
    });

    if (conflictingSchedule) {
      return res.status(400).json({
        success: false,
        message: `OT is already scheduled at this time. Conflicting schedule: ${conflictingSchedule.scheduleNumber}`,
      });
    }

    const schedule = await OTScheduler.create({
      patientId,
      ipdId: ipdId || null,
      otId,
      surgeonId,
      anesthetistId: anesthetistId || null,
      operationType,
      operationName,
      scheduledDate: new Date(scheduledDate),
      scheduledTime,
      estimatedDuration: estimatedDuration || 60,
      priority: priority || "routine",
      preoperativeNotes: preoperativeNotes || null,
      createdBy: req.user.id,
    });

    logInfo("OT schedule created", {
      createdBy: req.user.id,
      scheduleId: schedule._id,
      scheduleNumber: schedule.scheduleNumber,
    });

    res.status(201).json({
      success: true,
      message: "OT schedule created successfully",
      data: { schedule },
    });
  } catch (error) {
    logError("Create OT schedule error", error, {
      createdBy: req.user?.id,
    });
    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map((err) => err.message);
      return res.status(400).json({
        success: false,
        message: messages.join(", "),
      });
    }
    res.status(500).json({
      success: false,
      message: "Server error. Please try again later.",
    });
  }
};

// @desc    Update OT schedule
// @route   PUT /api/ot/schedules/:id
// @access  Private
export const updateOTSchedule = async (req, res) => {
  try {
    const {
      otId,
      surgeonId,
      anesthetistId,
      operationType,
      operationName,
      scheduledDate,
      scheduledTime,
      estimatedDuration,
      priority,
      preoperativeNotes,
      status,
    } = req.body;

    const schedule = await OTScheduler.findById(req.params.id);

    if (!schedule) {
      return res.status(404).json({
        success: false,
        message: "OT schedule not found",
      });
    }

    // Validate OT if changed
    if (otId && otId !== schedule.otId.toString()) {
      const ot = await OperationTheater.findById(otId);
      if (!ot) {
        return res.status(404).json({
          success: false,
          message: "Operation theater not found",
        });
      }
      if (!ot.isActive) {
        return res.status(400).json({
          success: false,
          message: "Operation theater is not active",
        });
      }
    }

    // Validate surgeon if changed
    if (surgeonId && surgeonId !== schedule.surgeonId.toString()) {
      const User = (await import("../models/User.js")).default;
      const surgeon = await User.findById(surgeonId);
      if (!surgeon) {
        return res.status(404).json({
          success: false,
          message: "Surgeon not found",
        });
      }
    }

    // Validate anesthetist if changed
    if (anesthetistId !== undefined) {
      if (anesthetistId) {
        const User = (await import("../models/User.js")).default;
        const anesthetist = await User.findById(anesthetistId);
        if (!anesthetist) {
          return res.status(404).json({
            success: false,
            message: "Anesthetist not found",
          });
        }
      }
    }

    // Check for OT availability if date/time changed
    if ((scheduledDate || scheduledTime) && schedule.status === "scheduled") {
      const newDate = scheduledDate || schedule.scheduledDate;
      const newTime = scheduledTime || schedule.scheduledTime;
      const newDuration = estimatedDuration || schedule.estimatedDuration;

      const conflictingSchedule = await OTScheduler.findOne({
        _id: { $ne: schedule._id },
        otId: otId || schedule.otId,
        scheduledDate: new Date(newDate),
        status: { $in: ["scheduled", "in-progress"] },
        scheduledTime: newTime,
      });

      if (conflictingSchedule) {
        return res.status(400).json({
          success: false,
          message: "OT is already scheduled at this time",
        });
      }
    }

    // Update fields
    if (otId) schedule.otId = otId;
    if (surgeonId) schedule.surgeonId = surgeonId;
    if (anesthetistId !== undefined) schedule.anesthetistId = anesthetistId || null;
    if (operationType) schedule.operationType = operationType;
    if (operationName) schedule.operationName = operationName;
    if (scheduledDate) schedule.scheduledDate = new Date(scheduledDate);
    if (scheduledTime) schedule.scheduledTime = scheduledTime;
    if (estimatedDuration) schedule.estimatedDuration = estimatedDuration;
    if (priority) schedule.priority = priority;
    if (preoperativeNotes !== undefined) schedule.preoperativeNotes = preoperativeNotes || null;
    if (status) schedule.status = status;

    schedule.updatedBy = req.user.id;
    await schedule.save();

    logInfo("OT schedule updated", {
      updatedBy: req.user.id,
      scheduleId: schedule._id,
    });

    res.status(200).json({
      success: true,
      message: "OT schedule updated successfully",
      data: { schedule },
    });
  } catch (error) {
    logError("Update OT schedule error", error, {
      updatedBy: req.user?.id,
      scheduleId: req.params.id,
    });
    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map((err) => err.message);
      return res.status(400).json({
        success: false,
        message: messages.join(", "),
      });
    }
    res.status(500).json({
      success: false,
      message: "Server error. Please try again later.",
    });
  }
};

// @desc    Update OT schedule status
// @route   PATCH /api/ot/schedules/:id/status
// @access  Private
export const updateOTScheduleStatus = async (req, res) => {
  try {
    const { status, actualStartTime, actualEndTime, actualDuration, postoperativeNotes, complications } = req.body;

    if (!status || !["scheduled", "in-progress", "completed", "cancelled", "postponed"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status provided",
      });
    }

    const schedule = await OTScheduler.findById(req.params.id);

    if (!schedule) {
      return res.status(404).json({
        success: false,
        message: "OT schedule not found",
      });
    }

    schedule.status = status;

    if (status === "in-progress" && actualStartTime) {
      schedule.actualStartTime = new Date(actualStartTime);
    }

    if (status === "completed") {
      if (actualEndTime) {
        schedule.actualEndTime = new Date(actualEndTime);
      } else {
        schedule.actualEndTime = new Date();
      }
      if (actualDuration) {
        schedule.actualDuration = actualDuration;
      } else if (schedule.actualStartTime) {
        const duration = Math.round((schedule.actualEndTime - schedule.actualStartTime) / 60000);
        schedule.actualDuration = duration;
      }
      if (postoperativeNotes) schedule.postoperativeNotes = postoperativeNotes;
      if (complications) schedule.complications = complications;
    }

    schedule.updatedBy = req.user.id;
    await schedule.save();

    logInfo("OT schedule status updated", {
      updatedBy: req.user.id,
      scheduleId: schedule._id,
      newStatus: status,
    });

    res.status(200).json({
      success: true,
      message: "OT schedule status updated successfully",
      data: { schedule },
    });
  } catch (error) {
    logError("Update OT schedule status error", error, {
      updatedBy: req.user?.id,
      scheduleId: req.params.id,
    });
    res.status(500).json({
      success: false,
      message: "Server error. Please try again later.",
    });
  }
};

// @desc    Delete OT schedule
// @route   DELETE /api/ot/schedules/:id
// @access  Private
export const deleteOTSchedule = async (req, res) => {
  try {
    const schedule = await OTScheduler.findById(req.params.id);

    if (!schedule) {
      return res.status(404).json({
        success: false,
        message: "OT schedule not found",
      });
    }

    if (schedule.status === "in-progress") {
      return res.status(400).json({
        success: false,
        message: "Cannot delete an operation that is in progress",
      });
    }

    await OTScheduler.findByIdAndDelete(req.params.id);

    logInfo("OT schedule deleted", {
      deletedBy: req.user.id,
      scheduleId: req.params.id,
    });

    res.status(200).json({
      success: true,
      message: "OT schedule deleted successfully",
    });
  } catch (error) {
    logError("Delete OT schedule error", error, {
      deletedBy: req.user?.id,
      scheduleId: req.params.id,
    });
    res.status(500).json({
      success: false,
      message: "Server error. Please try again later.",
    });
  }
};

// @desc    Get OT schedule statistics
// @route   GET /api/ot/schedules/stats
// @access  Private
export const getOTScheduleStats = async (req, res) => {
  try {
    const { startDate, endDate, otId, surgeonId } = req.query;
    const query = {};

    if (startDate && endDate) {
      query.scheduledDate = {
        $gte: new Date(startDate).setHours(0, 0, 0, 0),
        $lte: new Date(endDate).setHours(23, 59, 59, 999),
      };
    } else {
      // Default to today's stats
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const endOfDay = new Date();
      endOfDay.setHours(23, 59, 59, 999);
      query.scheduledDate = { $gte: today, $lte: endOfDay };
    }

    if (otId) query.otId = otId;
    if (surgeonId) query.surgeonId = surgeonId;

    const totalSchedules = await OTScheduler.countDocuments(query);
    const scheduled = await OTScheduler.countDocuments({ ...query, status: "scheduled" });
    const inProgress = await OTScheduler.countDocuments({ ...query, status: "in-progress" });
    const completed = await OTScheduler.countDocuments({ ...query, status: "completed" });
    const cancelled = await OTScheduler.countDocuments({ ...query, status: "cancelled" });

    const stats = {
      totalSchedules,
      scheduled,
      inProgress,
      completed,
      cancelled,
    };

    logInfo("OT schedule stats fetched", {
      userId: req.user.id,
      filters: req.query,
    });

    res.status(200).json({
      success: true,
      data: { stats },
    });
  } catch (error) {
    logError("Get OT schedule stats error", error, {
      userId: req.user?.id,
    });
    res.status(500).json({
      success: false,
      message: "Server error. Please try again later.",
    });
  }
};
