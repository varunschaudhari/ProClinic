import mongoose from "mongoose";
import Sequence from "./Sequence.js";

const opdSchema = new mongoose.Schema(
  {
    opdNumber: {
      type: String,
      unique: true,
      trim: true,
      uppercase: true,
      // Auto-generated in pre-save hook
    },
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Patient",
      required: [true, "Patient is required"],
    },
    doctorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Doctor is required"],
    },
    visitDate: {
      type: Date,
      required: [true, "Visit date is required"],
      default: Date.now,
    },
    visitTime: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ["registered", "waiting", "in-progress", "completed", "cancelled"],
      default: "registered",
    },
    queueNumber: {
      type: Number,
      default: null,
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
    prescription: {
      type: String,
      trim: true,
    },
    notes: {
      type: String,
      trim: true,
    },
    receptionRemarks: {
      type: String,
      trim: true,
    },
    doctorRemarks: {
      type: String,
      trim: true,
    },
    remarks: {
      type: String,
      trim: true,
    },
    // Billing fields
    consultationFee: {
      type: Number,
      default: 0,
      min: 0,
    },
    additionalCharges: {
      type: Number,
      default: 0,
      min: 0,
    },
    discount: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    paidAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    paymentStatus: {
      type: String,
      enum: ["pending", "partial", "paid"],
      default: "pending",
    },
    paymentMethod: {
      type: String,
      enum: ["cash", "card", "upi", "cheque", "other"],
      default: null,
    },
    paymentDate: {
      type: Date,
      default: null,
    },
    // Billing Documents (OPD Billing Module)
    billingDocumentType: {
      type: String,
      enum: ["cash_memo", "invoice"],
      default: null,
    },
    cashMemoNumber: {
      type: String,
      trim: true,
      default: null,
    },
    invoiceNumber: {
      type: String,
      trim: true,
      default: null,
    },
    taxation: {
      type: String,
      enum: ["Non-Gst", "GST"],
      default: "Non-Gst",
    },
    category: {
      type: String,
      trim: true,
      default: null,
    },
    package: {
      type: String,
      trim: true,
      default: null,
    },
    account: {
      type: String,
      trim: true,
      default: null,
    },
    referenceNo: {
      type: String,
      trim: true,
      default: null,
    },
    dueDate: {
      type: Date,
      default: null,
    },
    serviceLines: [
      {
        date: { type: Date, default: Date.now },
        service: { type: String, trim: true, default: null },
        description: { type: String, trim: true, default: null },
        incentive: { type: Number, default: 0, min: 0 },
        qty: { type: Number, default: 1, min: 1 },
        amount: { type: Number, default: 0, min: 0 },
        discount: { type: Number, default: 0, min: 0 },
        totalAmount: { type: Number, default: 0, min: 0 },
      },
    ],
    advanceAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    advances: [
      {
        amount: { type: Number, required: true, min: 0 },
        method: {
          type: String,
          enum: ["cash", "card", "upi", "cheque", "other"],
          default: "cash",
        },
        referenceNo: { type: String, trim: true, default: null },
        note: { type: String, trim: true, default: null },
        receivedAt: { type: Date, default: Date.now },
        receivedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
      },
    ],
    creditNotes: [
      {
        amount: { type: Number, required: true, min: 0 },
        referenceNo: { type: String, trim: true, default: null },
        note: { type: String, trim: true, default: null },
        issuedAt: { type: Date, default: Date.now },
        issuedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
      },
    ],
    refunds: [
      {
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
        refundedAt: {
          type: Date,
          default: Date.now,
        },
        refundedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          default: null,
        },
      },
    ],
    // Follow-up
    followUpRequired: {
      type: Boolean,
      default: false,
    },
    followUpDate: {
      type: Date,
      default: null,
    },
    // Lab tests
    labTests: [
      {
        testName: {
          type: String,
          trim: true,
        },
        testFee: {
          type: Number,
          default: 0,
        },
        status: {
          type: String,
          enum: ["ordered", "completed", "cancelled"],
          default: "ordered",
        },
      },
    ],
    // Created/Updated by
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
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

// Generate unique OPD number before saving
opdSchema.pre("save", async function (next) {
  // Only generate opdNumber if it doesn't exist (for new documents)
  if (!this.opdNumber) {
    try {
      // Get or create sequence for OPD count
      const sequence = await Sequence.findOneAndUpdate(
        { name: "opd" },
        { $inc: { value: 1 } },
        { new: true, upsert: true }
      );

      // Generate OPD number: OPD-YYYYMMDD-XXXXXX (where XXXXXX is the sequence number)
      const date = new Date();
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      const sequenceNumber = String(sequence.value).padStart(6, "0");

      this.opdNumber = `OPD-${year}${month}${day}-${sequenceNumber}`;
    } catch (error) {
      return next(error);
    }
  }

  // Calculate total amount before saving
  if (this.isModified("consultationFee") || 
      this.isModified("additionalCharges") || 
      this.isModified("discount") ||
      this.isModified("labTests")) {
    const labTestTotal = this.labTests.reduce((sum, test) => sum + (test.testFee || 0), 0);
    this.totalAmount = Math.max(
      0,
      this.consultationFee + this.additionalCharges + labTestTotal - this.discount
    );
    
    // Update payment status based on paid amount
    if (this.paidAmount >= this.totalAmount) {
      this.paymentStatus = "paid";
    } else if (this.paidAmount > 0) {
      this.paymentStatus = "partial";
    } else {
      this.paymentStatus = "pending";
    }
  }

  next();
});

// Index for faster queries
opdSchema.index({ patientId: 1, visitDate: -1 });
opdSchema.index({ doctorId: 1, visitDate: -1 });
opdSchema.index({ visitDate: 1, status: 1 });
opdSchema.index({ opdNumber: 1 });

const OPD = mongoose.model("OPD", opdSchema);

export default OPD;
