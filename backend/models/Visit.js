import mongoose from "mongoose";

const visitSchema = new mongoose.Schema(
  {
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Patient",
      required: true,
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

const Visit = mongoose.model("Visit", visitSchema);

export default Visit;
