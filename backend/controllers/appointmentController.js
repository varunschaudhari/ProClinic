import Appointment from "../models/Appointment.js";
import Patient from "../models/Patient.js";
import DoctorSchedule from "../models/DoctorSchedule.js";
import Holiday from "../models/Holiday.js";
import OPD from "../models/OPD.js";
import Visit from "../models/Visit.js";
import { logInfo, logError } from "../config/logger.js";

// @desc    Get all appointments
// @route   GET /api/appointments
// @access  Private
export const getAppointments = async (req, res) => {
  try {
    const { doctorId, patientId, date, status, priority, appointmentType, startDate, endDate, search, isFollowUp } = req.query;
    const query = {};

    if (doctorId) query.doctorId = doctorId;
    if (patientId) query.patientId = patientId;
    if (status) query.status = status;
    if (priority) query.priority = priority;
    if (appointmentType) query.appointmentType = appointmentType;
    if (isFollowUp === "true") query.isFollowUp = true;
    
    // Date range filter
    if (startDate && endDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      query.appointmentDate = { $gte: start, $lte: end };
    } else if (date) {
      const startDate = new Date(date);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(date);
      endDate.setHours(23, 59, 59, 999);
      query.appointmentDate = { $gte: startDate, $lte: endDate };
    }

    // Search filter - search by appointment number, patient name, or patient phone
    if (search) {
      // First, find patients matching the search query
      const patientMatches = await Patient.find({
        $or: [
          { name: { $regex: search, $options: "i" } },
          { phone: { $regex: search, $options: "i" } },
          { patientId: { $regex: search, $options: "i" } },
        ],
      }).select("_id");
      
      const patientIds = patientMatches.map(p => p._id);
      
      query.$or = [
        { appointmentNumber: { $regex: search, $options: "i" } },
        ...(patientIds.length > 0 ? [{ patientId: { $in: patientIds } }] : []),
      ];
    }

    const appointments = await Appointment.find(query)
      .populate("patientId", "name phone patientId email")
      .populate("doctorId", "name email")
      .populate("createdBy", "name email")
      .populate("updatedBy", "name email")
      .populate("cancelledBy", "name email")
      .populate("rescheduledBy", "name email")
      .populate("convertedBy", "name email")
      .populate("followUpAppointmentId", "appointmentNumber appointmentDate appointmentTime")
      .populate("originalAppointmentId", "appointmentNumber appointmentDate appointmentTime")
      .populate("visitId", "visitDate visitType diagnosis treatment")
      .populate("history.changedBy", "name email")
      .sort({ appointmentDate: 1, appointmentTime: 1 });

    logInfo("Appointments fetched", {
      userId: req.user.id,
      count: appointments.length,
    });

    res.status(200).json({
      success: true,
      count: appointments.length,
      data: { appointments },
    });
  } catch (error) {
    logError("Get appointments error", error, {
      userId: req.user?.id,
    });
    res.status(500).json({
      success: false,
      message: "Server error. Please try again later.",
    });
  }
};

// @desc    Get appointment statistics
// @route   GET /api/appointments/stats
// @access  Private
export const getAppointmentStats = async (req, res) => {
  try {
    const { doctorId, startDate, endDate } = req.query;
    const query = {};

    if (doctorId) query.doctorId = doctorId;
    if (startDate && endDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      query.appointmentDate = { $gte: start, $lte: end };
    } else {
      // Default to today
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      query.appointmentDate = { $gte: today, $lt: tomorrow };
    }

    const [
      total,
      scheduled,
      completed,
      cancelled,
      noShow,
      todayAppointments,
      upcomingAppointments,
      overdueAppointments,
    ] = await Promise.all([
      Appointment.countDocuments(query),
      Appointment.countDocuments({ ...query, status: "scheduled" }),
      Appointment.countDocuments({ ...query, status: "completed" }),
      Appointment.countDocuments({ ...query, status: "cancelled" }),
      Appointment.countDocuments({ ...query, status: "no-show" }),
      Appointment.countDocuments({
        ...query,
        appointmentDate: {
          $gte: new Date(new Date().setHours(0, 0, 0, 0)),
          $lt: new Date(new Date().setHours(23, 59, 59, 999)),
        },
      }),
      Appointment.countDocuments({
        ...query,
        appointmentDate: { $gt: new Date() },
        status: "scheduled",
      }),
      Appointment.countDocuments({
        ...query,
        appointmentDate: { $lt: new Date() },
        status: "scheduled",
      }),
    ]);

    res.status(200).json({
      success: true,
      data: {
        total,
        scheduled,
        completed,
        cancelled,
        noShow,
        todayAppointments,
        upcomingAppointments,
        overdueAppointments,
      },
    });
  } catch (error) {
    logError("Get appointment stats error", error, {
      userId: req.user?.id,
    });
    res.status(500).json({
      success: false,
      message: "Server error. Please try again later.",
    });
  }
};

