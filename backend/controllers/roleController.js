import Role from "../models/Role.js";
import User from "../models/User.js";
import { logInfo, logError, logWarn } from "../config/logger.js";
import { getAllPermissions, getPermissionsByModule } from "../constants/permissions.js";

// @desc    Get all roles
// @route   GET /api/roles
// @access  Private/Admin
export const getRoles = async (req, res) => {
  try {
    const roles = await Role.find().sort({ createdAt: -1 });

    logInfo("Roles fetched", {
      userId: req.user.id,
      count: roles.length,
    });

    res.status(200).json({
      success: true,
      count: roles.length,
      data: { roles },
    });
  } catch (error) {
    logError("Get roles error", error, {
      userId: req.user?.id,
    });
    res.status(500).json({
      success: false,
      message: "Server error. Please try again later.",
    });
  }
};

// @desc    Get single role
// @route   GET /api/roles/:id
// @access  Private/Admin
export const getRole = async (req, res) => {
  try {
    const role = await Role.findById(req.params.id);

    if (!role) {
      return res.status(404).json({
        success: false,
        message: "Role not found",
      });
    }

    res.status(200).json({
      success: true,
      data: { role },
    });
  } catch (error) {
    logError("Get role error", error, {
      userId: req.user?.id,
      requestedRoleId: req.params.id,
    });
    res.status(500).json({
      success: false,
      message: "Server error. Please try again later.",
    });
  }
};

// @desc    Create role
// @route   POST /api/roles
// @access  Private/Admin
export const createRole = async (req, res) => {
  try {
    const { name, displayName, description, permissions } = req.body;

    // Validate input
    if (!name || !displayName || !permissions || !Array.isArray(permissions)) {
      return res.status(400).json({
        success: false,
        message: "Please provide name, displayName, and permissions array",
      });
    }

    // Check if role already exists
    const roleExists = await Role.findOne({ name: name.toLowerCase() });

    if (roleExists) {
      return res.status(400).json({
        success: false,
        message: "Role already exists with this name",
      });
    }

    // Validate permissions
    const allPermissions = getAllPermissions();
    const invalidPermissions = permissions.filter(
      (p) => !allPermissions.includes(p)
    );

    if (invalidPermissions.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Invalid permissions: ${invalidPermissions.join(", ")}`,
      });
    }

    // Create role
    const role = await Role.create({
      name: name.toLowerCase(),
      displayName,
      description: description || "",
      permissions,
      isSystem: false,
    });

    logInfo("Role created", {
      createdBy: req.user.id,
      newRoleId: role._id,
      newRoleName: role.name,
    });

    res.status(201).json({
      success: true,
      message: "Role created successfully",
      data: { role },
    });
  } catch (error) {
    logError("Create role error", error, {
      createdBy: req.user?.id,
      roleName: req.body.name,
    });
    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map((err) => err.message);
      return res.status(400).json({
        success: false,
        message: messages.join(", "),
      });
    }
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "Role name already exists",
      });
    }
    res.status(500).json({
      success: false,
      message: "Server error. Please try again later.",
    });
  }
};

// @desc    Update role
// @route   PUT /api/roles/:id
// @access  Private/Admin
export const updateRole = async (req, res) => {
  try {
    const { name, displayName, description, permissions, isActive } = req.body;

    let role = await Role.findById(req.params.id);

    if (!role) {
      return res.status(404).json({
        success: false,
        message: "Role not found",
      });
    }

    // Prevent modification of system roles (except isActive)
    if (role.isSystem && (name || displayName || description || permissions)) {
      return res.status(400).json({
        success: false,
        message: "Cannot modify system role properties",
      });
    }

    // Check if name is being changed and if it already exists
    if (name && name.toLowerCase() !== role.name) {
      const nameExists = await Role.findOne({ name: name.toLowerCase() });
      if (nameExists) {
        return res.status(400).json({
          success: false,
          message: "Role name already exists",
        });
      }
    }

    // Validate permissions if provided
    if (permissions && Array.isArray(permissions)) {
      const allPermissions = getAllPermissions();
      const invalidPermissions = permissions.filter(
        (p) => !allPermissions.includes(p)
      );

      if (invalidPermissions.length > 0) {
        return res.status(400).json({
          success: false,
          message: `Invalid permissions: ${invalidPermissions.join(", ")}`,
        });
      }
    }

    // Update role fields
    if (name) role.name = name.toLowerCase();
    if (displayName) role.displayName = displayName;
    if (description !== undefined) role.description = description;
    if (permissions) role.permissions = permissions;
    if (isActive !== undefined) role.isActive = isActive;

    await role.save();

    logInfo("Role updated", {
      updatedBy: req.user.id,
      updatedRoleId: role._id,
      changes: {
        name: name !== undefined,
        displayName: displayName !== undefined,
        description: description !== undefined,
        permissions: permissions !== undefined,
        isActive: isActive !== undefined,
      },
    });

    res.status(200).json({
      success: true,
      message: "Role updated successfully",
      data: { role },
    });
  } catch (error) {
    logError("Update role error", error, {
      updatedBy: req.user?.id,
      updatedRoleId: req.params.id,
    });
    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map((err) => err.message);
      return res.status(400).json({
        success: false,
        message: messages.join(", "),
      });
    }
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "Role name already exists",
      });
    }
    res.status(500).json({
      success: false,
      message: "Server error. Please try again later.",
    });
  }
};

// @desc    Delete role
// @route   DELETE /api/roles/:id
// @access  Private/Admin
export const deleteRole = async (req, res) => {
  try {
    const role = await Role.findById(req.params.id);

    if (!role) {
      return res.status(404).json({
        success: false,
        message: "Role not found",
      });
    }

    // Prevent deletion of system roles
    if (role.isSystem) {
      return res.status(400).json({
        success: false,
        message: "Cannot delete system role",
      });
    }

    // Check if role is assigned to any users
    const usersWithRole = await User.find({ roles: req.params.id });

    if (usersWithRole.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete role. It is assigned to ${usersWithRole.length} user(s)`,
      });
    }

    await Role.findByIdAndDelete(req.params.id);

    logWarn("Role deleted", {
      deletedBy: req.user.id,
      deletedRoleId: req.params.id,
      deletedRoleName: role.name,
    });

    res.status(200).json({
      success: true,
      message: "Role deleted successfully",
      data: {},
    });
  } catch (error) {
    logError("Delete role error", error, {
      deletedBy: req.user?.id,
      deletedRoleId: req.params.id,
    });
    res.status(500).json({
      success: false,
      message: "Server error. Please try again later.",
    });
  }
};

// @desc    Get all available permissions
// @route   GET /api/roles/permissions
// @access  Private/Admin
export const getPermissions = async (req, res) => {
  try {
    const permissionsByModule = getPermissionsByModule();
    const allPermissions = getAllPermissions();

    res.status(200).json({
      success: true,
      data: {
        permissions: allPermissions,
        permissionsByModule,
      },
    });
  } catch (error) {
    logError("Get permissions error", error, {
      userId: req.user?.id,
    });
    res.status(500).json({
      success: false,
      message: "Server error. Please try again later.",
    });
  }
};
