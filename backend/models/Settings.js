import mongoose from "mongoose";

const settingsSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: [true, "Setting key is required"],
      unique: true,
      trim: true,
      lowercase: true,
    },
    value: {
      type: mongoose.Schema.Types.Mixed,
      required: [true, "Setting value is required"],
    },
    category: {
      type: String,
      enum: ["room-types", "ward-types", "admission-types", "discharge-types", "visit-types", "payment-methods", "other"],
      default: "other",
    },
    description: {
      type: String,
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isSystem: {
      type: Boolean,
      default: false, // System settings cannot be deleted
    },
  },
  {
    timestamps: true,
  }
);

// Index for faster queries
settingsSchema.index({ key: 1 });
settingsSchema.index({ category: 1, isActive: 1 });

const Settings = mongoose.model("Settings", settingsSchema);

export default Settings;
