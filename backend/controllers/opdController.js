import OPD from "../models/OPD.js";
import Patient from "../models/Patient.js";
import User from "../models/User.js";
import { logInfo, logError } from "../config/logger.js";

// Helper function to get today's queue count for a doctor
const getTodayQueueCount = async (doctorId, visitDate) => {
  const startOfDay = new Date(visitDate);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(visitDate);
  endOfDay.setHours(23, 59, 59, 999);

  const count = await OPD.countDocuments({
    doctorId,
    visitDate: { $gte: startOfDay, $lte: endOfDay },
    status: { $in: ["registered", "waiting", "in-progress"] },
  });

  return count;
};

// @desc    Get all OPD records
// @route   GET /api/opd
// @access  Private
export const getOPDRecords = async (req, res) => {
  try {
    const {
      patientId,
      doctorId,
      status,
      date,
      startDate,
      endDate,
      paymentStatus,
    } = req.query;

    // Build query
    const query = {};

    if (patientId) query.patientId = patientId;
    if (doctorId) query.doctorId = doctorId;
    if (status) query.status = status;
    if (paymentStatus) query.paymentStatus = paymentStatus;

    // Date filtering
    if (date) {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);
      query.visitDate = { $gte: startOfDay, $lte: endOfDay };
    } else if (startDate && endDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      query.visitDate = { $gte: start, $lte: end };
    }

    const opdRecords = await OPD.find(query)
      .populate("patientId", "name patientId phone email dateOfBirth gender")
      .populate("doctorId", "name email")
      .populate("createdBy", "name email")
      .sort({ visitDate: -1, queueNumber: 1 })
      .limit(parseInt(req.query.limit) || 100);

    logInfo("OPD records fetched", {
      userId: req.user.id,
      count: opdRecords.length,
      filters: query,
    });

    res.status(200).json({
      success: true,
      count: opdRecords.length,
      data: { opdRecords },
    });
  } catch (error) {
    logError("Get OPD records error", error, {
      userId: req.user?.id,
    });
    res.status(500).json({
      success: false,
      message: "Server error. Please try again later.",
    });
  }
};

// @desc    Get today's OPD records
// @route   GET /api/opd/today
// @access  Private
export const getTodayOPD = async (req, res) => {
  try {
    const { doctorId } = req.query;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const query = {
      visitDate: { $gte: today, $lte: endOfDay },
    };

    if (doctorId) query.doctorId = doctorId;

    const opdRecords = await OPD.find(query)
      .populate("patientId", "name patientId phone email dateOfBirth gender")
      .populate("doctorId", "name email")
      .sort({ queueNumber: 1, visitDate: 1 });

    // Get statistics
    const stats = {
      total: opdRecords.length,
      registered: opdRecords.filter((r) => r.status === "registered").length,
      waiting: opdRecords.filter((r) => r.status === "waiting").length,
      inProgress: opdRecords.filter((r) => r.status === "in-progress").length,
      completed: opdRecords.filter((r) => r.status === "completed").length,
      cancelled: opdRecords.filter((r) => r.status === "cancelled").length,
      totalRevenue: opdRecords
        .filter((r) => r.paymentStatus === "paid")
        .reduce((sum, r) => sum + (r.paidAmount || 0), 0),
    };

    logInfo("Today's OPD records fetched", {
      userId: req.user.id,
      count: opdRecords.length,
    });

    res.status(200).json({
      success: true,
      count: opdRecords.length,
      stats,
      data: { opdRecords },
    });
  } catch (error) {
    logError("Get today's OPD error", error, {
      userId: req.user?.id,
    });
    res.status(500).json({
      success: false,
      message: "Server error. Please try again later.",
    });
  }
};

// @desc    Get OPD queue for a doctor
// @route   GET /api/opd/queue/:doctorId
// @access  Private
export const getOPDQueue = async (req, res) => {
  try {
    const { doctorId } = req.params;
    const { date } = req.query;

    const visitDate = date ? new Date(date) : new Date();
    visitDate.setHours(0, 0, 0, 0);
    const endOfDay = new Date(visitDate);
    endOfDay.setHours(23, 59, 59, 999);

    const queue = await OPD.find({
      doctorId,
      visitDate: { $gte: visitDate, $lte: endOfDay },
      status: { $in: ["registered", "waiting", "in-progress"] },
    })
      .populate("patientId", "name patientId phone email dateOfBirth gender")
      .sort({ queueNumber: 1, visitDate: 1 });

    logInfo("OPD queue fetched", {
      userId: req.user.id,
      doctorId,
      count: queue.length,
    });

    res.status(200).json({
      success: true,
      count: queue.length,
      data: { queue },
    });
  } catch (error) {
    logError("Get OPD queue error", error, {
      userId: req.user?.id,
      doctorId: req.params.doctorId,
    });
    res.status(500).json({
      success: false,
      message: "Server error. Please try again later.",
    });
  }
};

