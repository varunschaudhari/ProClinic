import mongoose from "mongoose";

const wardSchema = new mongoose.Schema(
  {
    wardName: {
      type: String,
      required: [true, "Ward name is required"],
      unique: true,
      trim: true,
    },
    wardCode: {
      type: String,
      unique: true,
      trim: true,
      uppercase: true,
      sparse: true, // Allow null/undefined but enforce uniqueness when present
    },
    wardType: {
      type: String,
      required: [true, "Ward type is required"],
      trim: true,
    },
    floor: {
      type: String,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    capacity: {
      type: Number,
      default: 0,
      min: 0,
    },
    currentOccupancy: {
      type: Number,
      default: 0,
      min: 0,
    },
    inCharge: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    notes: {
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

// Index for faster queries
wardSchema.index({ wardName: 1 });
wardSchema.index({ wardCode: 1 });
wardSchema.index({ wardType: 1, isActive: 1 });
wardSchema.index({ inCharge: 1 });
wardSchema.index({ floor: 1 });

// Virtual for occupancy rate
wardSchema.virtual("occupancyRate").get(function () {
  if (this.capacity === 0) return 0;
  return ((this.currentOccupancy / this.capacity) * 100).toFixed(2);
});

// Ensure virtuals are included in JSON
wardSchema.set("toJSON", { virtuals: true });
wardSchema.set("toObject", { virtuals: true });

const Ward = mongoose.model("Ward", wardSchema);

export default Ward;
