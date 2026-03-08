import Holiday from "../models/Holiday.js";
import { logInfo, logError } from "../config/logger.js";

// @desc    Get holidays for a doctor
// @route   GET /api/holidays
// @access  Private
export const getHolidays = async (req, res) => {
  try {
    const { doctorId, startDate, endDate } = req.query;
    const query = {};

    if (doctorId) query.doctorId = doctorId;
    if (startDate || endDate) {
      query.date = {};
      if (startDate) {
        query.date.$gte = new Date(startDate);
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.date.$lte = end;
      }
    }

    const holidays = await Holiday.find(query)
      .populate("doctorId", "name email")
      .sort({ date: 1 });

    logInfo("Holidays fetched", {
      userId: req.user.id,
      count: holidays.length,
    });

    res.status(200).json({
      success: true,
      count: holidays.length,
      data: { holidays },
    });
  } catch (error) {
    logError("Get holidays error", error, {
      userId: req.user?.id,
    });
    res.status(500).json({
      success: false,
      message: "Server error. Please try again later.",
    });
  }
};

// @desc    Create holiday
// @route   POST /api/holidays
// @access  Private
export const createHoliday = async (req, res) => {
  try {
    const { doctorId, date, reason, description } = req.body;

    if (!doctorId || !date) {
      return res.status(400).json({
        success: false,
        message: "Doctor ID and date are required",
      });
    }

    const holiday = await Holiday.create({
      doctorId,
      date: new Date(date),
      reason: reason || "Holiday",
      description: description || null,
    });

    const populatedHoliday = await Holiday.findById(holiday._id).populate(
      "doctorId",
      "name email"
    );

    logInfo("Holiday created", {
      createdBy: req.user.id,
      holidayId: holiday._id,
      doctorId,
    });

    res.status(201).json({
      success: true,
      message: "Holiday created successfully",
      data: { holiday: populatedHoliday },
    });
  } catch (error) {
    logError("Create holiday error", error, {
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

// @desc    Update holiday
// @route   PUT /api/holidays/:id
// @access  Private
export const updateHoliday = async (req, res) => {
  try {
    const { date, reason, description } = req.body;

    const holiday = await Holiday.findById(req.params.id);

    if (!holiday) {
      return res.status(404).json({
        success: false,
        message: "Holiday not found",
      });
    }

    if (date) holiday.date = new Date(date);
    if (reason) holiday.reason = reason;
    if (description !== undefined) holiday.description = description || null;

    await holiday.save();

    const populatedHoliday = await Holiday.findById(holiday._id).populate(
      "doctorId",
      "name email"
    );

    logInfo("Holiday updated", {
      updatedBy: req.user.id,
      holidayId: holiday._id,
    });

    res.status(200).json({
      success: true,
      message: "Holiday updated successfully",
      data: { holiday: populatedHoliday },
    });
  } catch (error) {
    logError("Update holiday error", error, {
      updatedBy: req.user?.id,
      holidayId: req.params.id,
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

// @desc    Delete holiday
// @route   DELETE /api/holidays/:id
// @access  Private
export const deleteHoliday = async (req, res) => {
  try {
    const holiday = await Holiday.findById(req.params.id);

    if (!holiday) {
      return res.status(404).json({
        success: false,
        message: "Holiday not found",
      });
    }

    await holiday.deleteOne();

    logInfo("Holiday deleted", {
      deletedBy: req.user.id,
      holidayId: req.params.id,
    });

    res.status(200).json({
      success: true,
      message: "Holiday deleted successfully",
    });
  } catch (error) {
    logError("Delete holiday error", error, {
      deletedBy: req.user?.id,
      holidayId: req.params.id,
    });
    res.status(500).json({
      success: false,
      message: "Server error. Please try again later.",
    });
  }
};