// @desc    Get single OPD record
// @route   GET /api/opd/:id
// @access  Private
export const getOPDRecord = async (req, res) => {
  try {
    const opdRecord = await OPD.findById(req.params.id)
      .populate("patientId")
      .populate("doctorId", "name email")
      .populate("createdBy", "name email")
      .populate("updatedBy", "name email");

    if (!opdRecord) {
      return res.status(404).json({
        success: false,
        message: "OPD record not found",
      });
    }

    res.status(200).json({
      success: true,
      data: { opdRecord },
    });
  } catch (error) {
    logError("Get OPD record error", error, {
      userId: req.user?.id,
      opdId: req.params.id,
    });
    res.status(500).json({
      success: false,
      message: "Server error. Please try again later.",
    });
  }
};

// @desc    Create OPD record
// @route   POST /api/opd
// @access  Private
export const createOPDRecord = async (req, res) => {
  try {
    const {
      patientId,
      doctorId,
      visitDate,
      visitTime,
      chiefComplaint,
      consultationFee,
      additionalCharges,
      discount,
    } = req.body;

    // Validate input
    if (!patientId || !doctorId) {
      return res.status(400).json({
        success: false,
        message: "Please provide patient and doctor",
      });
    }

    // Validate patient exists
    const patient = await Patient.findById(patientId);
    if (!patient) {
      return res.status(404).json({
        success: false,
        message: "Patient not found",
      });
    }

    // Validate doctor exists
    const doctor = await User.findById(doctorId);
    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: "Doctor not found",
      });
    }

    // Get queue number for today
    const visitDateObj = visitDate ? new Date(visitDate) : new Date();
    const queueNumber = await getTodayQueueCount(doctorId, visitDateObj);
    const finalQueueNumber = queueNumber + 1;

    // Create OPD record
    const opdRecord = await OPD.create({
      patientId,
      doctorId,
      visitDate: visitDate || new Date(),
      visitTime: visitTime || new Date().toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
      }),
      queueNumber: finalQueueNumber,
      status: "registered",
      chiefComplaint: chiefComplaint || null,
      consultationFee: consultationFee || 0,
      additionalCharges: additionalCharges || 0,
      discount: discount || 0,
      createdBy: req.user.id,
    });

    // Populate and return
    const populatedRecord = await OPD.findById(opdRecord._id)
      .populate("patientId", "name patientId phone email dateOfBirth gender")
      .populate("doctorId", "name email");

    logInfo("OPD record created", {
      createdBy: req.user.id,
      opdId: opdRecord._id,
      opdNumber: opdRecord.opdNumber,
      patientId,
      doctorId,
    });

    res.status(201).json({
      success: true,
      message: "OPD record created successfully",
      data: { opdRecord: populatedRecord },
    });
  } catch (error) {
    logError("Create OPD record error", error, {
      createdBy: req.user?.id,
      patientId: req.body.patientId,
      doctorId: req.body.doctorId,
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

// @desc    Update OPD record
// @route   PUT /api/opd/:id
// @access  Private
export const updateOPDRecord = async (req, res) => {
  try {
    const {
      visitDate,
      visitTime,
      status,
      chiefComplaint,
      diagnosis,
      treatment,
      prescription,
      notes,
      receptionRemarks,
      doctorRemarks,
      remarks,
      consultationFee,
      additionalCharges,
      discount,
      paidAmount,
      paymentMethod,
      paymentDate,
      followUpRequired,
      followUpDate,
      labTests,
    } = req.body;

    let opdRecord = await OPD.findById(req.params.id);

    if (!opdRecord) {
      return res.status(404).json({
        success: false,
        message: "OPD record not found",
      });
    }

    // Update fields
    if (visitDate) opdRecord.visitDate = visitDate;
    if (visitTime) opdRecord.visitTime = visitTime;
    if (status) opdRecord.status = status;
    if (chiefComplaint !== undefined) opdRecord.chiefComplaint = chiefComplaint || null;
    if (diagnosis !== undefined) opdRecord.diagnosis = diagnosis || null;
    if (treatment !== undefined) opdRecord.treatment = treatment || null;
    if (prescription !== undefined) opdRecord.prescription = prescription || null;
    if (notes !== undefined) opdRecord.notes = notes || null;
    if (receptionRemarks !== undefined) opdRecord.receptionRemarks = receptionRemarks || null;
    if (doctorRemarks !== undefined) opdRecord.doctorRemarks = doctorRemarks || null;
    if (remarks !== undefined) opdRecord.remarks = remarks || null;
    if (consultationFee !== undefined) opdRecord.consultationFee = consultationFee || 0;
    if (additionalCharges !== undefined) opdRecord.additionalCharges = additionalCharges || 0;
    if (discount !== undefined) opdRecord.discount = discount || 0;
    if (paidAmount !== undefined) opdRecord.paidAmount = paidAmount || 0;
    if (paymentMethod !== undefined) opdRecord.paymentMethod = paymentMethod || null;
    if (paymentDate !== undefined) opdRecord.paymentDate = paymentDate || null;
    if (followUpRequired !== undefined) opdRecord.followUpRequired = followUpRequired;
    if (followUpDate !== undefined) opdRecord.followUpDate = followUpDate || null;
    if (labTests !== undefined) opdRecord.labTests = labTests;
    opdRecord.updatedBy = req.user.id;

    await opdRecord.save();

    // Populate and return
    const populatedRecord = await OPD.findById(opdRecord._id)
      .populate("patientId", "name patientId phone email dateOfBirth gender")
      .populate("doctorId", "name email")
      .populate("updatedBy", "name email");

    logInfo("OPD record updated", {
      updatedBy: req.user.id,
      opdId: opdRecord._id,
      opdNumber: opdRecord.opdNumber,
    });

    res.status(200).json({
      success: true,
      message: "OPD record updated successfully",
      data: { opdRecord: populatedRecord },
    });
  } catch (error) {
    logError("Update OPD record error", error, {
      updatedBy: req.user?.id,
      opdId: req.params.id,
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

// @desc    Update OPD status
// @route   PATCH /api/opd/:id/status
// @access  Private
export const updateOPDStatus = async (req, res) => {
  try {
    const { status } = req.body;

    if (!status || !["registered", "waiting", "in-progress", "completed", "cancelled"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status. Must be one of: registered, waiting, in-progress, completed, cancelled",
      });
    }

    const opdRecord = await OPD.findById(req.params.id);

    if (!opdRecord) {
      return res.status(404).json({
        success: false,
        message: "OPD record not found",
      });
    }

    opdRecord.status = status;
    opdRecord.updatedBy = req.user.id;

    // If completing, set payment date if not set
    if (status === "completed" && !opdRecord.paymentDate) {
      opdRecord.paymentDate = new Date();
    }

    await opdRecord.save();

    const populatedRecord = await OPD.findById(opdRecord._id)
      .populate("patientId", "name patientId phone email dateOfBirth gender")
      .populate("doctorId", "name email");

    logInfo("OPD status updated", {
      updatedBy: req.user.id,
      opdId: opdRecord._id,
      oldStatus: opdRecord.status,
      newStatus: status,
    });

    res.status(200).json({
      success: true,
      message: "OPD status updated successfully",
      data: { opdRecord: populatedRecord },
    });
  } catch (error) {
    logError("Update OPD status error", error, {
      updatedBy: req.user?.id,
      opdId: req.params.id,
    });
    res.status(500).json({
      success: false,
      message: "Server error. Please try again later.",
    });
  }
};

// @desc    Process payment
// @route   PATCH /api/opd/:id/payment
// @access  Private
export const processPayment = async (req, res) => {
  try {
    const { paidAmount, paymentMethod } = req.body;

    if (!paidAmount || paidAmount < 0) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid paid amount",
      });
    }

    const opdRecord = await OPD.findById(req.params.id);

    if (!opdRecord) {
      return res.status(404).json({
        success: false,
        message: "OPD record not found",
      });
    }

    opdRecord.paidAmount = paidAmount;
    if (paymentMethod) opdRecord.paymentMethod = paymentMethod;
    opdRecord.paymentDate = new Date();
    opdRecord.updatedBy = req.user.id;

    // Payment status will be updated automatically in pre-save hook
    await opdRecord.save();

    const populatedRecord = await OPD.findById(opdRecord._id)
      .populate("patientId", "name patientId phone email dateOfBirth gender")
      .populate("doctorId", "name email");

    logInfo("OPD payment processed", {
      updatedBy: req.user.id,
      opdId: opdRecord._id,
      paidAmount,
      paymentMethod,
    });

    res.status(200).json({
      success: true,
      message: "Payment processed successfully",
      data: { opdRecord: populatedRecord },
    });
  } catch (error) {
    logError("Process payment error", error, {
      updatedBy: req.user?.id,
      opdId: req.params.id,
    });
    res.status(500).json({
      success: false,
      message: "Server error. Please try again later.",
    });
  }
};

// @desc    Process refund
// @route   PATCH /api/opd/:id/refund
// @access  Private
export const processRefund = async (req, res) => {
  try {
    const { amount, method, referenceNo, note, refundedAt } = req.body;

    const refundAmount = Number(amount);
    if (!refundAmount || Number.isNaN(refundAmount) || refundAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid refund amount",
      });
    }

    const opdRecord = await OPD.findById(req.params.id);

    if (!opdRecord) {
      return res.status(404).json({
        success: false,
        message: "OPD record not found",
      });
    }

    const currentPaid = opdRecord.paidAmount || 0;
    if (refundAmount > currentPaid) {
      return res.status(400).json({
        success: false,
        message: "Refund amount cannot be greater than paid amount",
      });
    }

    opdRecord.paidAmount = Math.max(0, currentPaid - refundAmount);
    opdRecord.paymentDate = new Date();
    opdRecord.updatedBy = req.user.id;

    opdRecord.refunds = opdRecord.refunds || [];
    opdRecord.refunds.push({
      amount: refundAmount,
      method: method || "cash",
      referenceNo: referenceNo || null,
      note: note || null,
      refundedAt: refundedAt ? new Date(refundedAt) : new Date(),
      refundedBy: req.user.id,
    });

    // Payment status will be updated automatically in pre-save hook
    await opdRecord.save();

    const populatedRecord = await OPD.findById(opdRecord._id)
      .populate("patientId", "name patientId phone email dateOfBirth gender")
      .populate("doctorId", "name email");

    logInfo("OPD refund processed", {
      updatedBy: req.user.id,
      opdId: opdRecord._id,
      refundAmount,
      method,
    });

    res.status(200).json({
      success: true,
      message: "Refund processed successfully",
      data: { opdRecord: populatedRecord },
    });
  } catch (error) {
    logError("Process refund error", error, {
      updatedBy: req.user?.id,
      opdId: req.params.id,
    });
    res.status(500).json({
      success: false,
      message: "Server error. Please try again later.",
    });
  }
};

// @desc    Add credit note
// @route   PATCH /api/opd/:id/credit-note
// @access  Private
export const addCreditNote = async (req, res) => {
  try {
    const { amount, referenceNo, note, issuedAt } = req.body;

    const creditAmount = Number(amount);
    if (!creditAmount || Number.isNaN(creditAmount) || creditAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid credit note amount",
      });
    }

    const opdRecord = await OPD.findById(req.params.id);

    if (!opdRecord) {
      return res.status(404).json({
        success: false,
        message: "OPD record not found",
      });
    }

    // Apply credit note as additional discount (reduces totalAmount)
    const currentDiscount = opdRecord.discount || 0;
    opdRecord.discount = currentDiscount + creditAmount;

    opdRecord.creditNotes = opdRecord.creditNotes || [];
    opdRecord.creditNotes.push({
      amount: creditAmount,
      referenceNo: referenceNo || null,
      note: note || null,
      issuedAt: issuedAt ? new Date(issuedAt) : new Date(),
      issuedBy: req.user.id,
    });

    opdRecord.updatedBy = req.user.id;
    await opdRecord.save();

    const populatedRecord = await OPD.findById(opdRecord._id)
      .populate("patientId", "name patientId phone email dateOfBirth gender")
      .populate("doctorId", "name email");

    logInfo("OPD credit note added", {
      updatedBy: req.user.id,
      opdId: opdRecord._id,
      creditAmount,
    });

    res.status(200).json({
      success: true,
      message: "Credit note added successfully",
      data: { opdRecord: populatedRecord },
    });
  } catch (error) {
    logError("Add credit note error", error, {
      updatedBy: req.user?.id,
      opdId: req.params.id,
    });
    res.status(500).json({
      success: false,
      message: "Server error. Please try again later.",
    });
  }
};

