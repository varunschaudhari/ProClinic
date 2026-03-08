import Visit from "../models/Visit.js";
import Patient from "../models/Patient.js";
import { logInfo, logError } from "../config/logger.js";

// @desc    Get all visits for a patient
// @route   GET /api/visits/patient/:patientId
// @access  Private
export const getPatientVisits = async (req, res) => {
  try {
    const visits = await Visit.find({ patientId: req.params.patientId })
      .sort({ visitDate: -1 })
      .populate("createdBy", "name email");

    logInfo("Patient visits fetched", {
      userId: req.user.id,
      patientId: req.params.patientId,
      count: visits.length,
    });

    res.status(200).json({
      success: true,
      count: visits.length,
      data: { visits },
    });
  } catch (error) {
    logError("Get patient visits error", error, {
      userId: req.user?.id,
      patientId: req.params.patientId,
    });
    res.status(500).json({
      success: false,
      message: "Server error. Please try again later.",
    });
  }
};

// @desc    Get single visit
// @route   GET /api/visits/:id
// @access  Private
export const getVisit = async (req, res) => {
  try {
    const visit = await Visit.findById(req.params.id).populate(
      "createdBy",
      "name email"
    );

    if (!visit) {
      return res.status(404).json({
        success: false,
        message: "Visit not found",
      });
    }

    res.status(200).json({
      success: true,
      data: { visit },
    });
  } catch (error) {
    logError("Get visit error", error, {
      userId: req.user?.id,
      visitId: req.params.id,
    });
    res.status(500).json({
      success: false,
      message: "Server error. Please try again later.",
    });
  }
};

// @desc    Create visit
// @route   POST /api/visits
// @access  Private
export const createVisit = async (req, res) => {
  try {
    const {
      patientId,
      visitDate,
      visitType,
      chiefComplaint,
      diagnosis,
      treatment,
      notes,
      doctorName,
    } = req.body;

    // Validate patient exists
    const patient = await Patient.findById(patientId);
    if (!patient) {
      return res.status(404).json({
        success: false,
        message: "Patient not found",
      });
    }

    const visit = await Visit.create({
      patientId,
      visitDate: visitDate || new Date(),
      visitType: visitType || "Consultation",
      chiefComplaint: chiefComplaint || null,
      diagnosis: diagnosis || null,
      treatment: treatment || null,
      notes: notes || null,
      doctorName: doctorName || null,
      createdBy: req.user.id,
    });

    logInfo("Visit created", {
      createdBy: req.user.id,
      visitId: visit._id,
      patientId: patientId,
    });

    res.status(201).json({
      success: true,
      message: "Visit created successfully",
      data: { visit },
    });
  } catch (error) {
    logError("Create visit error", error, {
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

// @desc    Update visit
// @route   PUT /api/visits/:id
// @access  Private
export const updateVisit = async (req, res) => {
  try {
    const {
      visitDate,
      visitType,
      chiefComplaint,
      diagnosis,
      treatment,
      notes,
      doctorName,
    } = req.body;

    const visit = await Visit.findById(req.params.id);

    if (!visit) {
      return res.status(404).json({
        success: false,
        message: "Visit not found",
      });
    }

    // Update visit fields
    if (visitDate) visit.visitDate = visitDate;
    if (visitType) visit.visitType = visitType;
    if (chiefComplaint !== undefined) visit.chiefComplaint = chiefComplaint || null;
    if (diagnosis !== undefined) visit.diagnosis = diagnosis || null;
    if (treatment !== undefined) visit.treatment = treatment || null;
    if (notes !== undefined) visit.notes = notes || null;
    if (doctorName !== undefined) visit.doctorName = doctorName || null;

    await visit.save();

    logInfo("Visit updated", {
      updatedBy: req.user.id,
      visitId: visit._id,
    });

    res.status(200).json({
      success: true,
      message: "Visit updated successfully",
      data: { visit },
    });
  } catch (error) {
    logError("Update visit error", error, {
      updatedBy: req.user?.id,
      visitId: req.params.id,
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

// @desc    Delete visit
// @route   DELETE /api/visits/:id
// @access  Private
export const deleteVisit = async (req, res) => {
  try {
    const visit = await Visit.findById(req.params.id);

    if (!visit) {
      return res.status(404).json({
        success: false,
        message: "Visit not found",
      });
    }

    await Visit.findByIdAndDelete(req.params.id);

    logInfo("Visit deleted", {
      deletedBy: req.user.id,
      visitId: req.params.id,
    });

    res.status(200).json({
      success: true,
      message: "Visit deleted successfully",
    });
  } catch (error) {
    logError("Delete visit error", error, {
      deletedBy: req.user?.id,
      visitId: req.params.id,
    });
    res.status(500).json({
      success: false,
      message: "Server error. Please try again later.",
    });
  }
};
