import mongoose from "mongoose";

const serviceCategorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Category name is required"],
      trim: true,
    },
    code: {
      type: String,
      required: [true, "Category code is required"],
      unique: true,
      trim: true,
      uppercase: true,
    },
    description: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
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
serviceCategorySchema.index({ name: 1 });
serviceCategorySchema.index({ code: 1 }, { unique: true });
serviceCategorySchema.index({ status: 1 });
serviceCategorySchema.index({ isDeleted: 1 });

// Soft delete query helper
serviceCategorySchema.pre(/^find/, function (next) {
  if (this.getOptions().includeDeleted) {
    return next();
  }
  this.where({ isDeleted: false });
  next();
});

const ServiceCategory = mongoose.model("ServiceCategory", serviceCategorySchema);

export default ServiceCategory;