// @desc    Record billing advance (bill-level)
// @route   PATCH /api/opd/:id/advance
// @access  Private
export const recordAdvance = async (req, res) => {
  try {
    const { amount, method, referenceNo, note, receivedAt } = req.body;

    const advanceAmount = Number(amount);
    if (!advanceAmount || Number.isNaN(advanceAmount) || advanceAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid advance amount",
      });
    }

    const opdRecord = await OPD.findById(req.params.id);

    if (!opdRecord) {
      return res.status(404).json({
        success: false,
        message: "OPD record not found",
      });
    }

    opdRecord.advanceAmount = (opdRecord.advanceAmount || 0) + advanceAmount;
    opdRecord.paidAmount = (opdRecord.paidAmount || 0) + advanceAmount;
    opdRecord.paymentMethod = method || opdRecord.paymentMethod;
    opdRecord.paymentDate = new Date();

    opdRecord.advances = opdRecord.advances || [];
    opdRecord.advances.push({
      amount: advanceAmount,
      method: method || "cash",
      referenceNo: referenceNo || null,
      note: note || null,
      receivedAt: receivedAt ? new Date(receivedAt) : new Date(),
      receivedBy: req.user.id,
    });

    opdRecord.updatedBy = req.user.id;
    await opdRecord.save();

    const populatedRecord = await OPD.findById(opdRecord._id)
      .populate("patientId", "name patientId phone email dateOfBirth gender")
      .populate("doctorId", "name email");

    logInfo("OPD advance recorded", {
      updatedBy: req.user.id,
      opdId: opdRecord._id,
      advanceAmount,
    });

    res.status(200).json({
      success: true,
      message: "Advance recorded successfully",
      data: { opdRecord: populatedRecord },
    });
  } catch (error) {
    logError("Record advance error", error, {
      updatedBy: req.user?.id,
      opdId: req.params.id,
    });
    res.status(500).json({
      success: false,
      message: "Server error. Please try again later.",
    });
  }
};

