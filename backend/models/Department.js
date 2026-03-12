import mongoose from "mongoose";

const departmentSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Department name is required"],
      trim: true,
    },
    code: {
      type: String,
      trim: true,
      uppercase: true,
    },
    description: {
      type: String,
      trim: true,
    },
    headOfDepartment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
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
departmentSchema.index({ name: 1 });
departmentSchema.index({ code: 1 });
departmentSchema.index({ status: 1 });
departmentSchema.index({ isDeleted: 1 });

// Soft delete query helper
departmentSchema.pre(/^find/, function (next) {
  if (this.getOptions().includeDeleted) {
    return next();
  }
  this.where({ isDeleted: false });
  next();
});

const Department = mongoose.model("Department", departmentSchema);

export default Department;
