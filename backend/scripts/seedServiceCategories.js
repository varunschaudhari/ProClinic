import mongoose from "mongoose";
import dotenv from "dotenv";
import ServiceCategory from "../models/ServiceCategory.js";
import connectDB from "../config/database.js";

dotenv.config();

const seedServiceCategories = async () => {
  try {
    await connectDB();

    const defaultCategories = [
      {
        name: "Lab Test",
        code: "LAB_TEST",
        description: "Laboratory tests and diagnostics",
        status: "active",
      },
      {
        name: "Procedure",
        code: "PROCEDURE",
        description: "Medical procedures and surgeries",
        status: "active",
      },
      {
        name: "Consultation",
        code: "CONSULTATION",
        description: "Doctor consultations and visits",
        status: "active",
      },
      {
        name: "Pharmacy",
        code: "PHARMACY",
        description: "Pharmacy and medication services",
        status: "active",
      },
      {
        name: "Other",
        code: "OTHER",
        description: "Other services",
        status: "active",
      },
    ];

    console.log("🌱 Seeding service categories...");

    for (const categoryData of defaultCategories) {
      const existingCategory = await ServiceCategory.findOne({ code: categoryData.code });
      
      if (existingCategory) {
        if (existingCategory.isDeleted) {
          // Restore deleted category
          existingCategory.name = categoryData.name;
          existingCategory.description = categoryData.description;
          existingCategory.status = categoryData.status;
          existingCategory.isDeleted = false;
          existingCategory.deletedAt = null;
          existingCategory.deletedBy = null;
          await existingCategory.save();
          console.log(`✅ Restored category: ${categoryData.name}`);
        } else {
          // Update existing category
          existingCategory.name = categoryData.name;
          existingCategory.description = categoryData.description;
          existingCategory.status = categoryData.status;
          await existingCategory.save();
          console.log(`✅ Updated category: ${categoryData.name}`);
        }
      } else {
        // Create new category
        await ServiceCategory.create(categoryData);
        console.log(`✅ Created category: ${categoryData.name}`);
      }
    }

    console.log("✨ Service categories seeding completed!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error seeding service categories:", error);
    process.exit(1);
  }
};

seedServiceCategories();
