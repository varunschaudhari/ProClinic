import PatientEngagement from "../models/PatientEngagement.js";
import Appointment from "../models/Appointment.js";
import { logInfo, logError } from "../config/logger.js";

// @desc    Get engagement data for a patient
// @route   GET /api/patients/:patientId/engagement
// @access  Private
export const getPatientEngagement = async (req, res) => {
  try {
    const { patientId } = req.params;

    let engagement = await PatientEngagement.findOne({ patientId })
      .populate("updatedBy", "name email role")
      .populate("satisfactionScores.recordedBy", "name email")
      .populate("communicationHistory.initiatedBy", "name email")
      .populate("educationalMaterials.providedBy", "name email");

    // If no engagement record exists, create one with default values
    if (!engagement) {
      engagement = new PatientEngagement({ patientId });
      await engagement.save();
    }

    // Calculate appointment adherence from appointments
    const appointments = await Appointment.find({ patientId });
    const totalAppointments = appointments.length;
    const attendedAppointments = appointments.filter(
      (apt) => apt.status === "completed"
    ).length;
    const missedAppointments = appointments.filter(
      (apt) => apt.status === "no-show" || apt.status === "cancelled"
    ).length;
    const cancelledAppointments = appointments.filter(
      (apt) => apt.status === "cancelled"
    ).length;

    const adherenceRate =
      totalAppointments > 0
        ? Math.round((attendedAppointments / totalAppointments) * 100)
        : 0;

    engagement.appointmentAdherence = {
      totalAppointments,
      attendedAppointments,
      missedAppointments,
      cancelledAppointments,
      adherenceRate,
    };

    await engagement.save();

    logInfo(`Fetched engagement data for patient ${patientId}`);

    res.status(200).json({
      success: true,
      data: engagement,
    });
  } catch (error) {
    logError("Get patient engagement error", error);
    res.status(500).json({
      success: false,
      message: "Error fetching patient engagement",
      error: error.message,
    });
  }
};

// @desc    Update engagement data
// @route   PUT /api/patients/:patientId/engagement
// @access  Private
export const updatePatientEngagement = async (req, res) => {
  try {
    const { patientId } = req.params;
    const userId = req.user.id;
    const updateData = req.body;

    let engagement = await PatientEngagement.findOne({ patientId });

    if (!engagement) {
      engagement = new PatientEngagement({ patientId });
    }

    // Update fields
    if (updateData.satisfactionScores) {
      engagement.satisfactionScores.push({
        ...updateData.satisfactionScores,
        recordedBy: userId,
      });
    }

    if (updateData.communicationHistory) {
      engagement.communicationHistory.push({
        ...updateData.communicationHistory,
        initiatedBy: userId,
      });
    }

    if (updateData.educationalMaterials) {
      engagement.educationalMaterials.push({
        ...updateData.educationalMaterials,
        providedBy: userId,
      });
    }

    if (updateData.followUpCompletion) {
      engagement.followUpCompletion = {
        ...engagement.followUpCompletion,
        ...updateData.followUpCompletion,
      };
      engagement.followUpCompletion.completionRate =
        engagement.followUpCompletion.totalFollowUps > 0
          ? Math.round(
              (engagement.followUpCompletion.completedFollowUps /
                engagement.followUpCompletion.totalFollowUps) *
                100
            )
          : 0;
    }

    engagement.lastUpdated = new Date();
    engagement.updatedBy = userId;

    const savedEngagement = await engagement.save();
    await savedEngagement.populate([
      { path: "updatedBy", select: "name email role" },
      { path: "satisfactionScores.recordedBy", select: "name email" },
      { path: "communicationHistory.initiatedBy", select: "name email" },
      { path: "educationalMaterials.providedBy", select: "name email" },
    ]);

    logInfo(`Updated engagement data for patient ${patientId}`);

    res.status(200).json({
      success: true,
      message: "Engagement data updated successfully",
      data: savedEngagement,
    });
  } catch (error) {
    logError("Update patient engagement error", error);
    res.status(500).json({
      success: false,
      message: "Error updating patient engagement",
      error: error.message,
    });
  }
};

// @desc    Acknowledge educational material
// @route   PUT /api/patients/:patientId/engagement/materials/:materialId/acknowledge
// @access  Private
export const acknowledgeMaterial = async (req, res) => {
  try {
    const { patientId, materialId } = req.params;

    const engagement = await PatientEngagement.findOne({ patientId });

    if (!engagement) {
      return res.status(404).json({
        success: false,
        message: "Engagement record not found",
      });
    }

    const material = engagement.educationalMaterials.id(materialId);
    if (!material) {
      return res.status(404).json({
        success: false,
        message: "Educational material not found",
      });
    }

    material.acknowledged = true;
    material.acknowledgedDate = new Date();

    await engagement.save();

    res.status(200).json({
      success: true,
      message: "Material acknowledged successfully",
      data: engagement,
    });
  } catch (error) {
    logError("Acknowledge material error", error);
    res.status(500).json({
      success: false,
      message: "Error acknowledging material",
      error: error.message,
    });
  }
};
