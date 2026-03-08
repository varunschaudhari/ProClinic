import mongoose from "mongoose";

const documentSchema = new mongoose.Schema(
  {
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Patient",
      required: true,
    },
    documentType: {
      type: String,
      enum: ["Report", "Prescription", "Lab Result", "X-Ray", "Scan", "Other"],
      required: true,
      default: "Report",
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      default: null,
    },
    filePath: {
      type: String,
      required: true,
    },
    fileName: {
      type: String,
      required: true,
    },
    fileSize: {
      type: Number, // Size in bytes
      default: 0,
    },
    mimeType: {
      type: String,
      default: null,
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    uploadDate: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Index for faster queries
documentSchema.index({ patientId: 1, uploadDate: -1 });
documentSchema.index({ documentType: 1 });

const Document = mongoose.model("Document", documentSchema);

export default Document;
