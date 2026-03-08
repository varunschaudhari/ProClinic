import ClinicalData from "../models/ClinicalData.js";
import OPD from "../models/OPD.js";
import IPD from "../models/IPD.js";
import { logInfo, logError } from "../config/logger.js";

// @desc    Get clinical data for a patient
// @route   GET /api/patients/:patientId/clinical-data
// @access  Private
export const getClinicalData = async (req, res) => {
  try {
    const { patientId } = req.params;

    // Get standalone clinical data
    const clinicalData = await ClinicalData.find({ patientId })
      .populate("createdBy", "name email role")
      .populate("updatedBy", "name email role")
      .populate("vitalSigns.recordedBy", "name email")
      .populate("labResults.orderedBy", "name email")
      .populate("labResults.reviewedBy", "name email")
      .populate("imagingReports.orderedBy", "name email")
      .populate("imagingReports.reviewedBy", "name email")
      .populate("clinicalObservations.recordedBy", "name email")
      .sort({ createdAt: -1 });

    // Get clinical data from OPD records
    const opdRecords = await OPD.find({ patientId })
      .populate("doctorId", "name email")
      .select("visitDate chiefComplaint diagnosis treatment prescription labTests")
      .sort({ visitDate: -1 });

    // Get clinical data from IPD records
    const ipdRecords = await IPD.find({ patientId })
      .populate("doctorId", "name email")
      .select(
        "admissionDate diagnosisOnAdmission dailyProgressNotes labReports prescriptions"
      )
      .sort({ admissionDate: -1 });

    logInfo(`Fetched clinical data for patient ${patientId}`);

    res.status(200).json({
      success: true,
      data: {
        standalone: clinicalData,
        fromOPD: opdRecords,
        fromIPD: ipdRecords,
      },
    });
  } catch (error) {
    logError("Get clinical data error", error);
    res.status(500).json({
      success: false,
      message: "Error fetching clinical data",
      error: error.message,
    });
  }
};

// @desc    Create or update clinical data
// @route   POST /api/patients/:patientId/clinical-data
// @access  Private
export const createClinicalData = async (req, res) => {
  try {
    const { patientId } = req.params;
    const userId = req.user.id;
    const {
      sourceType,
      sourceId,
      vitalSigns,
      labResults,
      imagingReports,
      clinicalObservations,
    } = req.body;

    const clinicalData = new ClinicalData({
      patientId,
      sourceType: sourceType || "standalone",
      sourceId: sourceId || null,
      vitalSigns: vitalSigns || [],
      labResults: labResults || [],
      imagingReports: imagingReports || [],
      clinicalObservations: clinicalObservations || [],
      createdBy: userId,
      updatedBy: userId,
    });

    const savedData = await clinicalData.save();
    await savedData.populate([
      { path: "createdBy", select: "name email role" },
      { path: "vitalSigns.recordedBy", select: "name email" },
      { path: "labResults.orderedBy", select: "name email" },
      { path: "imagingReports.orderedBy", select: "name email" },
      { path: "clinicalObservations.recordedBy", select: "name email" },
    ]);

    logInfo(`Created clinical data for patient ${patientId}`);

    res.status(201).json({
      success: true,
      message: "Clinical data created successfully",
      data: savedData,
    });
  } catch (error) {
    logError("Create clinical data error", error);
    res.status(500).json({
      success: false,
      message: "Error creating clinical data",
      error: error.message,
    });
  }
};

// @desc    Add vital signs
// @route   POST /api/patients/:patientId/clinical-data/vital-signs
// @access  Private
export const addVitalSigns = async (req, res) => {
  try {
    const { patientId } = req.params;
    const userId = req.user.id;
    const vitalSignsData = req.body;

    let clinicalData = await ClinicalData.findOne({
      patientId,
      sourceType: "standalone",
    });

    if (!clinicalData) {
      clinicalData = new ClinicalData({
        patientId,
        sourceType: "standalone",
        createdBy: userId,
        updatedBy: userId,
      });
    }

    clinicalData.vitalSigns.push({
      ...vitalSignsData,
      recordedBy: userId,
    });

    clinicalData.updatedBy = userId;
    const savedData = await clinicalData.save();
    await savedData.populate([
      { path: "vitalSigns.recordedBy", select: "name email" },
    ]);

    logInfo(`Added vital signs for patient ${patientId}`);

    res.status(200).json({
      success: true,
      message: "Vital signs added successfully",
      data: savedData,
    });
  } catch (error) {
    logError("Add vital signs error", error);
    res.status(500).json({
      success: false,
      message: "Error adding vital signs",
      error: error.message,
    });
  }
};