// @desc    Get single appointment
// @route   GET /api/appointments/:id
// @access  Private
export const getAppointment = async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id)
      .populate("patientId", "name phone patientId email")
      .populate("doctorId", "name email")
      .populate("createdBy", "name email")
      .populate("originalAppointmentId", "appointmentNumber appointmentDate appointmentTime")
      .populate("visitId", "visitDate visitType diagnosis treatment");

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: "Appointment not found",
      });
    }

    res.status(200).json({
      success: true,
      data: { appointment },
    });
  } catch (error) {
    logError("Get appointment error", error, {
      userId: req.user?.id,
      appointmentId: req.params.id,
    });
    res.status(500).json({
      success: false,
      message: "Server error. Please try again later.",
    });
  }
};

// @desc    Get available slots for a doctor on a date
// @route   GET /api/appointments/available-slots
// @access  Private
export const getAvailableSlots = async (req, res) => {
  try {
    const { doctorId, date } = req.query;

    if (!doctorId || !date) {
      return res.status(400).json({
        success: false,
        message: "Doctor ID and date are required",
      });
    }

    // Get doctor schedule
    const schedule = await DoctorSchedule.findOne({ doctorId });
    if (!schedule) {
      return res.status(200).json({
        success: true,
        data: { availableSlots: [] },
        message: "No schedule found for this doctor",
      });
    }

    // Check if it's a holiday
    const selectedDate = new Date(date);
    const startOfDay = new Date(selectedDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(selectedDate);
    endOfDay.setHours(23, 59, 59, 999);
    
    const holiday = await Holiday.findOne({
      doctorId,
      date: {
        $gte: startOfDay,
        $lte: endOfDay,
      },
    });

    if (holiday) {
      return res.status(200).json({
        success: true,
        data: { availableSlots: [] },
        message: "Doctor is on holiday",
      });
    }

    // Get day of week (0 = Sunday, 1 = Monday, etc.)
    const dayOfWeek = selectedDate.getDay();
    const dayNames = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
    const dayName = dayNames[dayOfWeek];

    const daySchedule = schedule.schedule[dayName];
    if (!daySchedule || !daySchedule.isAvailable) {
      return res.status(200).json({
        success: true,
        data: { availableSlots: [] },
        message: "Doctor is not available on this day",
      });
    }

    // Get existing appointments for this doctor on this date
    const startDate = new Date(date);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(date);
    endDate.setHours(23, 59, 59, 999);

    const existingAppointments = await Appointment.find({
      doctorId,
      appointmentDate: { $gte: startDate, $lte: endDate },
      status: { $ne: "cancelled" },
    }).select("appointmentTime");

    const bookedTimes = existingAppointments.map((apt) => apt.appointmentTime);

    // Generate available slots
    const availableSlots = [];
    const slotDuration = 30; // 30 minutes per slot

    // Morning slots
    if (daySchedule.morningSlot) {
      const morningSlots = generateTimeSlots(
        daySchedule.morningSlot.startTime,
        daySchedule.morningSlot.endTime,
        slotDuration,
        bookedTimes
      );
      availableSlots.push(...morningSlots);
    }

    // Evening slots
    if (daySchedule.eveningSlot) {
      const eveningSlots = generateTimeSlots(
        daySchedule.eveningSlot.startTime,
        daySchedule.eveningSlot.endTime,
        slotDuration,
        bookedTimes
      );
      availableSlots.push(...eveningSlots);
    }

    res.status(200).json({
      success: true,
      data: { availableSlots },
    });
  } catch (error) {
    logError("Get available slots error", error, {
      userId: req.user?.id,
      doctorId: req.query.doctorId,
    });
    res.status(500).json({
      success: false,
      message: "Server error. Please try again later.",
    });
  }
};

// Helper function to generate time slots
function generateTimeSlots(startTime, endTime, duration, bookedTimes) {
  const slots = [];
  const [startHour, startMin] = startTime.split(":").map(Number);
  const [endHour, endMin] = endTime.split(":").map(Number);

  let currentHour = startHour;
  let currentMin = startMin;

  while (
    currentHour < endHour ||
    (currentHour === endHour && currentMin < endMin)
  ) {
    const timeString = `${String(currentHour).padStart(2, "0")}:${String(currentMin).padStart(2, "0")}`;
    
    if (!bookedTimes.includes(timeString)) {
      slots.push(timeString);
    }

    currentMin += duration;
    if (currentMin >= 60) {
      currentHour += 1;
      currentMin = 0;
    }
  }

  return slots;
}

// @desc    Create appointment
// @route   POST /api/appointments
// @access  Private
export const createAppointment = async (req, res) => {
  try {
    const {
      patientId,
      doctorId,
      appointmentDate,
      appointmentTime,
      appointmentType,
      chiefComplaint,
      notes,
      isFollowUp,
      originalAppointmentId,
    } = req.body;

    // Validate required fields
    if (!patientId || !doctorId || !appointmentDate || !appointmentTime) {
      return res.status(400).json({
        success: false,
        message: "Please provide patient ID, doctor ID, appointment date, and time",
      });
    }

    // Check if patient exists
    const patient = await Patient.findById(patientId);
    if (!patient) {
      return res.status(404).json({
        success: false,
        message: "Patient not found",
      });
    }

    // Check if slot is available
    const appointmentDateTime = new Date(appointmentDate);
    const startDate = new Date(appointmentDateTime);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(appointmentDateTime);
    endDate.setHours(23, 59, 59, 999);

    const existingAppointment = await Appointment.findOne({
      doctorId,
      appointmentDate: { $gte: startDate, $lte: endDate },
      appointmentTime,
      status: { $ne: "cancelled" },
    });

    if (existingAppointment) {
      return res.status(400).json({
        success: false,
        message: "This time slot is already booked",
      });
    }

    // If this is a follow-up, validate original appointment exists
    if (isFollowUp && originalAppointmentId) {
      const originalAppointment = await Appointment.findById(originalAppointmentId);
      if (!originalAppointment) {
        return res.status(404).json({
          success: false,
          message: "Original appointment not found",
        });
      }
      if (originalAppointment.patientId.toString() !== patientId) {
        return res.status(400).json({
          success: false,
          message: "Follow-up appointment must be for the same patient",
        });
      }
    }

    const appointment = await Appointment.create({
      patientId,
      doctorId,
      appointmentDate: appointmentDateTime,
      appointmentTime,
      appointmentType: appointmentType || "booked",
      priority: req.body.priority || "normal",
      duration: req.body.duration || 30,
      chiefComplaint: chiefComplaint || null,
      notes: notes || null,
      reminderEnabled: req.body.reminderEnabled !== undefined ? req.body.reminderEnabled : true,
      isFollowUp: isFollowUp || false,
      originalAppointmentId: isFollowUp && originalAppointmentId ? originalAppointmentId : null,
      createdBy: req.user.id,
    });

    // Add creation to history
    appointment.history.push({
      action: "created",
      changedBy: req.user.id,
      notes: "Appointment created",
    });
    await appointment.save();

    const populatedAppointment = await Appointment.findById(appointment._id)
      .populate("patientId", "name phone patientId email")
      .populate("doctorId", "name email")
      .populate("createdBy", "name email")
      .populate("originalAppointmentId", "appointmentNumber appointmentDate appointmentTime")
      .populate("visitId", "visitDate visitType diagnosis treatment")
      .populate("history.changedBy", "name email");

    logInfo("Appointment created", {
      createdBy: req.user.id,
      appointmentId: appointment._id,
      doctorId,
      patientId,
    });

    res.status(201).json({
      success: true,
      message: "Appointment created successfully",
      data: { appointment: populatedAppointment },
    });
  } catch (error) {
    logError("Create appointment error", error, {
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

// @desc    Update appointment
// @route   PUT /api/appointments/:id
// @access  Private
export const updateAppointment = async (req, res) => {
  try {
    const {
      doctorId,
      appointmentDate,
      appointmentTime,
      appointmentType,
      status,
      priority,
      chiefComplaint,
      notes,
      duration,
      reminderEnabled,
    } = req.body;

    const appointment = await Appointment.findById(req.params.id);

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: "Appointment not found",
      });
    }

    // Track previous values for history
    const previousValues = {
      appointmentDate: appointment.appointmentDate,
      appointmentTime: appointment.appointmentTime,
      status: appointment.status,
      priority: appointment.priority,
      doctorId: appointment.doctorId,
    };

    // Check slot availability if date/time or doctor is being changed
    const newDoctorId = doctorId || appointment.doctorId;
    if (appointmentDate || appointmentTime || doctorId) {
      const newDate = appointmentDate ? new Date(appointmentDate) : appointment.appointmentDate;
      const newTime = appointmentTime || appointment.appointmentTime;

      const startDate = new Date(newDate);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(newDate);
      endDate.setHours(23, 59, 59, 999);

      const existingAppointment = await Appointment.findOne({
        doctorId: newDoctorId,
        appointmentDate: { $gte: startDate, $lte: endDate },
        appointmentTime: newTime,
        status: { $ne: "cancelled" },
        _id: { $ne: appointment._id },
      });

      if (existingAppointment) {
        return res.status(400).json({
          success: false,
          message: "This time slot is already booked for the selected doctor",
        });
      }
    }

    // Check if status is being changed to completed
    const isBeingCompleted = status === "completed" && appointment.status !== "completed";
    
    // Update fields
    if (doctorId) appointment.doctorId = doctorId;
    if (appointmentDate) appointment.appointmentDate = new Date(appointmentDate);
    if (appointmentTime) appointment.appointmentTime = appointmentTime;
    if (appointmentType) appointment.appointmentType = appointmentType;
    if (status) appointment.status = status;
    if (priority) appointment.priority = priority;
    if (chiefComplaint !== undefined) appointment.chiefComplaint = chiefComplaint || null;
    if (notes !== undefined) appointment.notes = notes || null;
    if (duration) appointment.duration = duration;
    if (reminderEnabled !== undefined) appointment.reminderEnabled = reminderEnabled;
    appointment.updatedBy = req.user.id;

    // Create Visit record when appointment is completed
    if (isBeingCompleted && !appointment.visitId) {
      let previousVisitId = null;
      
      // If this is a follow-up appointment, find the previous visit
      if (appointment.isFollowUp && appointment.originalAppointmentId) {
        // Get the immediate previous appointment (the one this follow-up is based on)
        const previousAppointment = await Appointment.findById(appointment.originalAppointmentId)
          .populate("visitId");
        
        if (previousAppointment && previousAppointment.visitId) {
          // Use the visit from the immediate previous appointment
          previousVisitId = previousAppointment.visitId._id || previousAppointment.visitId;
        } else {
          // If previous appointment doesn't have a visit yet, try to find the most recent visit in the chain
          // This handles cases where appointments might be completed out of order
          let currentAppointmentId = appointment.originalAppointmentId;
          let foundVisitId = null;
          
          // Traverse backwards through the appointment chain to find the most recent visit
          while (currentAppointmentId && !foundVisitId) {
            const currentAppointment = await Appointment.findById(currentAppointmentId)
              .populate("visitId");
            
            if (currentAppointment && currentAppointment.visitId) {
              foundVisitId = currentAppointment.visitId._id || currentAppointment.visitId;
              break;
            }
            
            // Move to the next previous appointment in the chain
            if (currentAppointment && currentAppointment.originalAppointmentId) {
              currentAppointmentId = currentAppointment.originalAppointmentId;
            } else {
              break;
            }
          }
          
          previousVisitId = foundVisitId;
        }
      }

      // Create Visit record
      const visit = await Visit.create({
        patientId: appointment.patientId,
        appointmentId: appointment._id,
        previousVisitId: previousVisitId,
        visitDate: appointment.appointmentDate,
        visitType: appointment.isFollowUp ? "Follow-up" : "Consultation",
        chiefComplaint: appointment.chiefComplaint || null,
        diagnosis: null, // Can be filled later
        treatment: null, // Can be filled later
        notes: appointment.notes || null,
        doctorId: appointment.doctorId,
        doctorName: null, // Will be populated from doctorId
        createdBy: req.user.id,
      });

      // Update appointment with visitId
      appointment.visitId = visit._id;
      
      logInfo("Visit created from appointment", {
        appointmentId: appointment._id,
        visitId: visit._id,
        isFollowUp: appointment.isFollowUp,
        previousVisitId: previousVisitId,
      });
    }

    // Add to history
    appointment.history.push({
      action: isBeingCompleted ? "completed" : "updated",
      changedBy: req.user.id,
      previousValues,
      notes: isBeingCompleted ? "Appointment completed and visit created" : "Appointment updated",
    });

    await appointment.save();

    const populatedAppointment = await Appointment.findById(appointment._id)
      .populate("patientId", "name phone patientId email")
      .populate("doctorId", "name email")
      .populate("createdBy", "name email")
      .populate("updatedBy", "name email")
      .populate("originalAppointmentId", "appointmentNumber appointmentDate appointmentTime")
      .populate("visitId", "visitDate visitType diagnosis treatment")
      .populate("history.changedBy", "name email");

    logInfo("Appointment updated", {
      updatedBy: req.user.id,
      appointmentId: appointment._id,
    });

    res.status(200).json({
      success: true,
      message: "Appointment updated successfully",
      data: { appointment: populatedAppointment },
    });
  } catch (error) {
    logError("Update appointment error", error, {
      updatedBy: req.user?.id,
      appointmentId: req.params.id,
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

// @desc    Reschedule appointment
// @route   PUT /api/appointments/:id/reschedule
// @access  Private
export const rescheduleAppointment = async (req, res) => {
  try {
    const { appointmentDate, appointmentTime, reason } = req.body;

    if (!appointmentDate || !appointmentTime) {
      return res.status(400).json({
        success: false,
        message: "Appointment date and time are required",
      });
    }

    const appointment = await Appointment.findById(req.params.id);

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: "Appointment not found",
      });
    }

    if (appointment.status === "cancelled" || appointment.status === "completed") {
      return res.status(400).json({
        success: false,
        message: "Cannot reschedule a cancelled or completed appointment",
      });
    }

    // Check slot availability
    const newDate = new Date(appointmentDate);
    const startDate = new Date(newDate);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(newDate);
    endDate.setHours(23, 59, 59, 999);

    const existingAppointment = await Appointment.findOne({
      doctorId: appointment.doctorId,
      appointmentDate: { $gte: startDate, $lte: endDate },
      appointmentTime,
      status: { $ne: "cancelled" },
      _id: { $ne: appointment._id },
    });

    if (existingAppointment) {
      return res.status(400).json({
        success: false,
        message: "This time slot is already booked",
      });
    }

    // Store previous values
    appointment.rescheduledFrom = {
      date: appointment.appointmentDate,
      time: appointment.appointmentTime,
    };
    appointment.appointmentDate = newDate;
    appointment.appointmentTime = appointmentTime;
    appointment.status = "rescheduled";
    appointment.rescheduledBy = req.user.id;
    appointment.rescheduledAt = new Date();
    appointment.updatedBy = req.user.id;

    // Add to history
    appointment.history.push({
      action: "rescheduled",
      changedBy: req.user.id,
      previousValues: {
        appointmentDate: appointment.rescheduledFrom.date,
        appointmentTime: appointment.rescheduledFrom.time,
      },
      notes: reason || "Appointment rescheduled",
    });

    await appointment.save();

    const populatedAppointment = await Appointment.findById(appointment._id)
      .populate("patientId", "name phone patientId email")
      .populate("doctorId", "name email")
      .populate("rescheduledBy", "name email")
      .populate("history.changedBy", "name email");

    logInfo("Appointment rescheduled", {
      rescheduledBy: req.user.id,
      appointmentId: appointment._id,
    });

    res.status(200).json({
      success: true,
      message: "Appointment rescheduled successfully",
      data: { appointment: populatedAppointment },
    });
  } catch (error) {
    logError("Reschedule appointment error", error, {
      rescheduledBy: req.user?.id,
      appointmentId: req.params.id,
    });
    res.status(500).json({
      success: false,
      message: "Server error. Please try again later.",
    });
  }
};

// @desc    Cancel appointment
// @route   PUT /api/appointments/:id/cancel
// @access  Private
export const cancelAppointment = async (req, res) => {
  try {
    const { cancellationReason } = req.body;

    const appointment = await Appointment.findById(req.params.id);

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: "Appointment not found",
      });
    }

    if (appointment.status === "cancelled") {
      return res.status(400).json({
        success: false,
        message: "Appointment is already cancelled",
      });
    }

    if (appointment.status === "completed") {
      return res.status(400).json({
        success: false,
        message: "Cannot cancel a completed appointment",
      });
    }

    const previousStatus = appointment.status;
    appointment.status = "cancelled";
    appointment.cancellationReason = cancellationReason || null;
    appointment.cancelledBy = req.user.id;
    appointment.cancelledAt = new Date();
    appointment.updatedBy = req.user.id;

    // Add to history
    appointment.history.push({
      action: "cancelled",
      changedBy: req.user.id,
      previousValues: {
        status: previousStatus,
      },
      notes: cancellationReason || "Appointment cancelled",
    });

    await appointment.save();

    const populatedAppointment = await Appointment.findById(appointment._id)
      .populate("patientId", "name phone patientId email")
      .populate("doctorId", "name email")
      .populate("cancelledBy", "name email")
      .populate("history.changedBy", "name email");

    logInfo("Appointment cancelled", {
      cancelledBy: req.user.id,
      appointmentId: appointment._id,
    });

    res.status(200).json({
      success: true,
      message: "Appointment cancelled successfully",
      data: { appointment: populatedAppointment },
    });
  } catch (error) {
    logError("Cancel appointment error", error, {
      cancelledBy: req.user?.id,
      appointmentId: req.params.id,
    });
    res.status(500).json({
      success: false,
      message: "Server error. Please try again later.",
    });
  }
};

