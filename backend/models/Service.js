import mongoose from "mongoose";

const serviceSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Service name is required"],
      trim: true,
    },
    code: {
      type: String,
      required: [true, "Service code is required"],
      unique: true,
      trim: true,
      uppercase: true,
    },
    description: {
      type: String,
      trim: true,
    },
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ServiceCategory",
      default: null,
    },
    price: {
      type: Number,
      required: [true, "Service price is required"],
      min: [0, "Price cannot be negative"],
    },
    duration: {
      type: Number, // Duration in minutes
      default: null,
      min: [0, "Duration cannot be negative"],
    },
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
    departmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Department",
      default: null,
    },
    // Price history tracking
    priceHistory: [
      {
        price: {
          type: Number,
          required: true,
        },
        effectiveDate: {
          type: Date,
          default: Date.now,
        },
        changedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        note: {
          type: String,
          trim: true,
        },
      },
    ],
    isDeleted: {
      type: Boolean,
      default: false,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
    deletedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
serviceSchema.index({ name: 1 });
serviceSchema.index({ code: 1 }, { unique: true });
serviceSchema.index({ categoryId: 1 });
serviceSchema.index({ status: 1 });
serviceSchema.index({ departmentId: 1 });
serviceSchema.index({ isDeleted: 1 });

// Soft delete query helper
serviceSchema.pre(/^find/, function (next) {
  if (this.getOptions().includeDeleted) {
    return next();
  }
  this.where({ isDeleted: false });
  next();
});

// Note: Price history is tracked in the controller when updating
// This allows us to access req.user for changedBy field

const Service = mongoose.model("Service", serviceSchema);

export default Service;
