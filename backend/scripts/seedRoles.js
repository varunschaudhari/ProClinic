import mongoose from "mongoose";
import dotenv from "dotenv";
import Role from "../models/Role.js";
import { PERMISSIONS } from "../constants/permissions.js";
import connectDB from "../config/database.js";

dotenv.config();

const seedRoles = async () => {
  try {
    await connectDB();

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

    console.log("🌱 Seeding roles...");

    for (const roleData of defaultRoles) {
      const existingRole = await Role.findOne({ name: roleData.name });
      
      if (existingRole) {
        // Update existing role
        existingRole.displayName = roleData.displayName;
        existingRole.description = roleData.description;
        existingRole.permissions = roleData.permissions;
        existingRole.isSystem = roleData.isSystem;
        existingRole.isActive = roleData.isActive;
        await existingRole.save();
        console.log(`✅ Updated role: ${roleData.displayName}`);
      } else {
        // Create new role
        await Role.create(roleData);
        console.log(`✅ Created role: ${roleData.displayName}`);
      }
    }

    console.log("✨ Roles seeding completed!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error seeding roles:", error);
    process.exit(1);
  }
};

seedRoles();
