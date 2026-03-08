import mongoose from "mongoose";

const otSchedulerSchema = new mongoose.Schema(
  {
    scheduleNumber: {
      type: String,
      unique: true,
      trim: true,
      uppercase: true,
    },
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Patient",
      required: [true, "Patient is required"],
    },
    ipdId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "IPD",
      default: null,
    },
    otId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "OperationTheater",
      required: [true, "Operation Theater is required"],
    },
    surgeonId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Surgeon is required"],
    },
    anesthetistId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    operationType: {
      type: String,
      required: [true, "Operation type is required"],
      trim: true,
    },
    operationName: {
      type: String,
      required: [true, "Operation name is required"],
      trim: true,
    },
    scheduledDate: {
      type: Date,
      required: [true, "Scheduled date is required"],
    },
    scheduledTime: {
      type: String,
      required: [true, "Scheduled time is required"],
      trim: true,
    },
    estimatedDuration: {
      type: Number, // in minutes
      default: 60,
      min: 1,
    },
    status: {
      type: String,
      enum: ["scheduled", "in-progress", "completed", "cancelled", "postponed"],
      default: "scheduled",
    },
    priority: {
      type: String,
      enum: ["routine", "urgent", "emergency"],
      default: "routine",
    },
    preoperativeNotes: {
      type: String,
      trim: true,
    },
    postoperativeNotes: {
      type: String,
      trim: true,
    },
    actualStartTime: {
      type: Date,
      default: null,
    },
    actualEndTime: {
      type: Date,
      default: null,
    },
    actualDuration: {
      type: Number, // in minutes
      default: null,
    },
    complications: {
      type: String,
      trim: true,
    },
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

// Generate unique schedule number before saving
otSchedulerSchema.pre("save", async function (next) {
  if (!this.scheduleNumber) {
    try {
      const Sequence = (await import("./Sequence.js")).default;
      const sequence = await Sequence.findOneAndUpdate(
        { name: "ot-schedule" },
        { $inc: { value: 1 } },
        { new: true, upsert: true }
      );
      const date = new Date();
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      const sequenceNumber = String(sequence.value).padStart(6, "0");
      this.scheduleNumber = `OTS-${year}${month}${day}-${sequenceNumber}`;
    } catch (error) {
      return next(error);
    }
  }
  next();
});

// Index for faster queries
otSchedulerSchema.index({ patientId: 1, scheduledDate: -1 });
otSchedulerSchema.index({ otId: 1, scheduledDate: 1, scheduledTime: 1 });
otSchedulerSchema.index({ surgeonId: 1, scheduledDate: 1 });
otSchedulerSchema.index({ status: 1, scheduledDate: 1 });
otSchedulerSchema.index({ scheduleNumber: 1 });

const OTScheduler = mongoose.model("OTScheduler", otSchedulerSchema);

export default OTScheduler;
