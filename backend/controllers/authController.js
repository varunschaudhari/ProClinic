import User from "../models/User.js";
import generateToken from "../utils/generateToken.js";
import { logInfo, logError, logWarn } from "../config/logger.js";

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Please provide email and password",
      });
    }

    // Check for user and include password field
    const user = await User.findOne({ email }).select("+password");

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: "Your account has been deactivated. Please contact administrator.",
      });
    }

    // Check if password matches
    const isMatch = await user.matchPassword(password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    // Generate token
    const token = generateToken(user._id);

    // Get user with populated roles
    const userWithRoles = await User.findById(user._id)
      .select("-password")
      .populate("roles", "name displayName permissions isActive");

    // Get all permissions from roles
    let permissions = [];
    if (userWithRoles.roles && Array.isArray(userWithRoles.roles)) {
      const activeRoles = userWithRoles.roles.filter(
        (role) => role.isActive !== false
      );
      permissions = activeRoles.reduce((acc, role) => {
        if (role.permissions && Array.isArray(role.permissions)) {
          return [...acc, ...role.permissions];
        }
        return acc;
      }, []);
      permissions = [...new Set(permissions)]; // Remove duplicates
    }

    logInfo("User logged in", {
      userId: user._id,
      email: user.email,
      role: user.role,
      roles: userWithRoles.roles?.map((r) => r.name) || [],
      ip: req.ip || req.connection.remoteAddress,
    });

    // Send response
    res.status(200).json({
      success: true,
      message: "Login successful",
      data: {
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          roles: userWithRoles.roles || [],
          permissions,
        },
      },
    });
  } catch (error) {
    logError("Login error", error, {
      email: req.body.email,
      ip: req.ip || req.connection.remoteAddress,
    });
    res.status(500).json({
      success: false,
      message: "Server error. Please try again later.",
    });
  }
};

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private
export const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .select("-password")
      .populate("roles", "name displayName permissions isActive");

    // Get all permissions from roles
    let permissions = [];
    if (user.roles && Array.isArray(user.roles)) {
      const activeRoles = user.roles.filter(
        (role) => role.isActive !== false
      );
      permissions = activeRoles.reduce((acc, role) => {
        if (role.permissions && Array.isArray(role.permissions)) {
          return [...acc, ...role.permissions];
        }
        return acc;
      }, []);
      permissions = [...new Set(permissions)]; // Remove duplicates
    }

    res.status(200).json({
      success: true,
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          roles: user.roles || [],
          permissions,
        },
      },
    });
  } catch (error) {
    logError("Get me error", error, {
      userId: req.user?.id,
    });
    res.status(500).json({
      success: false,
      message: "Server error. Please try again later.",
    });
  }
};

// @desc    Register new user (for admin use)
// @route   POST /api/auth/register
// @access  Private/Admin
export const register = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    // Validate input
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Please provide name, email, and password",
      });
    }

    // Check if user already exists
    const userExists = await User.findOne({ email });

    if (userExists) {
      return res.status(400).json({
        success: false,
        message: "User already exists with this email",
      });
    }

    // Create user
    const user = await User.create({
      name,
      email,
      password,
      role: role || "receptionist",
    });

    // Generate token
    const token = generateToken(user._id);

    logInfo("User registered", {
      registeredBy: req.user.id,
      newUserId: user._id,
      newUserEmail: user.email,
      role: user.role,
    });

    res.status(201).json({
      success: true,
      message: "User registered successfully",
      data: {
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      },
    });
  } catch (error) {
    logError("Register error", error, {
      registeredBy: req.user?.id,
      email: req.body.email,
    });
    res.status(500).json({
      success: false,
      message: "Server error. Please try again later.",
    });
  }
};
