import mongoose from "mongoose";
import Sequence from "./Sequence.js";

const patientSchema = new mongoose.Schema(
  {
    patientId: {
      type: String,
      unique: true,
      trim: true,
      uppercase: true,
      // Auto-generated in pre-save hook, not required from user input
    },
    name: {
      type: String,
      required: [true, "Patient name is required"],
      trim: true,
    },
    dateOfBirth: {
      type: Date,
      required: [true, "Date of birth is required"],
    },
    gender: {
      type: String,
      required: [true, "Gender is required"],
      enum: ["male", "female", "other"],
    },
    bloodGroup: {
      type: String,
      enum: ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"],
      default: null,
    },
    phone: {
      type: String,
      required: [true, "Phone number is required"],
      trim: true,
    },
    email: {
      type: String,
      lowercase: true,
      trim: true,
      match: [
        /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
        "Please provide a valid email",
      ],
    },
    address: {
      street: {
        type: String,
        trim: true,
      },
      village: {
        type: String,
        trim: true,
      },
      city: {
        type: String,
        trim: true,
      },
      state: {
        type: String,
        trim: true,
      },
      zipCode: {
        type: String,
        trim: true,
      },
      country: {
        type: String,
        trim: true,
        default: "India",
      },
    },
    emergencyContact: {
      name: {
        type: String,
        trim: true,
      },
      relationship: {
        type: String,
        trim: true,
      },
      phone: {
        type: String,
        trim: true,
      },
    },
    medicalHistory: {
      type: String,
      trim: true,
    },
    allergies: {
      type: [String],
      default: [],
    },
    chronicConditions: {
      type: [String],
      default: [],
    },
    notes: {
      type: String,
      trim: true,
      default: null,
    },
    tags: {
      type: [String],
      default: [],
    },
    profileImage: {
      type: String,
      default: null,
    },
    status: {
      type: String,
      enum: ["active", "inactive", "discharged", "transferred", "deceased", "absconded", "on-leave", "follow-up"],
      default: "active",
    },
    statusNotes: {
      type: String,
      trim: true,
      default: null,
    },
    statusChangedDate: {
      type: Date,
      default: null,
    },
    statusChangedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Generate unique patient ID before saving using sequence counter
patientSchema.pre("save", async function (next) {
  // Only generate patientId if it doesn't exist (for new documents)
  if (!this.patientId) {
    try {
      // Get or create sequence for patient count
      const sequence = await Sequence.findOneAndUpdate(
        { name: "patient" },
        { $inc: { value: 1 } },
        { new: true, upsert: true }
      );

      // Generate patient ID: PAT-YYYYMMDD-XXXXXX (where XXXXXX is the sequence number)
      const date = new Date();
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      const sequenceNumber = String(sequence.value).padStart(6, "0");

      this.patientId = `PAT-${year}${month}${day}-${sequenceNumber}`;
    } catch (error) {
      return next(error);
    }
  }
  next();
});

// Index for faster queries
patientSchema.index({ status: 1 });
patientSchema.index({ isActive: 1, status: 1 });

const Patient = mongoose.model("Patient", patientSchema);

export default Patient;
