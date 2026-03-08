import mongoose from "mongoose";

const otComplexSchema = new mongoose.Schema(
  {
    complexCode: {
      type: String,
      required: [true, "Complex code is required"],
      unique: true,
      trim: true,
      uppercase: true,
    },
    complexName: {
      type: String,
      required: [true, "Complex name is required"],
      trim: true,
    },
    location: {
      type: String,
      trim: true,
    },
    floor: {
      type: String,
      trim: true,
    },
    building: {
      type: String,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
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
otComplexSchema.index({ complexCode: 1 });
otComplexSchema.index({ isActive: 1 });

// Virtual for OT count
otComplexSchema.virtual("otCount", {
  ref: "OperationTheater",
  localField: "_id",
  foreignField: "otComplexId",
  count: true,
});

// Ensure virtuals are included in JSON
otComplexSchema.set("toJSON", { virtuals: true });
otComplexSchema.set("toObject", { virtuals: true });

const OTComplex = mongoose.model("OTComplex", otComplexSchema);

export default OTComplex;
