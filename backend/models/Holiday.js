import mongoose from "mongoose";

const holidaySchema = new mongoose.Schema(
  {
    doctorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    date: {
      type: Date,
      required: [true, "Holiday date is required"],
    },
    reason: {
      type: String,
      trim: true,
      default: "Holiday",
    },
    description: {
      type: String,
      trim: true,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Index for faster queries
holidaySchema.index({ doctorId: 1, date: 1 });
holidaySchema.index({ date: 1 });

const Holiday = mongoose.model("Holiday", holidaySchema);

export default Holiday;
