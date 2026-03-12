import mongoose from "mongoose";
import Sequence from "./Sequence.js";

const ipdSchema = new mongoose.Schema(
  {
    ipdNumber: {
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
      required: [true, "Attending doctor is required"],
    },
    departmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Department",
      default: null,
    },
    // Admission details
    admissionDate: {
      type: Date,
      required: [true, "Admission date is required"],
      default: Date.now,
    },
    admissionTime: {
      type: String,
      trim: true,
    },
    admissionType: {
      type: String,
      enum: ["emergency", "planned", "transfer", "other"],
      default: "planned",
    },
    admissionReason: {
      type: String,
      trim: true,
    },
    diagnosisOnAdmission: {
      type: String,
      trim: true,
    },
    // Room/Bed assignment
    roomId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Room",
      default: null,
    },
    roomNumber: {
      type: String,
      trim: true,
    },
    bedNumber: {
      type: String,
      trim: true,
    },
    // Status
    status: {
      type: String,
      enum: ["admitted", "under-treatment", "discharged", "transferred", "deceased", "absconded"],
      default: "admitted",
    },
    // Discharge details
    dischargeDate: {
      type: Date,
      default: null,
    },
    dischargeTime: {
      type: String,
      trim: true,
    },
    dischargeType: {
      type: String,
      enum: ["normal", "against-medical-advice", "transfer", "deceased", "absconded"],
      default: null,
    },
    dischargeSummary: {
      type: String,
      trim: true,
    },
    dischargeInstructions: {
      type: String,
      trim: true,
    },
    // Medical records
    dailyProgressNotes: [
      {
        date: {
          type: Date,
          default: Date.now,
        },
        note: {
          type: String,
          trim: true,
        },
        recordedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
      },
    ],
    treatmentPlan: {
      type: String,
      trim: true,
    },
    labReports: [
      {
        testName: {
          type: String,
          trim: true,
        },
        testDate: {
          type: Date,
          default: Date.now,
        },
        result: {
          type: String,
          trim: true,
        },
        fileUrl: {
          type: String,
          trim: true,
        },
      },
    ],
    prescriptions: [
      {
        medication: {
          type: String,
          trim: true,
        },
        dosage: {
          type: String,
          trim: true,
        },
        frequency: {
          type: String,
          trim: true,
        },
        duration: {
          type: String,
          trim: true,
        },
        startDate: {
          type: Date,
          default: Date.now,
        },
        endDate: {
          type: Date,
          default: null,
        },
        prescribedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
      },
    ],
    // Billing
    roomCharges: {
      type: Number,
      default: 0,
      min: 0,
    },
    medicationCharges: {
      type: Number,
      default: 0,
      min: 0,
    },
    procedureCharges: {
      type: Number,
      default: 0,
      min: 0,
    },
    labCharges: {
      type: Number,
      default: 0,
      min: 0,
    },
    otherCharges: {
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
      enum: ["cash", "card", "upi", "cheque", "insurance", "other"],
      default: null,
    },
    paymentDate: {
      type: Date,
      default: null,
    },
    // Follow-up
    followUpRequired: {
      type: Boolean,
      default: false,
    },
    followUpDate: {
      type: Date,
      default: null,
    },
    followUpInstructions: {
      type: String,
      trim: true,
    },
    // Additional notes
    notes: {
      type: String,
      trim: true,
    },
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

// Generate unique IPD number before saving
ipdSchema.pre("save", async function (next) {
  // Only generate ipdNumber if it doesn't exist (for new documents)
  if (!this.ipdNumber) {
    try {
      // Get or create sequence for IPD count
      const sequence = await Sequence.findOneAndUpdate(
        { name: "ipd" },
        { $inc: { value: 1 } },
        { new: true, upsert: true }
      );

      // Generate IPD number: IPD-YYYYMMDD-XXXXXX (where XXXXXX is the sequence number)
      const date = new Date();
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      const sequenceNumber = String(sequence.value).padStart(6, "0");

      this.ipdNumber = `IPD-${year}${month}${day}-${sequenceNumber}`;
    } catch (error) {
      return next(error);
    }
  }

  // Calculate total amount before saving
  if (
    this.isModified("roomCharges") ||
    this.isModified("medicationCharges") ||
    this.isModified("procedureCharges") ||
    this.isModified("labCharges") ||
    this.isModified("otherCharges") ||
    this.isModified("discount")
  ) {
    this.totalAmount =
      this.roomCharges +
      this.medicationCharges +
      this.procedureCharges +
      this.labCharges +
      this.otherCharges -
      this.discount;

    // Update payment status based on paid amount
    if (this.totalAmount > 0) {
      if (this.paidAmount >= this.totalAmount) {
        this.paymentStatus = "paid";
      } else if (this.paidAmount > 0) {
        this.paymentStatus = "partial";
      } else {
        this.paymentStatus = "pending";
      }
    }
  }

  // Update status to discharged if discharge date is set
  if (this.dischargeDate && this.status !== "discharged" && this.status !== "deceased" && this.status !== "absconded") {
    this.status = "discharged";
  }

  next();
});

// Index for faster queries
ipdSchema.index({ patientId: 1, admissionDate: -1 });
ipdSchema.index({ doctorId: 1, admissionDate: -1 });
ipdSchema.index({ status: 1, admissionDate: -1 });
ipdSchema.index({ roomId: 1, status: 1 });
ipdSchema.index({ ipdNumber: 1 });
ipdSchema.index({ admissionDate: 1, dischargeDate: 1 });

const IPD = mongoose.model("IPD", ipdSchema);

export default IPD;
