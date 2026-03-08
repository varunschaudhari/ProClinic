import Appointment from "../models/Appointment.js";
import Patient from "../models/Patient.js";
import DoctorSchedule from "../models/DoctorSchedule.js";
import Holiday from "../models/Holiday.js";
import { logInfo, logError } from "../config/logger.js";

// @desc    Get all appointments
// @route   GET /api/appointments
// @access  Private
export const getAppointments = async (req, res) => {
  try {
    const { doctorId, patientId, date, status } = req.query;
    const query = {};

    if (doctorId) query.doctorId = doctorId;
    if (patientId) query.patientId = patientId;
    if (date) {
      const startDate = new Date(date);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(date);
      endDate.setHours(23, 59, 59, 999);
      query.appointmentDate = { $gte: startDate, $lte: endDate };
    }
    if (status) query.status = status;

    const appointments = await Appointment.find(query)
      .populate("patientId", "name phone patientId")
      .populate("doctorId", "name email")
      .populate("createdBy", "name email")
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

// @desc    Get single appointment
// @route   GET /api/appointments/:id
// @access  Private
export const getAppointment = async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id)
      .populate("patientId")
      .populate("doctorId", "name email")
      .populate("createdBy", "name email");

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

    const appointment = await Appointment.create({
      patientId,
      doctorId,
      appointmentDate: appointmentDateTime,
      appointmentTime,
      appointmentType: appointmentType || "booked",
      chiefComplaint: chiefComplaint || null,
      notes: notes || null,
      createdBy: req.user.id,
    });

    const populatedAppointment = await Appointment.findById(appointment._id)
      .populate("patientId", "name phone patientId")
      .populate("doctorId", "name email")
      .populate("createdBy", "name email");

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
      appointmentDate,
      appointmentTime,
      appointmentType,
      status,
      chiefComplaint,
      notes,
    } = req.body;

    const appointment = await Appointment.findById(req.params.id);

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: "Appointment not found",
      });
    }

    // Check slot availability if date/time is being changed
    if (appointmentDate || appointmentTime) {
      const newDate = appointmentDate ? new Date(appointmentDate) : appointment.appointmentDate;
      const newTime = appointmentTime || appointment.appointmentTime;

      const startDate = new Date(newDate);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(newDate);
      endDate.setHours(23, 59, 59, 999);

      const existingAppointment = await Appointment.findOne({
        doctorId: appointment.doctorId,
        appointmentDate: { $gte: startDate, $lte: endDate },
        appointmentTime: newTime,
        status: { $ne: "cancelled" },
        _id: { $ne: appointment._id },
      });

      if (existingAppointment) {
        return res.status(400).json({
          success: false,
          message: "This time slot is already booked",
        });
      }
    }

    if (appointmentDate) appointment.appointmentDate = new Date(appointmentDate);
    if (appointmentTime) appointment.appointmentTime = appointmentTime;
    if (appointmentType) appointment.appointmentType = appointmentType;
    if (status) appointment.status = status;
    if (chiefComplaint !== undefined) appointment.chiefComplaint = chiefComplaint || null;
    if (notes !== undefined) appointment.notes = notes || null;

    await appointment.save();

    const populatedAppointment = await Appointment.findById(appointment._id)
      .populate("patientId", "name phone patientId")
      .populate("doctorId", "name email")
      .populate("createdBy", "name email");

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
