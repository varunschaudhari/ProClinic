import DoctorSchedule from "../models/DoctorSchedule.js";
import { logInfo, logError } from "../config/logger.js";

// @desc    Get doctor schedule
// @route   GET /api/doctor-schedules/:doctorId
// @access  Private
export const getDoctorSchedule = async (req, res) => {
  try {
    const schedule = await DoctorSchedule.findOne({
      doctorId: req.params.doctorId,
    });

    if (!schedule) {
      return res.status(404).json({
        success: false,
        message: "Schedule not found for this doctor",
      });
    }

    res.status(200).json({
      success: true,
      data: { schedule },
    });
  } catch (error) {
    logError("Get doctor schedule error", error, {
      userId: req.user?.id,
      doctorId: req.params.doctorId,
    });
    res.status(500).json({
      success: false,
      message: "Server error. Please try again later.",
    });
  }
};

// @desc    Create or update doctor schedule
// @route   POST /api/doctor-schedules
// @access  Private
export const createOrUpdateDoctorSchedule = async (req, res) => {
  try {
    const { doctorId, schedule } = req.body;

    if (!doctorId || !schedule) {
      return res.status(400).json({
        success: false,
        message: "Doctor ID and schedule are required",
      });
    }

    const doctorSchedule = await DoctorSchedule.findOneAndUpdate(
      { doctorId },
      { doctorId, schedule },
      { new: true, upsert: true }
    );

    logInfo("Doctor schedule updated", {
      updatedBy: req.user.id,
      doctorId,
    });

    res.status(200).json({
      success: true,
      message: "Doctor schedule updated successfully",
      data: { schedule: doctorSchedule },
    });
  } catch (error) {
    logError("Create/update doctor schedule error", error, {
      updatedBy: req.user?.id,
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
