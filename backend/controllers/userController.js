import User from "../models/User.js";
import { logInfo, logError, logWarn } from "../config/logger.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// @desc    Get all users
// @route   GET /api/users
// @access  Private/Admin
export const getUsers = async (req, res) => {
  try {
    const users = await User.find()
      .select("-password")
      .populate("roles", "name displayName permissions isActive")
      .sort({ createdAt: -1 });

    logInfo("Users fetched", {
      userId: req.user.id,
      count: users.length,
    });

    res.status(200).json({
      success: true,
      count: users.length,
      data: { users },
    });
  } catch (error) {
    logError("Get users error", error, {
      userId: req.user?.id,
    });
    res.status(500).json({
      success: false,
      message: "Server error. Please try again later.",
    });
  }
};

// @desc    Get single user
// @route   GET /api/users/:id
// @access  Private/Admin
export const getUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select("-password")
      .populate("roles", "name displayName permissions isActive");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.status(200).json({
      success: true,
      data: { user },
    });
  } catch (error) {
    logError("Get user error", error, {
      userId: req.user?.id,
      requestedUserId: req.params.id,
    });
    res.status(500).json({
      success: false,
      message: "Server error. Please try again later.",
    });
  }
};

// @desc    Create user
// @route   POST /api/users
// @access  Private/Admin
export const createUser = async (req, res) => {
  try {
    // Handle FormData - roles might come as array or string
    let roles = req.body.roles;
    if (Array.isArray(req.body['roles[]'])) {
      roles = req.body['roles[]'];
    } else if (typeof roles === 'string' && roles) {
      try {
        roles = JSON.parse(roles);
      } catch (e) {
        roles = [];
      }
    }
    if (!Array.isArray(roles)) {
      roles = [];
    }

    const { name, email, password, role } = req.body;

    // Validate input
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Please provide name, email, and password",
      });
    }

    // Check if user already exists
    const userExists = await User.findOne({ email: email.toLowerCase() });

    if (userExists) {
      return res.status(400).json({
        success: false,
        message: "User already exists with this email",
      });
    }

    // Validate roles if provided
    if (roles && Array.isArray(roles) && roles.length > 0) {
      const Role = (await import("../models/Role.js")).default;
      const validRoles = await Role.find({
        _id: { $in: roles },
        isActive: true,
      });
      
      if (validRoles.length !== roles.length) {
        return res.status(400).json({
          success: false,
          message: "One or more roles are invalid or inactive",
        });
      }
    }

    // Handle profile image
    let profileImage = null;
    if (req.file) {
      profileImage = `/uploads/profiles/${req.file.filename}`;
    }

    // Create user
    const userData = {
      name,
      email: email.toLowerCase(),
      password,
      role: role || "receptionist", // Keep for backward compatibility
      profileImage,
      dateOfBirth: req.body.dateOfBirth || null,
      yearsOfExperience: req.body.yearsOfExperience ? parseInt(req.body.yearsOfExperience) : 0,
      designation: req.body.designation || null,
      gender: req.body.gender || null,
      bloodGroup: req.body.bloodGroup || null,
    };

    if (roles && Array.isArray(roles) && roles.length > 0) {
      userData.roles = roles;
    }

    const user = await User.create(userData);

    // Remove password from response and populate roles
    const userResponse = await User.findById(user._id)
      .select("-password")
      .populate("roles", "name displayName permissions isActive");

    logInfo("User created", {
      createdBy: req.user.id,
      newUserId: user._id,
      newUserEmail: user.email,
      role: user.role,
      roles: roles || [],
    });

    res.status(201).json({
      success: true,
      message: "User created successfully",
      data: { user: userResponse },
    });
  } catch (error) {
    logError("Create user error", error, {
      createdBy: req.user?.id,
      email: req.body.email,
    });
    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map((err) => err.message);
      return res.status(400).json({
        success: false,
        message: messages.join(", "),
      });
    }
    res.status(500).json({
      success: false,
      message: "Server error. Please try again later.",
    });
  }
};