// @desc    Add lab result
// @route   POST /api/patients/:patientId/clinical-data/lab-results
// @access  Private
export const addLabResult = async (req, res) => {
  try {
    const { patientId } = req.params;
    const userId = req.user.id;
    const labResultData = req.body;

    let clinicalData = await ClinicalData.findOne({
      patientId,
      sourceType: "standalone",
    });

    if (!clinicalData) {
      clinicalData = new ClinicalData({
        patientId,
        sourceType: "standalone",
        createdBy: userId,
        updatedBy: userId,
      });
    }

    clinicalData.labResults.push({
      ...labResultData,
      orderedBy: userId,
    });

    clinicalData.updatedBy = userId;
    const savedData = await clinicalData.save();
    await savedData.populate([
      { path: "labResults.orderedBy", select: "name email" },
    ]);

    logInfo(`Added lab result for patient ${patientId}`);

    res.status(200).json({
      success: true,
      message: "Lab result added successfully",
      data: savedData,
    });
  } catch (error) {
    logError("Add lab result error", error);
    res.status(500).json({
      success: false,
      message: "Error adding lab result",
      error: error.message,
    });
  }
};

// @desc    Add imaging report
// @route   POST /api/patients/:patientId/clinical-data/imaging-reports
// @access  Private
export const addImagingReport = async (req, res) => {
  try {
    const { patientId } = req.params;
    const userId = req.user.id;
    const imagingReportData = req.body;

    let clinicalData = await ClinicalData.findOne({
      patientId,
      sourceType: "standalone",
    });

    if (!clinicalData) {
      clinicalData = new ClinicalData({
        patientId,
        sourceType: "standalone",
        createdBy: userId,
        updatedBy: userId,
      });
    }

    clinicalData.imagingReports.push({
      ...imagingReportData,
      orderedBy: userId,
    });

    clinicalData.updatedBy = userId;
    const savedData = await clinicalData.save();
    await savedData.populate([
      { path: "imagingReports.orderedBy", select: "name email" },
    ]);

    logInfo(`Added imaging report for patient ${patientId}`);

    res.status(200).json({
      success: true,
      message: "Imaging report added successfully",
      data: savedData,
    });
  } catch (error) {
    logError("Add imaging report error", error);
    res.status(500).json({
      success: false,
      message: "Error adding imaging report",
      error: error.message,
    });
  }
};

// @desc    Add clinical observation
// @route   POST /api/patients/:patientId/clinical-data/observations
// @access  Private
export const addClinicalObservation = async (req, res) => {
  try {
    const { patientId } = req.params;
    const userId = req.user.id;
    const observationData = req.body;

    let clinicalData = await ClinicalData.findOne({
      patientId,
      sourceType: "standalone",
    });

    if (!clinicalData) {
      clinicalData = new ClinicalData({
        patientId,
        sourceType: "standalone",
        createdBy: userId,
        updatedBy: userId,
      });
    }

    clinicalData.clinicalObservations.push({
      ...observationData,
      recordedBy: userId,
    });

    clinicalData.updatedBy = userId;
    const savedData = await clinicalData.save();
    await savedData.populate([
      { path: "clinicalObservations.recordedBy", select: "name email" },
    ]);

    logInfo(`Added clinical observation for patient ${patientId}`);

    res.status(200).json({
      success: true,
      message: "Clinical observation added successfully",
      data: savedData,
    });
  } catch (error) {
    logError("Add clinical observation error", error);
    res.status(500).json({
      success: false,
      message: "Error adding clinical observation",
      error: error.message,
    });
  }
};
