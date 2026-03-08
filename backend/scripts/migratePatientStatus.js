import mongoose from "mongoose";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import Patient from "../models/Patient.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, "../.env") });

const migratePatientStatus = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB");

    // Find all patients without status field or with null status
    const patientsWithoutStatus = await Patient.find({
      $or: [
        { status: { $exists: false } },
        { status: null },
      ],
    });

    console.log(`Found ${patientsWithoutStatus.length} patients without status field`);

    if (patientsWithoutStatus.length > 0) {
      // Update all patients without status to "active"
      const result = await Patient.updateMany(
        {
          $or: [
            { status: { $exists: false } },
            { status: null },
          ],
        },
        {
          $set: { status: "active" },
        }
      );

      console.log(`✅ Updated ${result.modifiedCount} patients with default status "active"`);
    } else {
      console.log("ℹ️  All patients already have a status field");
    }

    await mongoose.connection.close();
    console.log("Migration completed successfully!");
    process.exit(0);
  } catch (error) {
    console.error("Error migrating patient status:", error);
    await mongoose.connection.close();
    process.exit(1);
  }
};

migratePatientStatus();
