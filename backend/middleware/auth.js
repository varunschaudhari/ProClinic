import jwt from "jsonwebtoken";
import User from "../models/User.js";
import Role from "../models/Role.js";

// Protect routes - verify JWT token
export const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    try {
      // Get token from header
      token = req.headers.authorization.split(" ")[1];

      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Get user from token (excluding password) and populate roles
      req.user = await User.findById(decoded.id)
        .select("-password")
        .populate("roles", "name displayName permissions isActive");

      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: "User not found",
        });
      }

      if (!req.user.isActive) {
        return res.status(401).json({
          success: false,
          message: "User account is deactivated",
        });
      }

      // Get all permissions from user's roles
      if (req.user.roles && Array.isArray(req.user.roles)) {
        const activeRoles = req.user.roles.filter(
          (role) => role.isActive !== false
        );
        req.user.permissions = activeRoles.reduce((acc, role) => {
          if (role.permissions && Array.isArray(role.permissions)) {
            return [...acc, ...role.permissions];
          }
          return acc;
        }, []);
        // Remove duplicates
        req.user.permissions = [...new Set(req.user.permissions)];
      } else {
        req.user.permissions = [];
      }

      next();
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: "Not authorized, token failed",
      });
    }
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: "Not authorized, no token",
    });
  }
};

// Grant access to specific roles (backward compatibility)
export const authorize = (...roles) => {
  return (req, res, next) => {
    // Check legacy role field
    if (req.user.role && roles.includes(req.user.role)) {
      return next();
    }

    // Check new roles array
    if (req.user.roles && Array.isArray(req.user.roles)) {
      const userRoleNames = req.user.roles
        .filter((r) => r.isActive !== false)
        .map((r) => r.name);
      
      const hasRole = roles.some((role) => userRoleNames.includes(role));
      if (hasRole) {
        return next();
      }
    }

    return res.status(403).json({
      success: false,
      message: `User is not authorized to access this route`,
    });
  };
};

// Check if user has specific permission(s)
export const hasPermission = (...requiredPermissions) => {
  return (req, res, next) => {
    if (!req.user || !req.user.permissions) {
      return res.status(403).json({
        success: false,
        message: "User does not have required permissions",
      });
    }

    // Check if user has at least one of the required permissions
    const hasRequiredPermission = requiredPermissions.some((permission) =>
      req.user.permissions.includes(permission)
    );

    if (!hasRequiredPermission) {
      return res.status(403).json({
        success: false,
        message: "User does not have required permissions",
        required: requiredPermissions,
        userPermissions: req.user.permissions,
      });
    }

    next();
  };
};
