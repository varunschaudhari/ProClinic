import mongoose from "mongoose";
import User from "../models/User.js";
import Role from "../models/Role.js";
import Patient from "../models/Patient.js";
import Sequence from "../models/Sequence.js";
import Settings from "../models/Settings.js";
import { PERMISSIONS } from "../constants/permissions.js";
import { logInfo, logError } from "./logger.js";

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI);
    logInfo("MongoDB connected", {
      host: conn.connection.host,
      database: conn.connection.name,
    });
    console.log(`MongoDB Connected: ${conn.connection.host}`);
    
    // Check and create default user and roles after connection
    await ensureDefaultRoles();
    await ensureDefaultUser();
    await initializePatientSequence();
    await initializeDefaultSettings();
  } catch (error) {
    logError("MongoDB connection error", error);
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

// Ensure default user exists
const ensureDefaultUser = async () => {
  try {
    const defaultEmail = "varun@gmail.com";
    const defaultPassword = "varun123";
    
    // Check if user exists
    const existingUser = await User.findOne({ email: defaultEmail });
    
    if (!existingUser) {
      // Find admin role
      const adminRole = await Role.findOne({ name: "admin" });
      
      // Create default user with admin role
      const userData = {
        name: "Varun",
        email: defaultEmail,
        password: defaultPassword,
        role: "admin",
        isActive: true,
      };
      
      if (adminRole) {
        userData.roles = [adminRole._id];
      }
      
      const user = await User.create(userData);
      
      logInfo("Default user created", {
        email: defaultEmail,
        hasAdminRole: !!adminRole,
      });
      console.log(`✅ Default user created: ${defaultEmail}`);
    } else {
      logInfo("Default user already exists", {
        email: defaultEmail,
      });
      console.log(`ℹ️  Default user already exists: ${defaultEmail}`);
    }
  } catch (error) {
    logError("Error ensuring default user", error);
    console.error(`Error ensuring default user: ${error.message}`);
    // Don't exit - server can still run without default user
  }
};

// Ensure default roles exist
const ensureDefaultRoles = async () => {
  try {
    const defaultRoles = [
      {
        name: "admin",
        displayName: "Administrator",
        description: "Full system access with all permissions",
        permissions: Object.values(PERMISSIONS), // All permissions
        isSystem: true,
        isActive: true,
      },
      {
        name: "doctor",
        displayName: "Doctor",
        description: "Doctor role with patient and appointment management",
        permissions: [
          PERMISSIONS.PATIENTS_VIEW,
          PERMISSIONS.PATIENTS_CREATE,
          PERMISSIONS.PATIENTS_EDIT,
          PERMISSIONS.APPOINTMENTS_VIEW,
          PERMISSIONS.APPOINTMENTS_CREATE,
          PERMISSIONS.APPOINTMENTS_EDIT,
          PERMISSIONS.DOCTORS_VIEW,
          PERMISSIONS.REPORTS_VIEW,
        ],
        isSystem: true,
        isActive: true,
      },
      {
        name: "nurse",
        displayName: "Nurse",
        description: "Nurse role with patient care permissions",
        permissions: [
          PERMISSIONS.PATIENTS_VIEW,
          PERMISSIONS.PATIENTS_EDIT,
          PERMISSIONS.APPOINTMENTS_VIEW,
          PERMISSIONS.APPOINTMENTS_CREATE,
          PERMISSIONS.APPOINTMENTS_EDIT,
        ],
        isSystem: true,
        isActive: true,
      },
      {
        name: "receptionist",
        displayName: "Receptionist",
        description: "Receptionist role with appointment and patient viewing",
        permissions: [
          PERMISSIONS.PATIENTS_VIEW,
          PERMISSIONS.PATIENTS_CREATE,
          PERMISSIONS.APPOINTMENTS_VIEW,
          PERMISSIONS.APPOINTMENTS_CREATE,
          PERMISSIONS.APPOINTMENTS_EDIT,
          PERMISSIONS.BILLING_VIEW,
          PERMISSIONS.BILLING_CREATE,
        ],
        isSystem: true,
        isActive: true,
      },
    ];

    for (const roleData of defaultRoles) {
      const existingRole = await Role.findOne({ name: roleData.name });
      
      if (!existingRole) {
        await Role.create(roleData);
        logInfo("Default role created", {
          name: roleData.name,
        });
        console.log(`✅ Default role created: ${roleData.displayName}`);
      } else {
        // Update existing role to ensure it has all current permissions
        // Especially important for admin role to get new permissions like OPD
        existingRole.displayName = roleData.displayName;
        existingRole.description = roleData.description;
        existingRole.permissions = roleData.permissions;
        existingRole.isSystem = roleData.isSystem;
        existingRole.isActive = roleData.isActive;
        await existingRole.save();
        logInfo("Default role updated", {
          name: roleData.name,
        });
        console.log(`✅ Default role updated: ${roleData.displayName}`);
      }
    }
  } catch (error) {
    logError("Error ensuring default roles", error);
    console.error(`Error ensuring default roles: ${error.message}`);
    // Don't exit - server can still run without default roles
  }
};

// Initialize patient sequence counter
const initializePatientSequence = async () => {
  try {
    const sequence = await Sequence.findOne({ name: "patient" });
    if (!sequence) {
      // If sequence doesn't exist, initialize it to 0
      // This ensures patient IDs start from 1 (sequence increments before generating ID)
      await Sequence.create({
        name: "patient",
        value: 0,
      });
      logInfo("Patient sequence initialized", { count: 0 });
      console.log(`✅ Patient sequence initialized - Patient IDs will start from 1`);
    } else {
      logInfo("Patient sequence already exists", { count: sequence.value });
    }
  } catch (error) {
    logError("Error initializing patient sequence", error);
    console.error(`Error initializing patient sequence: ${error.message}`);
    // Don't exit - server can still run without sequence initialization
  }
};

// Initialize default settings (room types, ward types, etc.)
const initializeDefaultSettings = async () => {
  try {
    const defaultRoomTypes = [
      { key: "room-type-general", value: "general", description: "General ward room" },
      { key: "room-type-private", value: "private", description: "Private room" },
      { key: "room-type-semi-private", value: "semi-private", description: "Semi-private room" },
      { key: "room-type-icu", value: "icu", description: "Intensive Care Unit" },
      { key: "room-type-ccu", value: "ccu", description: "Cardiac Care Unit" },
      { key: "room-type-isolation", value: "isolation", description: "Isolation room" },
      { key: "room-type-ward", value: "ward", description: "Ward" },
      { key: "room-type-other", value: "other", description: "Other room type" },
    ];

    const defaultWardTypes = [
      { key: "ward-type-general", value: "general", description: "General ward" },
      { key: "ward-type-icu", value: "icu", description: "Intensive Care Unit" },
      { key: "ward-type-ccu", value: "ccu", description: "Cardiac Care Unit" },
      { key: "ward-type-surgical", value: "surgical", description: "Surgical ward" },
      { key: "ward-type-medical", value: "medical", description: "Medical ward" },
      { key: "ward-type-pediatric", value: "pediatric", description: "Pediatric ward" },
      { key: "ward-type-maternity", value: "maternity", description: "Maternity ward" },
      { key: "ward-type-orthopedic", value: "orthopedic", description: "Orthopedic ward" },
      { key: "ward-type-cardiac", value: "cardiac", description: "Cardiac ward" },
      { key: "ward-type-neurology", value: "neurology", description: "Neurology ward" },
      { key: "ward-type-oncology", value: "oncology", description: "Oncology ward" },
      { key: "ward-type-emergency", value: "emergency", description: "Emergency ward" },
      { key: "ward-type-other", value: "other", description: "Other ward type" },
    ];

    for (const roomType of defaultRoomTypes) {
      const existing = await Settings.findOne({ key: roomType.key });
      if (!existing) {
        await Settings.create({
          ...roomType,
          category: "room-types",
          isActive: true,
          isSystem: false,
        });
        logInfo("Default room type created", { key: roomType.key });
      }
    }

    for (const wardType of defaultWardTypes) {
      const existing = await Settings.findOne({ key: wardType.key });
      if (!existing) {
        await Settings.create({
          ...wardType,
          category: "ward-types",
          isActive: true,
          isSystem: false,
        });
        logInfo("Default ward type created", { key: wardType.key });
      }
    }
  } catch (error) {
    logError("Error initializing default settings", error);
    // Don't exit - server can still run without default settings
  }
};

export default connectDB;
