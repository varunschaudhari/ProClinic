import mongoose from "mongoose";
import dotenv from "dotenv";
import Role from "../models/Role.js";
import User from "../models/User.js";
import { PERMISSIONS } from "../constants/permissions.js";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, "../.env") });

const seedData = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ Connected to MongoDB");
    console.log("");

    // Step 1: Seed Roles
    console.log("🌱 Step 1: Seeding roles...");
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

    const createdRoles = {};
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
        createdRoles[roleData.name] = existingRole;
        console.log(`   ✅ Updated role: ${roleData.displayName}`);
      } else {
        // Create new role
        const role = await Role.create(roleData);
        createdRoles[roleData.name] = role;
        console.log(`   ✅ Created role: ${roleData.displayName}`);
      }
    }

    console.log(`✨ Roles seeding completed! (${Object.keys(createdRoles).length} roles)`);
    console.log("");

    // Step 2: Seed Users with Roles
    console.log("👤 Step 2: Seeding users with roles...");

    const usersToSeed = [
      {
        name: "Varun",
        email: "varun@gmail.com",
        password: "varun123",
        role: "admin", // Legacy role
        roles: ["admin"], // RBAC roles
        isActive: true,
      },
      {
        name: "Admin User",
        email: "admin@proclinic.com",
        password: "admin123",
        role: "admin", // Legacy role
        roles: ["admin"], // RBAC roles
        isActive: true,
      },
      {
        name: "Dr. John Smith",
        email: "doctor@proclinic.com",
        password: "doctor123",
        role: "doctor", // Legacy role
        roles: ["doctor"], // RBAC roles
        isActive: true,
      },
      {
        name: "Nurse Jane Doe",
        email: "nurse@proclinic.com",
        password: "nurse123",
        role: "nurse", // Legacy role
        roles: ["nurse"], // RBAC roles
        isActive: true,
      },
      {
        name: "Receptionist Alice",
        email: "receptionist@proclinic.com",
        password: "receptionist123",
        role: "receptionist", // Legacy role
        roles: ["receptionist"], // RBAC roles
        isActive: true,
      },
    ];

    for (const userData of usersToSeed) {
      const existingUser = await User.findOne({ email: userData.email });
      
      if (existingUser) {
        // Update existing user with roles
        const roleIds = userData.roles
          .map((roleName) => createdRoles[roleName]?._id)
          .filter(Boolean);
        
        existingUser.name = userData.name;
        existingUser.role = userData.role;
        existingUser.roles = roleIds;
        existingUser.isActive = userData.isActive;
        await existingUser.save();
        
        console.log(`   ✅ Updated user: ${userData.email}`);
        console.log(`      Roles: ${userData.roles.join(", ")}`);
      } else {
        // Create new user with roles
        const roleIds = userData.roles
          .map((roleName) => createdRoles[roleName]?._id)
          .filter(Boolean);
        
        const user = await User.create({
          name: userData.name,
          email: userData.email,
          password: userData.password,
          role: userData.role,
          roles: roleIds,
          isActive: userData.isActive,
        });
        
        console.log(`   ✅ Created user: ${userData.email}`);
        console.log(`      Password: ${userData.password}`);
        console.log(`      Roles: ${userData.roles.join(", ")}`);
      }
    }

    console.log(`✨ Users seeding completed! (${usersToSeed.length} users)`);
    console.log("");

    // Summary
    console.log("📊 Seeding Summary:");
    console.log(`   Roles: ${Object.keys(createdRoles).length}`);
    console.log(`   Users: ${usersToSeed.length}`);
    console.log("");
    console.log("🔑 Default Login Credentials:");
    console.log("   Admin:");
    console.log("     Email: varun@gmail.com");
    console.log("     Password: varun123");
    console.log("   Doctor:");
    console.log("     Email: doctor@proclinic.com");
    console.log("     Password: doctor123");
    console.log("   Nurse:");
    console.log("     Email: nurse@proclinic.com");
    console.log("     Password: nurse123");
    console.log("   Receptionist:");
    console.log("     Email: receptionist@proclinic.com");
    console.log("     Password: receptionist123");
    console.log("");

    await mongoose.connection.close();
    console.log("✅ Database connection closed");
    console.log("🎉 Seeding completed successfully!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error seeding data:", error);
    await mongoose.connection.close();
    process.exit(1);
  }
};

seedData();
