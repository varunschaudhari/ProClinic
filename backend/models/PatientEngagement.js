import mongoose from "mongoose";

const patientEngagementSchema = new mongoose.Schema(
  {
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Patient",
      required: [true, "Patient is required"],
    },
    // Appointment adherence
    appointmentAdherence: {
      totalAppointments: {
        type: Number,
        default: 0,
      },
      attendedAppointments: {
        type: Number,
        default: 0,
      },
      missedAppointments: {
        type: Number,
        default: 0,
      },
      cancelledAppointments: {
        type: Number,
        default: 0,
      },
      adherenceRate: {
        type: Number,
        default: 0, // Percentage
        min: 0,
        max: 100,
      },
    },
    // Follow-up completion
    followUpCompletion: {
      totalFollowUps: {
        type: Number,
        default: 0,
      },
      completedFollowUps: {
        type: Number,
        default: 0,
      },
      pendingFollowUps: {
        type: Number,
        default: 0,
      },
      completionRate: {
        type: Number,
        default: 0, // Percentage
        min: 0,
        max: 100,
      },
    },
    // Patient satisfaction
    satisfactionScores: [
      {
        date: {
          type: Date,
          default: Date.now,
        },
        score: {
          type: Number,
          required: true,
          min: 1,
          max: 5,
        },
        feedback: {
          type: String,
          trim: true,
        },
        category: {
          type: String,
          enum: ["overall", "doctor", "nurse", "facility", "billing", "other"],
          default: "overall",
        },
        recordedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
      },
    ],
    // Communication history
    communicationHistory: [
      {
        date: {
          type: Date,
          default: Date.now,
        },
        type: {
          type: String,
          enum: ["call", "sms", "email", "in-person", "other"],
          required: true,
        },
        purpose: {
          type: String,
          trim: true,
        },
        notes: {
          type: String,
          trim: true,
        },
        initiatedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        outcome: {
          type: String,
          enum: ["successful", "no-answer", "busy", "failed", "other"],
          default: "successful",
        },
      },
    ],
    // Educational materials provided
    educationalMaterials: [
      {
        date: {
          type: Date,
          default: Date.now,
        },
        materialType: {
          type: String,
          enum: ["brochure", "video", "document", "link", "other"],
          required: true,
        },
        title: {
          type: String,
          required: true,
          trim: true,
        },
        description: {
          type: String,
          trim: true,
        },
        fileUrl: {
          type: String,
          trim: true,
        },
        providedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        acknowledged: {
          type: Boolean,
          default: false,
        },
        acknowledgedDate: {
          type: Date,
          default: null,
        },
      },
    ],
    // Last updated
    lastUpdated: {
      type: Date,
      default: Date.now,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  }
);

// Index for faster queries
patientEngagementSchema.index({ patientId: 1 });
patientEngagementSchema.index({ "satisfactionScores.date": -1 });
patientEngagementSchema.index({ "communicationHistory.date": -1 });

const PatientEngagement = mongoose.model("PatientEngagement", patientEngagementSchema);

export default PatientEngagement;
