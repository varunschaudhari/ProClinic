import mongoose from "mongoose";

const patientBillingTransactionSchema = new mongoose.Schema(
  {
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Patient",
      required: [true, "Patient is required"],
      index: true,
    },
    transactionType: {
      type: String,
      enum: ["advance", "credit_note"],
      required: true,
      index: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    method: {
      type: String,
      enum: ["cash", "card", "upi", "cheque", "other"],
      default: "cash",
    },
    referenceNo: {
      type: String,
      trim: true,
      default: null,
    },
    note: {
      type: String,
      trim: true,
      default: null,
    },
    transactionDate: {
      type: Date,
      default: Date.now,
      index: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true }
);

patientBillingTransactionSchema.index({ patientId: 1, transactionDate: -1 });

const PatientBillingTransaction = mongoose.model(
  "PatientBillingTransaction",
  patientBillingTransactionSchema
);

export default PatientBillingTransaction;

