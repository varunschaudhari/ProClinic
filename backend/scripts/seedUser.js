import mongoose from "mongoose";
import dotenv from "dotenv";
import User from "../models/User.js";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, "../.env") });

const seedUser = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB");

    // Seed default user (varun@gmail.com)
    const defaultEmail = "varun@gmail.com";
    const defaultUser = await User.findOne({ email: defaultEmail });
    
    if (!defaultUser) {
      const user = await User.create({
        name: "Varun",
        email: defaultEmail,
        password: "varun123",
        role: "admin",
        isActive: true,
      });
      console.log("✅ Default user created successfully!");
      console.log(`Email: ${defaultEmail}`);
      console.log("Password: varun123");
      console.log("Role: admin");
    } else {
      console.log(`ℹ️  Default user already exists: ${defaultEmail}`);
    }

    // Seed admin test user
    const adminEmail = "admin@proclinic.com";
    const existingUser = await User.findOne({ email: adminEmail });

    if (!existingUser) {
      const user = await User.create({
        name: "Admin User",
        email: adminEmail,
        password: "admin123",
        role: "admin",
        isActive: true,
      });
      console.log("✅ Admin test user created successfully!");
      console.log(`Email: ${adminEmail}`);
      console.log("Password: admin123");
      console.log("Role: admin");
    } else {
      console.log(`ℹ️  Admin test user already exists: ${adminEmail}`);
    }

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error("Error seeding user:", error);
    await mongoose.connection.close();
    process.exit(1);
  }
};

seedUser();