// @desc    Delete OPD record
// @route   DELETE /api/opd/:id
// @access  Private
export const deleteOPDRecord = async (req, res) => {
  try {
    const opdRecord = await OPD.findById(req.params.id);

    if (!opdRecord) {
      return res.status(404).json({
        success: false,
        message: "OPD record not found",
      });
    }

    await OPD.findByIdAndDelete(req.params.id);

    logInfo("OPD record deleted", {
      deletedBy: req.user.id,
      opdId: req.params.id,
      opdNumber: opdRecord.opdNumber,
    });

    res.status(200).json({
      success: true,
      message: "OPD record deleted successfully",
    });
  } catch (error) {
    logError("Delete OPD record error", error, {
      deletedBy: req.user?.id,
      opdId: req.params.id,
    });
    res.status(500).json({
      success: false,
      message: "Server error. Please try again later.",
    });
  }
};

// @desc    Get OPD statistics
// @route   GET /api/opd/stats
// @access  Private
export const getOPDStats = async (req, res) => {
  try {
    const { startDate, endDate, doctorId } = req.query;

    const query = {};
    if (doctorId) query.doctorId = doctorId;

    if (startDate && endDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      query.visitDate = { $gte: start, $lte: end };
    } else {
      // Default to today
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const endOfDay = new Date();
      endOfDay.setHours(23, 59, 59, 999);
      query.visitDate = { $gte: today, $lte: endOfDay };
    }

    const opdRecords = await OPD.find(query);

    const stats = {
      total: opdRecords.length,
      registered: opdRecords.filter((r) => r.status === "registered").length,
      waiting: opdRecords.filter((r) => r.status === "waiting").length,
      inProgress: opdRecords.filter((r) => r.status === "in-progress").length,
      completed: opdRecords.filter((r) => r.status === "completed").length,
      cancelled: opdRecords.filter((r) => r.status === "cancelled").length,
      totalRevenue: opdRecords
        .filter((r) => r.paymentStatus === "paid")
        .reduce((sum, r) => sum + (r.paidAmount || 0), 0),
      pendingRevenue: opdRecords
        .filter((r) => r.paymentStatus !== "paid")
        .reduce((sum, r) => sum + (r.totalAmount - (r.paidAmount || 0)), 0),
      totalAmount: opdRecords.reduce((sum, r) => sum + (r.totalAmount || 0), 0),
    };

    res.status(200).json({
      success: true,
      data: { stats },
    });
  } catch (error) {
    logError("Get OPD stats error", error, {
      userId: req.user?.id,
    });
    res.status(500).json({
      success: false,
      message: "Server error. Please try again later.",
    });
  }
};
