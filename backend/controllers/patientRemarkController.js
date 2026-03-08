import PatientRemark from "../models/PatientRemark.js";
import { logInfo, logError } from "../config/logger.js";

// @desc    Get all remarks for a patient
// @route   GET /api/patients/:patientId/remarks
// @access  Private
export const getPatientRemarks = async (req, res) => {
  try {
    const { patientId } = req.params;
    const { remarkType } = req.query;

    const query = { patientId };
    if (remarkType) {
      query.remarkType = remarkType;
    }

    const remarks = await PatientRemark.find(query)
      .populate("createdBy", "name email role")
      .sort({ createdAt: -1 });

    logInfo(`Fetched ${remarks.length} remarks for patient ${patientId}`);

    res.status(200).json({
      success: true,
      data: remarks,
      count: remarks.length,
    });
  } catch (error) {
    logError("Get patient remarks error", error);
    res.status(500).json({
      success: false,
      message: "Error fetching patient remarks",
      error: error.message,
    });
  }
};

// @desc    Create a new remark
// @route   POST /api/patients/:patientId/remarks
// @access  Private
export const createPatientRemark = async (req, res) => {
  try {
    const { patientId } = req.params;
    const { remark, remarkType, allowedRoles, isPrivate } = req.body;
    const userId = req.user.id;

    const newRemark = new PatientRemark({
      patientId,
      remark,
      remarkType: remarkType || "general",
      allowedRoles: allowedRoles || ["doctor", "nurse"],
      isPrivate: isPrivate || false,
      createdBy: userId,
    });

    const savedRemark = await newRemark.save();
    await savedRemark.populate("createdBy", "name email role");

    logInfo(`Created remark for patient ${patientId} by user ${userId}`);

    res.status(201).json({
      success: true,
      message: "Remark created successfully",
      data: savedRemark,
    });
  } catch (error) {
    logError("Create patient remark error", error);
    res.status(500).json({
      success: false,
      message: "Error creating patient remark",
      error: error.message,
    });
  }
};

// @desc    Update a remark
// @route   PUT /api/patients/:patientId/remarks/:remarkId
// @access  Private
export const updatePatientRemark = async (req, res) => {
  try {
    const { remarkId } = req.params;
    const { remark, remarkType, allowedRoles, isPrivate } = req.body;

    const updatedRemark = await PatientRemark.findByIdAndUpdate(
      remarkId,
      {
        remark,
        remarkType,
        allowedRoles,
        isPrivate,
      },
      { new: true, runValidators: true }
    ).populate("createdBy", "name email role");

    if (!updatedRemark) {
      return res.status(404).json({
        success: false,
        message: "Remark not found",
      });
    }

    logInfo(`Updated remark ${remarkId}`);

    res.status(200).json({
      success: true,
      message: "Remark updated successfully",
      data: updatedRemark,
    });
  } catch (error) {
    logError("Update patient remark error", error);
    res.status(500).json({
      success: false,
      message: "Error updating patient remark",
      error: error.message,
    });
  }
};

// @desc    Delete a remark
// @route   DELETE /api/patients/:patientId/remarks/:remarkId
// @access  Private
export const deletePatientRemark = async (req, res) => {
  try {
    const { remarkId } = req.params;

    const remark = await PatientRemark.findByIdAndDelete(remarkId);

    if (!remark) {
      return res.status(404).json({
        success: false,
        message: "Remark not found",
      });
    }

    logInfo(`Deleted remark ${remarkId}`);

    res.status(200).json({
      success: true,
      message: "Remark deleted successfully",
    });
  } catch (error) {
    logError("Delete patient remark error", error);
    res.status(500).json({
      success: false,
      message: "Error deleting patient remark",
      error: error.message,
    });
  }
};
