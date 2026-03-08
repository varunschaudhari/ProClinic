import mongoose from "mongoose";

const patientRemarkSchema = new mongoose.Schema(
  {
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Patient",
      required: [true, "Patient is required"],
    },
    remark: {
      type: String,
      required: [true, "Remark is required"],
      trim: true,
    },
    remarkType: {
      type: String,
      enum: ["general", "medical", "administrative", "other"],
      default: "general",
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Created by is required"],
    },
    // Role-based access control - only specific roles can view/edit
    allowedRoles: {
      type: [String],
      default: ["doctor", "nurse"], // Default to doctor and nurse
      enum: ["admin", "doctor", "nurse", "receptionist"],
    },
    isPrivate: {
      type: Boolean,
      default: false, // If true, only creator and allowed roles can view
    },
  },
  {
    timestamps: true,
  }
);

// Index for faster queries
patientRemarkSchema.index({ patientId: 1, createdAt: -1 });
patientRemarkSchema.index({ createdBy: 1 });
patientRemarkSchema.index({ remarkType: 1 });

const PatientRemark = mongoose.model("PatientRemark", patientRemarkSchema);

export default PatientRemark;
