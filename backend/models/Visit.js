import mongoose from "mongoose";

const visitSchema = new mongoose.Schema(
  {
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Patient",
      required: true,
    },
    appointmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Appointment",
      default: null,
    },
    previousVisitId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Visit",
      default: null,
    },
    visitDate: {
      type: Date,
      required: true,
      default: Date.now,
    },
    visitType: {
      type: String,
      enum: ["Consultation", "Follow-up", "Emergency", "Check-up", "Other"],
      default: "Consultation",
    },
    chiefComplaint: {
      type: String,
      trim: true,
    },
    diagnosis: {
      type: String,
      trim: true,
    },
    treatment: {
      type: String,
      trim: true,
    },
    notes: {
      type: String,
      trim: true,
    },
    doctorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    doctorName: {
      type: String,
      trim: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  }
);

// Index for faster queries
visitSchema.index({ patientId: 1, visitDate: -1 });
visitSchema.index({ appointmentId: 1 });
visitSchema.index({ previousVisitId: 1 });

const Visit = mongoose.model("Visit", visitSchema);

export default Visit;
