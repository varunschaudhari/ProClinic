import IPD from "../models/IPD.js";
import Patient from "../models/Patient.js";
import Room from "../models/Room.js";
import User from "../models/User.js";
import { logInfo, logError } from "../config/logger.js";

// Helper function to update patientType based on active IPD records
const updatePatientType = async (patientId) => {
  try {
    // Check if patient has active IPD records (admitted or under-treatment)
    const activeIPDCount = await IPD.countDocuments({
      patientId: patientId,
      status: { $in: ["admitted", "under-treatment"] }
    });
    
    // Update patientType: inpatient if has active IPD, otherwise outpatient
    const patientType = activeIPDCount > 0 ? "inpatient" : "outpatient";
    
    await Patient.findByIdAndUpdate(patientId, { patientType });
    
    return patientType;
  } catch (error) {
    logError("Error updating patientType", error, { patientId });
    return null;
  }
};

// @desc    Get all IPD records
// @route   GET /api/ipd
// @access  Private
export const getIPDRecords = async (req, res) => {
  try {
    const {
      patientId,
      doctorId,
      status,
      admissionDate,
      startDate,
      endDate,
      roomId,
      paymentStatus,
    } = req.query;

    // Build query
    const query = {};

    if (patientId) query.patientId = patientId;
    if (doctorId) query.doctorId = doctorId;
    if (status) query.status = status;
    if (roomId) query.roomId = roomId;
    if (paymentStatus) query.paymentStatus = paymentStatus;

    // Date filtering
    if (admissionDate) {
      const startOfDay = new Date(admissionDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(admissionDate);
      endOfDay.setHours(23, 59, 59, 999);
      query.admissionDate = { $gte: startOfDay, $lte: endOfDay };
    } else if (startDate && endDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      query.admissionDate = { $gte: start, $lte: end };
    }

    const ipdRecords = await IPD.find(query)
      .populate("patientId", "name patientId phone email dateOfBirth gender")
      .populate("doctorId", "name email")
      .populate("roomId", "roomNumber roomType floor ward")
      .populate("createdBy", "name email")
      .sort({ admissionDate: -1 })
      .limit(parseInt(req.query.limit) || 100);

    logInfo("IPD records fetched", {
      userId: req.user.id,
      count: ipdRecords.length,
      filters: query,
    });

    res.status(200).json({
      success: true,
      count: ipdRecords.length,
      data: { ipdRecords },
    });
  } catch (error) {
    logError("Get IPD records error", error, {
      userId: req.user?.id,
    });
    res.status(500).json({
      success: false,
      message: "Server error. Please try again later.",
    });
  }
};

// @desc    Get current IPD admissions
// @route   GET /api/ipd/current
// @access  Private
export const getCurrentIPD = async (req, res) => {
  try {
    const { doctorId, roomId } = req.query;

    const query = {
      status: { $in: ["admitted", "under-treatment"] },
    };

    if (doctorId) query.doctorId = doctorId;
    if (roomId) query.roomId = roomId;

    const currentIPD = await IPD.find(query)
      .populate("patientId", "name patientId phone email dateOfBirth gender")
      .populate("doctorId", "name email")
      .populate("roomId", "roomNumber roomType floor ward")
      .sort({ admissionDate: -1 });

    // Calculate statistics
    const stats = {
      total: currentIPD.length,
      admitted: currentIPD.filter((ipd) => ipd.status === "admitted").length,
      underTreatment: currentIPD.filter((ipd) => ipd.status === "under-treatment").length,
    };

    logInfo("Current IPD admissions fetched", {
      userId: req.user.id,
      count: currentIPD.length,
    });

    res.status(200).json({
      success: true,
      count: currentIPD.length,
      stats,
      data: { ipdRecords: currentIPD },
    });
  } catch (error) {
    logError("Get current IPD error", error, {
      userId: req.user?.id,
    });
    res.status(500).json({
      success: false,
      message: "Server error. Please try again later.",
    });
  }
};

// @desc    Get single IPD record
// @route   GET /api/ipd/:id
// @access  Private
export const getIPDRecord = async (req, res) => {
  try {
    const ipdRecord = await IPD.findById(req.params.id)
      .populate("patientId", "name patientId phone email dateOfBirth gender address")
      .populate("doctorId", "name email")
      .populate("roomId", "roomNumber roomType floor ward beds ratePerDay")
      .populate("createdBy", "name email")
      .populate("updatedBy", "name email")
      .populate("dailyProgressNotes.recordedBy", "name email")
      .populate("prescriptions.prescribedBy", "name email");

    if (!ipdRecord) {
      return res.status(404).json({
        success: false,
        message: "IPD record not found",
      });
    }

    res.status(200).json({
      success: true,
      data: { ipdRecord },
    });
  } catch (error) {
    logError("Get IPD record error", error, {
      userId: req.user?.id,
      ipdRecordId: req.params.id,
    });
    res.status(500).json({
      success: false,
      message: "Server error. Please try again later.",
    });
  }
};

// @desc    Create IPD record (admit patient)
// @route   POST /api/ipd
// @access  Private
export const createIPDRecord = async (req, res) => {
  try {
    const {
      patientId, // Can be existing patient ID or null for new patient
      name,
      dateOfBirth,
      gender,
      phone,
      email,
      doctorId,
      admissionDate,
      admissionTime,
      admissionType,
      admissionReason,
      diagnosisOnAdmission,
      roomId,
      bedNumber,
      treatmentPlan,
      notes,
    } = req.body;

    let patient;
    if (patientId) {
      patient = await Patient.findById(patientId);
      if (!patient) {
        return res.status(404).json({
          success: false,
          message: "Existing patient not found",
        });
      }
    } else {
      // Create new patient if no patientId provided
      if (!name || !dateOfBirth || !gender || !phone) {
        return res.status(400).json({
          success: false,
          message: "Please provide name, date of birth, gender, and phone for new patient",
        });
      }
      patient = await Patient.create({
        name,
        dateOfBirth,
        gender,
        phone,
        email: email || null,
        createdBy: req.user.id,
      });
    }

    // Verify doctor exists
    const doctor = await User.findById(doctorId);
    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: "Doctor not found",
      });
    }

    // Handle room/bed assignment if provided
    let room = null;
    if (roomId) {
      room = await Room.findById(roomId);
      if (!room) {
        return res.status(404).json({
          success: false,
          message: "Room not found",
        });
      }

      // Update bed status if bedNumber provided
      if (bedNumber) {
        const bed = room.beds.find((b) => b.bedNumber === bedNumber);
        if (!bed) {
          return res.status(400).json({
            success: false,
            message: "Bed not found in the specified room",
          });
        }
        if (bed.status !== "available") {
          return res.status(400).json({
            success: false,
            message: "Bed is not available",
          });
        }
      }
    }

    const ipdRecord = await IPD.create({
      patientId: patient._id,
      doctorId,
      admissionDate: admissionDate || new Date(),
      admissionTime: admissionTime || null,
      admissionType: admissionType || "planned",
      admissionReason: admissionReason || null,
      diagnosisOnAdmission: diagnosisOnAdmission || null,
      roomId: roomId || null,
      roomNumber: room ? room.roomNumber : null,
      bedNumber: bedNumber || null,
      treatmentPlan: treatmentPlan || null,
      notes: notes || null,
      status: "admitted",
      createdBy: req.user.id,
    });

    // Update bed status if room and bed assigned
    if (room && bedNumber) {
      const bed = room.beds.find((b) => b.bedNumber === bedNumber);
      if (bed) {
        bed.status = "occupied";
        bed.currentPatientId = ipdRecord._id;
        await room.save();
      }
    }

    // Update patientType to "inpatient" since patient is now admitted
    await updatePatientType(patient._id);

    // Populate before sending response
    await ipdRecord.populate([
      { path: "patientId", select: "name patientId phone email dateOfBirth gender" },
      { path: "doctorId", select: "name email" },
      { path: "roomId", select: "roomNumber roomType floor ward" },
    ]);

    logInfo("IPD record created", {
      createdBy: req.user.id,
      ipdRecordId: ipdRecord._id,
      patientId: patient._id,
      ipdNumber: ipdRecord.ipdNumber,
    });

    res.status(201).json({
      success: true,
      message: "Patient admitted successfully",
      data: { ipdRecord },
    });
  } catch (error) {
    logError("Create IPD record error", error, {
      createdBy: req.user?.id,
      patientId: req.body.patientId,
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

// @desc    Update IPD record
// @route   PUT /api/ipd/:id
// @access  Private
export const updateIPDRecord = async (req, res) => {
  try {
    const {
      doctorId,
      admissionDate,
      admissionTime,
      admissionType,
      admissionReason,
      diagnosisOnAdmission,
      roomId,
      bedNumber,
      status,
      treatmentPlan,
      notes,
      roomCharges,
      medicationCharges,
      procedureCharges,
      labCharges,
      otherCharges,
      discount,
      paidAmount,
      paymentMethod,
      paymentDate,
    } = req.body;

    const ipdRecord = await IPD.findById(req.params.id);

    if (!ipdRecord) {
      return res.status(404).json({
        success: false,
        message: "IPD record not found",
      });
    }

    // Handle room/bed change
    if (roomId && roomId.toString() !== ipdRecord.roomId?.toString()) {
      // Free old bed if exists
      if (ipdRecord.roomId && ipdRecord.bedNumber) {
        const oldRoom = await Room.findById(ipdRecord.roomId);
        if (oldRoom) {
          const oldBed = oldRoom.beds.find((b) => b.bedNumber === ipdRecord.bedNumber);
          if (oldBed) {
            oldBed.status = "available";
            oldBed.currentPatientId = null;
            await oldRoom.save();
          }
        }
      }

      // Assign new room/bed
      const newRoom = await Room.findById(roomId);
      if (!newRoom) {
        return res.status(404).json({
          success: false,
          message: "Room not found",
        });
      }

      if (bedNumber) {
        const newBed = newRoom.beds.find((b) => b.bedNumber === bedNumber);
        if (!newBed) {
          return res.status(400).json({
            success: false,
            message: "Bed not found in the specified room",
          });
        }
        if (newBed.status !== "available" && newBed.currentPatientId?.toString() !== req.params.id) {
          return res.status(400).json({
            success: false,
            message: "Bed is not available",
          });
        }
        newBed.status = "occupied";
        newBed.currentPatientId = ipdRecord._id;
        await newRoom.save();
      }

      ipdRecord.roomId = roomId;
      ipdRecord.roomNumber = newRoom.roomNumber;
      ipdRecord.bedNumber = bedNumber || null;
    }

    // Update other fields
    if (doctorId) {
      const doctor = await User.findById(doctorId);
      if (!doctor) {
        return res.status(404).json({
          success: false,
          message: "Doctor not found",
        });
      }
      ipdRecord.doctorId = doctorId;
    }
    if (admissionDate) ipdRecord.admissionDate = admissionDate;
    if (admissionTime !== undefined) ipdRecord.admissionTime = admissionTime || null;
    if (admissionType) ipdRecord.admissionType = admissionType;
    if (admissionReason !== undefined) ipdRecord.admissionReason = admissionReason || null;
    if (diagnosisOnAdmission !== undefined) ipdRecord.diagnosisOnAdmission = diagnosisOnAdmission || null;
    if (status) ipdRecord.status = status;
    if (treatmentPlan !== undefined) ipdRecord.treatmentPlan = treatmentPlan || null;
    if (notes !== undefined) ipdRecord.notes = notes || null;

    // Update billing fields
    if (roomCharges !== undefined) ipdRecord.roomCharges = roomCharges;
    if (medicationCharges !== undefined) ipdRecord.medicationCharges = medicationCharges;
    if (procedureCharges !== undefined) ipdRecord.procedureCharges = procedureCharges;
    if (labCharges !== undefined) ipdRecord.labCharges = labCharges;
    if (otherCharges !== undefined) ipdRecord.otherCharges = otherCharges;
    if (discount !== undefined) ipdRecord.discount = discount;
    if (paidAmount !== undefined) ipdRecord.paidAmount = paidAmount;
    if (paymentMethod) ipdRecord.paymentMethod = paymentMethod;
    if (paymentDate) ipdRecord.paymentDate = paymentDate;

    ipdRecord.updatedBy = req.user.id;
    await ipdRecord.save();

    // Update patientType if status was changed (affects inpatient/outpatient status)
    if (status) {
      await updatePatientType(ipdRecord.patientId);
    }

    // Populate before sending response
    await ipdRecord.populate([
      { path: "patientId", select: "name patientId phone email dateOfBirth gender" },
      { path: "doctorId", select: "name email" },
      { path: "roomId", select: "roomNumber roomType floor ward" },
    ]);

    logInfo("IPD record updated", {
      updatedBy: req.user.id,
      ipdRecordId: ipdRecord._id,
    });

    res.status(200).json({
      success: true,
      message: "IPD record updated successfully",
      data: { ipdRecord },
    });
  } catch (error) {
    logError("Update IPD record error", error, {
      updatedBy: req.user?.id,
      ipdRecordId: req.params.id,
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

// @desc    Discharge patient
// @route   PUT /api/ipd/:id/discharge
// @access  Private
export const dischargePatient = async (req, res) => {
  try {
    const {
      dischargeDate,
      dischargeTime,
      dischargeType,
      dischargeSummary,
      dischargeInstructions,
      followUpRequired,
      followUpDate,
      followUpInstructions,
    } = req.body;

    const ipdRecord = await IPD.findById(req.params.id);

    if (!ipdRecord) {
      return res.status(404).json({
        success: false,
        message: "IPD record not found",
      });
    }

    if (ipdRecord.status === "discharged" || ipdRecord.status === "deceased" || ipdRecord.status === "absconded") {
      return res.status(400).json({
        success: false,
        message: "Patient is already discharged",
      });
    }

    // Update discharge details
    ipdRecord.dischargeDate = dischargeDate || new Date();
    ipdRecord.dischargeTime = dischargeTime || null;
    ipdRecord.dischargeType = dischargeType || "normal";
    ipdRecord.dischargeSummary = dischargeSummary || null;
    ipdRecord.dischargeInstructions = dischargeInstructions || null;
    ipdRecord.status = dischargeType === "deceased" ? "deceased" : "discharged";
    ipdRecord.followUpRequired = followUpRequired || false;
    ipdRecord.followUpDate = followUpDate || null;
    ipdRecord.followUpInstructions = followUpInstructions || null;
    ipdRecord.updatedBy = req.user.id;

    // Free the bed
    if (ipdRecord.roomId && ipdRecord.bedNumber) {
      const room = await Room.findById(ipdRecord.roomId);
      if (room) {
        const bed = room.beds.find((b) => b.bedNumber === ipdRecord.bedNumber);
        if (bed) {
          bed.status = "available";
          bed.currentPatientId = null;
          await room.save();
        }
      }
    }

    await ipdRecord.save();

    // Update patientType - check if patient still has other active IPD records
    await updatePatientType(ipdRecord.patientId);

    // Populate before sending response
    await ipdRecord.populate([
      { path: "patientId", select: "name patientId phone email dateOfBirth gender" },
      { path: "doctorId", select: "name email" },
      { path: "roomId", select: "roomNumber roomType floor ward" },
    ]);

    logInfo("Patient discharged", {
      dischargedBy: req.user.id,
      ipdRecordId: ipdRecord._id,
      ipdNumber: ipdRecord.ipdNumber,
    });

    res.status(200).json({
      success: true,
      message: "Patient discharged successfully",
      data: { ipdRecord },
    });
  } catch (error) {
    logError("Discharge patient error", error, {
      dischargedBy: req.user?.id,
      ipdRecordId: req.params.id,
    });
    res.status(500).json({
      success: false,
      message: "Server error. Please try again later.",
    });
  }
};

// @desc    Add daily progress note
// @route   POST /api/ipd/:id/progress-note
// @access  Private
export const addProgressNote = async (req, res) => {
  try {
    const { date, note } = req.body;

    if (!note) {
      return res.status(400).json({
        success: false,
        message: "Progress note is required",
      });
    }

    const ipdRecord = await IPD.findById(req.params.id);

    if (!ipdRecord) {
      return res.status(404).json({
        success: false,
        message: "IPD record not found",
      });
    }

    ipdRecord.dailyProgressNotes.push({
      date: date || new Date(),
      note,
      recordedBy: req.user.id,
    });

    ipdRecord.updatedBy = req.user.id;
    await ipdRecord.save();

    logInfo("Progress note added", {
      addedBy: req.user.id,
      ipdRecordId: ipdRecord._id,
    });

    res.status(200).json({
      success: true,
      message: "Progress note added successfully",
      data: { ipdRecord },
    });
  } catch (error) {
    logError("Add progress note error", error, {
      addedBy: req.user?.id,
      ipdRecordId: req.params.id,
    });
    res.status(500).json({
      success: false,
      message: "Server error. Please try again later.",
    });
  }
};

// @desc    Add prescription
// @route   POST /api/ipd/:id/prescription
// @access  Private
export const addPrescription = async (req, res) => {
  try {
    const { medication, dosage, frequency, duration, startDate, endDate } = req.body;

    if (!medication || !dosage || !frequency) {
      return res.status(400).json({
        success: false,
        message: "Medication, dosage, and frequency are required",
      });
    }

    const ipdRecord = await IPD.findById(req.params.id);

    if (!ipdRecord) {
      return res.status(404).json({
        success: false,
        message: "IPD record not found",
      });
    }

    ipdRecord.prescriptions.push({
      medication,
      dosage,
      frequency,
      duration: duration || null,
      startDate: startDate || new Date(),
      endDate: endDate || null,
      prescribedBy: req.user.id,
    });

    ipdRecord.updatedBy = req.user.id;
    await ipdRecord.save();

    logInfo("Prescription added", {
      addedBy: req.user.id,
      ipdRecordId: ipdRecord._id,
    });

    res.status(200).json({
      success: true,
      message: "Prescription added successfully",
      data: { ipdRecord },
    });
  } catch (error) {
    logError("Add prescription error", error, {
      addedBy: req.user?.id,
      ipdRecordId: req.params.id,
    });
    res.status(500).json({
      success: false,
      message: "Server error. Please try again later.",
    });
  }
};

// @desc    Add lab report
// @route   POST /api/ipd/:id/lab-report
// @access  Private
export const addLabReport = async (req, res) => {
  try {
    const { testName, testDate, result, fileUrl } = req.body;

    if (!testName) {
      return res.status(400).json({
        success: false,
        message: "Test name is required",
      });
    }

    const ipdRecord = await IPD.findById(req.params.id);

    if (!ipdRecord) {
      return res.status(404).json({
        success: false,
        message: "IPD record not found",
      });
    }

    ipdRecord.labReports.push({
      testName,
      testDate: testDate || new Date(),
      result: result || null,
      fileUrl: fileUrl || null,
    });

    ipdRecord.updatedBy = req.user.id;
    await ipdRecord.save();

    logInfo("Lab report added", {
      addedBy: req.user.id,
      ipdRecordId: ipdRecord._id,
    });

    res.status(200).json({
      success: true,
      message: "Lab report added successfully",
      data: { ipdRecord },
    });
  } catch (error) {
    logError("Add lab report error", error, {
      addedBy: req.user?.id,
      ipdRecordId: req.params.id,
    });
    res.status(500).json({
      success: false,
      message: "Server error. Please try again later.",
    });
  }
};

// @desc    Process payment
// @route   PUT /api/ipd/:id/payment
// @access  Private
export const processPayment = async (req, res) => {
  try {
    const { paidAmount, paymentMethod, paymentDate } = req.body;

    if (paidAmount === undefined || paidAmount < 0) {
      return res.status(400).json({
        success: false,
        message: "Valid paid amount is required",
      });
    }

    const ipdRecord = await IPD.findById(req.params.id);

    if (!ipdRecord) {
      return res.status(404).json({
        success: false,
        message: "IPD record not found",
      });
    }

    ipdRecord.paidAmount = paidAmount;
    ipdRecord.paymentMethod = paymentMethod || null;
    ipdRecord.paymentDate = paymentDate || new Date();

    // Payment status will be updated automatically in pre-save hook
    await ipdRecord.save();

    // Populate before sending response
    await ipdRecord.populate([
      { path: "patientId", select: "name patientId phone email" },
      { path: "doctorId", select: "name email" },
    ]);

    logInfo("Payment processed", {
      processedBy: req.user.id,
      ipdRecordId: ipdRecord._id,
      paidAmount,
    });

    res.status(200).json({
      success: true,
      message: "Payment processed successfully",
      data: { ipdRecord },
    });
  } catch (error) {
    logError("Process payment error", error, {
      processedBy: req.user?.id,
      ipdRecordId: req.params.id,
    });
    res.status(500).json({
      success: false,
      message: "Server error. Please try again later.",
    });
  }
};

// @desc    Get IPD statistics
// @route   GET /api/ipd/stats
// @access  Private
export const getIPDStats = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const query = {};
    if (startDate && endDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      query.admissionDate = { $gte: start, $lte: end };
    }

    const allIPD = await IPD.find(query);
    const currentIPD = await IPD.find({
      ...query,
      status: { $in: ["admitted", "under-treatment"] },
    });

    const stats = {
      totalAdmissions: allIPD.length,
      currentAdmissions: currentIPD.length,
      admitted: allIPD.filter((ipd) => ipd.status === "admitted").length,
      underTreatment: allIPD.filter((ipd) => ipd.status === "under-treatment").length,
      discharged: allIPD.filter((ipd) => ipd.status === "discharged").length,
      transferred: allIPD.filter((ipd) => ipd.status === "transferred").length,
      deceased: allIPD.filter((ipd) => ipd.status === "deceased").length,
      totalRevenue: allIPD.reduce((sum, ipd) => sum + (ipd.totalAmount || 0), 0),
      pendingPayments: allIPD.filter((ipd) => ipd.paymentStatus === "pending" || ipd.paymentStatus === "partial").length,
    };

    // Calculate average length of stay for discharged patients
    const dischargedIPD = allIPD.filter(
      (ipd) => ipd.status === "discharged" && ipd.dischargeDate && ipd.admissionDate
    );
    if (dischargedIPD.length > 0) {
      const totalDays = dischargedIPD.reduce((sum, ipd) => {
        const days = Math.ceil((ipd.dischargeDate - ipd.admissionDate) / (1000 * 60 * 60 * 24));
        return sum + days;
      }, 0);
      stats.averageLengthOfStay = (totalDays / dischargedIPD.length).toFixed(2);
    } else {
      stats.averageLengthOfStay = "0";
    }

    logInfo("IPD statistics fetched", {
      userId: req.user.id,
    });

    res.status(200).json({
      success: true,
      data: { stats },
    });
  } catch (error) {
    logError("Get IPD stats error", error, {
      userId: req.user?.id,
    });
    res.status(500).json({
      success: false,
      message: "Server error. Please try again later.",
    });
  }
};

// @desc    Delete IPD record
// @route   DELETE /api/ipd/:id
// @access  Private
export const deleteIPDRecord = async (req, res) => {
  try {
    const ipdRecord = await IPD.findById(req.params.id);

    if (!ipdRecord) {
      return res.status(404).json({
        success: false,
        message: "IPD record not found",
      });
    }

    // Free the bed if assigned
    if (ipdRecord.roomId && ipdRecord.bedNumber) {
      const room = await Room.findById(ipdRecord.roomId);
      if (room) {
        const bed = room.beds.find((b) => b.bedNumber === ipdRecord.bedNumber);
        if (bed) {
          bed.status = "available";
          bed.currentPatientId = null;
          await room.save();
        }
      }
    }

    await IPD.findByIdAndDelete(req.params.id);

    logInfo("IPD record deleted", {
      deletedBy: req.user.id,
      ipdRecordId: req.params.id,
    });

    res.status(200).json({
      success: true,
      message: "IPD record deleted successfully",
    });
  } catch (error) {
    logError("Delete IPD record error", error, {
      deletedBy: req.user?.id,
      ipdRecordId: req.params.id,
    });
    res.status(500).json({
      success: false,
      message: "Server error. Please try again later.",
    });
  }
};