// @desc    Update user
// @route   PUT /api/users/:id
// @access  Private/Admin
export const updateUser = async (req, res) => {
  try {
    // Handle FormData - roles might come as array or string
    let roles = req.body.roles;
    if (Array.isArray(req.body['roles[]'])) {
      roles = req.body['roles[]'];
    } else if (typeof roles === 'string' && roles) {
      try {
        roles = JSON.parse(roles);
      } catch (e) {
        roles = undefined; // Keep undefined to not update roles
      }
    }

    const { name, email, role, isActive, dateOfBirth, yearsOfExperience, designation, gender, bloodGroup } = req.body;

    let user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Handle profile image upload
    if (req.file) {
      // Delete old profile image if exists
      if (user.profileImage) {
        const oldImagePath = path.join(__dirname, "..", user.profileImage);
        if (fs.existsSync(oldImagePath)) {
          fs.unlinkSync(oldImagePath);
        }
      }
      user.profileImage = `/uploads/profiles/${req.file.filename}`;
    }

    // Check if email is being changed and if it already exists
    if (email && email.toLowerCase() !== user.email) {
      const emailExists = await User.findOne({ email: email.toLowerCase() });
      if (emailExists) {
        return res.status(400).json({
          success: false,
          message: "Email already exists",
        });
      }
    }

    // Validate roles if provided
    if (roles !== undefined) {
      if (Array.isArray(roles) && roles.length > 0) {
        const Role = (await import("../models/Role.js")).default;
        const validRoles = await Role.find({
          _id: { $in: roles },
          isActive: true,
        });
        
        if (validRoles.length !== roles.length) {
          return res.status(400).json({
            success: false,
            message: "One or more roles are invalid or inactive",
          });
        }
        user.roles = roles;
      } else {
        user.roles = [];
      }
    }

    // Update user fields
    if (name) user.name = name;
    if (email) user.email = email.toLowerCase();
    if (role) user.role = role; // Keep for backward compatibility
    if (isActive !== undefined) user.isActive = isActive;
    if (dateOfBirth !== undefined) user.dateOfBirth = dateOfBirth || null;
    if (yearsOfExperience !== undefined) user.yearsOfExperience = yearsOfExperience ? parseInt(yearsOfExperience) : 0;
    if (designation !== undefined) user.designation = designation || null;
    if (gender !== undefined) user.gender = gender || null;
    if (bloodGroup !== undefined) user.bloodGroup = bloodGroup || null;

    await user.save();

    // Get updated user without password and populate roles
    const updatedUser = await User.findById(user._id)
      .select("-password")
      .populate("roles", "name displayName permissions isActive");

    logInfo("User updated", {
      updatedBy: req.user.id,
      updatedUserId: user._id,
      changes: {
        name: name !== undefined,
        email: email !== undefined,
        role: role !== undefined,
        roles: roles !== undefined,
        isActive: isActive !== undefined,
      },
    });

    res.status(200).json({
      success: true,
      message: "User updated successfully",
      data: { user: updatedUser },
    });
  } catch (error) {
    logError("Update user error", error, {
      updatedBy: req.user?.id,
      updatedUserId: req.params.id,
    });
    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map((err) => err.message);
      return res.status(400).json({
        success: false,
        message: messages.join(", "),
      });
    }
    res.status(500).json({
      success: false,
      message: "Server error. Please try again later.",
    });
  }
};

// @desc    Delete user
// @route   DELETE /api/users/:id
// @access  Private/Admin
export const deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Prevent deleting yourself
    if (user._id.toString() === req.user.id) {
      return res.status(400).json({
        success: false,
        message: "You cannot delete your own account",
      });
    }

    await User.findByIdAndDelete(req.params.id);

    logWarn("User deleted", {
      deletedBy: req.user.id,
      deletedUserId: req.params.id,
      deletedUserEmail: user.email,
    });

    res.status(200).json({
      success: true,
      message: "User deleted successfully",
      data: {},
    });
  } catch (error) {
    logError("Delete user error", error, {
      deletedBy: req.user?.id,
      deletedUserId: req.params.id,
    });
    res.status(500).json({
      success: false,
      message: "Server error. Please try again later.",
    });
  }
};