// @desc    Convert appointment to OPD visit
// @route   POST /api/appointments/:id/convert-to-opd
// @access  Private
export const convertToOPD = async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id);

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: "Appointment not found",
      });
    }

    if (appointment.convertedToOPD) {
      return res.status(400).json({
        success: false,
        message: "Appointment is already converted to OPD",
      });
    }

    if (appointment.status === "cancelled") {
      return res.status(400).json({
        success: false,
        message: "Cannot convert a cancelled appointment to OPD",
      });
    }

    // Create OPD record
    const opdRecord = await OPD.create({
      patientId: appointment.patientId,
      doctorId: appointment.doctorId,
      visitDate: appointment.appointmentDate,
      visitTime: appointment.appointmentTime,
      status: "registered",
      chiefComplaint: appointment.chiefComplaint || null,
      notes: appointment.notes || null,
      createdBy: req.user.id,
    });

    // Update appointment
    appointment.convertedToOPD = true;
    appointment.opdId = opdRecord._id;
    appointment.convertedAt = new Date();
    appointment.convertedBy = req.user.id;
    appointment.status = "completed";
    appointment.updatedBy = req.user.id;

    // Add to history
    appointment.history.push({
      action: "converted_to_opd",
      changedBy: req.user.id,
      notes: `Converted to OPD: ${opdRecord.opdNumber}`,
    });

    await appointment.save();

    const populatedAppointment = await Appointment.findById(appointment._id)
      .populate("patientId", "name phone patientId email")
      .populate("doctorId", "name email")
      .populate("opdId", "opdNumber status")
      .populate("convertedBy", "name email")
      .populate("history.changedBy", "name email");

    logInfo("Appointment converted to OPD", {
      convertedBy: req.user.id,
      appointmentId: appointment._id,
      opdId: opdRecord._id,
    });

    res.status(200).json({
      success: true,
      message: "Appointment converted to OPD successfully",
      data: {
        appointment: populatedAppointment,
        opd: opdRecord,
      },
    });
  } catch (error) {
    logError("Convert appointment to OPD error", error, {
      convertedBy: req.user?.id,
      appointmentId: req.params.id,
    });
    res.status(500).json({
      success: false,
      message: "Server error. Please try again later.",
    });
  }
};

// @desc    Delete appointment
// @route   DELETE /api/appointments/:id
// @access  Private
export const deleteAppointment = async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id);

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: "Appointment not found",
      });
    }

    await appointment.deleteOne();

    logInfo("Appointment deleted", {
      deletedBy: req.user.id,
      appointmentId: req.params.id,
    });

    res.status(200).json({
      success: true,
      message: "Appointment deleted successfully",
    });
  } catch (error) {
    logError("Delete appointment error", error, {
      deletedBy: req.user?.id,
      appointmentId: req.params.id,
    });
    res.status(500).json({
      success: false,
      message: "Server error. Please try again later.",
    });
  }
};
