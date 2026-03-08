import mongoose from "mongoose";

const roleSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Please provide a role name"],
      unique: true,
      trim: true,
      lowercase: true,
    },
    displayName: {
      type: String,
      required: [true, "Please provide a display name"],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      default: "",
    },
    permissions: {
      type: [String],
      required: true,
      default: [],
      validate: {
        validator: function (permissions) {
          // Ensure permissions array is not empty
          return permissions.length > 0;
        },
        message: "Role must have at least one permission",
      },
    },
    isSystem: {
      type: Boolean,
      default: false, // System roles cannot be deleted
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Prevent deletion of system roles
roleSchema.pre("findOneAndDelete", async function (next) {
  const role = await this.model.findOne(this.getQuery());
  if (role && role.isSystem) {
    return next(new Error("Cannot delete system role"));
  }
  next();
});

// Prevent deletion of system roles
roleSchema.pre("deleteOne", async function (next) {
  const role = await this.model.findOne(this.getQuery());
  if (role && role.isSystem) {
    return next(new Error("Cannot delete system role"));
  }
  next();
});

const Role = mongoose.model("Role", roleSchema);

export default Role;
