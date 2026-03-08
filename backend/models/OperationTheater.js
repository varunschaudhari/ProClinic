import mongoose from "mongoose";

const operationTheaterSchema = new mongoose.Schema(
  {
    otNumber: {
      type: String,
      required: [true, "OT number is required"],
      unique: true,
      trim: true,
      uppercase: true,
    },
    otName: {
      type: String,
      required: [true, "OT name is required"],
      trim: true,
    },
    otComplexId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "OTComplex",
      default: null,
    },
    otType: {
      type: String,
      enum: ["major", "minor", "emergency", "cardiac", "neuro", "orthopedic", "general", "other"],
      required: [true, "OT type is required"],
      default: "general",
    },
    floor: {
      type: String,
      trim: true,
    },
    ward: {
      type: String,
      trim: true,
    },
    capacity: {
      type: Number,
      default: 1,
      min: 1,
    },
    equipment: [{
      name: {
        type: String,
        trim: true,
      },
      status: {
        type: String,
        enum: ["available", "in-use", "maintenance", "not-available"],
        default: "available",
      },
    }],
    amenities: [{
      type: String,
      trim: true,
    }],
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
operationTheaterSchema.index({ otNumber: 1 });
operationTheaterSchema.index({ otComplexId: 1 });
operationTheaterSchema.index({ otType: 1, isActive: 1 });
operationTheaterSchema.index({ floor: 1, ward: 1 });

const OperationTheater = mongoose.model("OperationTheater", operationTheaterSchema);

export default OperationTheater;
