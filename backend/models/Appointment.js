import mongoose from "mongoose";
import Sequence from "./Sequence.js";

const appointmentSchema = new mongoose.Schema(
  {
    appointmentNumber: {
      type: String,
      unique: true,
      trim: true,
      uppercase: true,
      // Auto-generated in pre-save hook
    },
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Patient",
      required: true,
    },
    doctorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    appointmentDate: {
      type: Date,
      required: [true, "Appointment date is required"],
    },
    appointmentTime: {
      type: String,
      required: [true, "Appointment time is required"],
    },
    appointmentType: {
      type: String,
      enum: ["booked", "walk-in"],
      default: "booked",
    },
    status: {
      type: String,
      enum: ["scheduled", "completed", "cancelled", "no-show", "rescheduled"],
      default: "scheduled",
    },
    priority: {
      type: String,
      enum: ["low", "normal", "high", "urgent"],
      default: "normal",
    },
    chiefComplaint: {
      type: String,
      trim: true,
      default: null,
    },
    notes: {
      type: String,
      trim: true,
      default: null,
    },
    // Reminder settings
    reminderEnabled: {
      type: Boolean,
      default: true,
    },
    reminderSent: {
      type: Boolean,
      default: false,
    },
    reminderSentAt: {
      type: Date,
      default: null,
    },
    // Follow-up appointment
    followUpAppointmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Appointment",
      default: null,
    },
    isFollowUp: {
      type: Boolean,
      default: false,
    },
    originalAppointmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Appointment",
      default: null,
    },
    // Cancellation details
    cancellationReason: {
      type: String,
      trim: true,
      default: null,
    },
    cancelledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    cancelledAt: {
      type: Date,
      default: null,
    },
    // Rescheduling details
    rescheduledFrom: {
      date: {
        type: Date,
        default: null,
      },
      time: {
        type: String,
        default: null,
      },
    },
    rescheduledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    rescheduledAt: {
      type: Date,
      default: null,
    },
    // Conversion to OPD
    convertedToOPD: {
      type: Boolean,
      default: false,
    },
    opdId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "OPD",
      default: null,
    },
    convertedAt: {
      type: Date,
      default: null,
    },
    convertedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    // Appointment history/audit trail
    history: [
      {
        action: {
          type: String,
          enum: ["created", "updated", "rescheduled", "cancelled", "completed", "converted_to_opd"],
        },
        changedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        changedAt: {
          type: Date,
          default: Date.now,
        },
        previousValues: {
          type: mongoose.Schema.Types.Mixed,
        },
        notes: {
          type: String,
          trim: true,
        },
      },
    ],
    // Duration in minutes
    duration: {
      type: Number,
      default: 30,
      min: 5,
    },
    // Estimated end time
    estimatedEndTime: {
      type: String,
      default: null,
    },
    // Actual start and end times (for completed appointments)
    actualStartTime: {
      type: Date,
      default: null,
    },
    actualEndTime: {
      type: Date,
      default: null,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Generate unique appointment number before saving
appointmentSchema.pre("save", async function (next) {
  // Only generate appointmentNumber if it doesn't exist (for new documents)
  if (!this.appointmentNumber) {
    try {
      // Get or create sequence for appointment count
      const sequence = await Sequence.findOneAndUpdate(
        { name: "appointment" },
        { $inc: { value: 1 } },
        { new: true, upsert: true }
      );

      // Generate appointment number: APPT-YYYYMMDD-XXXXXX
      const date = new Date();
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      const sequenceNumber = String(sequence.value).padStart(6, "0");

      this.appointmentNumber = `APPT-${year}${month}${day}-${sequenceNumber}`;
    } catch (error) {
      return next(error);
    }
  }

  // Calculate estimated end time
  if (this.appointmentTime && this.duration) {
    const [hours, minutes] = this.appointmentTime.split(":").map(Number);
    const startMinutes = hours * 60 + minutes;
    const endMinutes = startMinutes + this.duration;
    const endHours = Math.floor(endMinutes / 60);
    const endMins = endMinutes % 60;
    this.estimatedEndTime = `${String(endHours).padStart(2, "0")}:${String(endMins).padStart(2, "0")}`;
  }

  next();
});

// Index for faster queries
appointmentSchema.index({ doctorId: 1, appointmentDate: 1 });
appointmentSchema.index({ patientId: 1 });
appointmentSchema.index({ appointmentDate: 1, appointmentTime: 1 });
appointmentSchema.index({ appointmentNumber: 1 });
appointmentSchema.index({ status: 1, appointmentDate: 1 });
appointmentSchema.index({ convertedToOPD: 1 });

const Appointment = mongoose.model("Appointment", appointmentSchema);

export default Appointment;
