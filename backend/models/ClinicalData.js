import mongoose from "mongoose";

const clinicalDataSchema = new mongoose.Schema(
  {
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Patient",
      required: [true, "Patient is required"],
    },
    // Source reference (OPD or IPD record)
    sourceType: {
      type: String,
      enum: ["opd", "ipd", "standalone"],
      default: "standalone",
    },
    sourceId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null, // References OPD or IPD record if applicable
    },
    // Vital signs
    vitalSigns: [
      {
        date: {
          type: Date,
          default: Date.now,
        },
        bloodPressure: {
          systolic: {
            type: Number,
            min: 0,
          },
          diastolic: {
            type: Number,
            min: 0,
          },
        },
        temperature: {
          value: {
            type: Number,
            min: 0,
          },
          unit: {
            type: String,
            enum: ["celsius", "fahrenheit"],
            default: "celsius",
          },
        },
        pulse: {
          type: Number,
          min: 0,
        },
        respiratoryRate: {
          type: Number,
          min: 0,
        },
        oxygenSaturation: {
          type: Number,
          min: 0,
          max: 100,
        },
        weight: {
          value: {
            type: Number,
            min: 0,
          },
          unit: {
            type: String,
            enum: ["kg", "lbs"],
            default: "kg",
          },
        },
        height: {
          value: {
            type: Number,
            min: 0,
          },
          unit: {
            type: String,
            enum: ["cm", "ft"],
            default: "cm",
          },
        },
        bmi: {
          type: Number,
          min: 0,
        },
        recordedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
      },
    ],
    // Lab test results
    labResults: [
      {
        testName: {
          type: String,
          required: true,
          trim: true,
        },
        testDate: {
          type: Date,
          default: Date.now,
        },
        testType: {
          type: String,
          enum: ["blood", "urine", "stool", "imaging", "biopsy", "other"],
          default: "blood",
        },
        results: {
          type: String,
          trim: true,
        },
        normalRange: {
          type: String,
          trim: true,
        },
        status: {
          type: String,
          enum: ["normal", "abnormal", "critical", "pending"],
          default: "pending",
        },
        fileUrl: {
          type: String,
          trim: true,
        },
        orderedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        reviewedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
      },
    ],
    // Imaging reports
    imagingReports: [
      {
        reportName: {
          type: String,
          required: true,
          trim: true,
        },
        reportDate: {
          type: Date,
          default: Date.now,
        },
        imagingType: {
          type: String,
          enum: ["x-ray", "ct-scan", "mri", "ultrasound", "mammography", "other"],
          required: true,
        },
        bodyPart: {
          type: String,
          trim: true,
        },
        findings: {
          type: String,
          trim: true,
        },
        impression: {
          type: String,
          trim: true,
        },
        fileUrl: {
          type: String,
          trim: true,
        },
        orderedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        reviewedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
      },
    ],
    // Clinical observations/notes
    clinicalObservations: [
      {
        date: {
          type: Date,
          default: Date.now,
        },
        observation: {
          type: String,
          required: true,
          trim: true,
        },
        category: {
          type: String,
          enum: ["symptom", "sign", "assessment", "plan", "other"],
          default: "other",
        },
        recordedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
      },
    ],
    // Allergy tracking
    allergies: [
      {
        allergen: {
          type: String,
          required: true,
          trim: true,
        },
        severity: {
          type: String,
          enum: ["mild", "moderate", "severe", "life-threatening"],
          default: "moderate",
        },
        reaction: {
          type: String,
          trim: true,
        },
        firstObserved: {
          type: Date,
          default: Date.now,
        },
        lastObserved: {
          type: Date,
          default: Date.now,
        },
        status: {
          type: String,
          enum: ["active", "resolved", "monitoring"],
          default: "active",
        },
        notes: {
          type: String,
          trim: true,
        },
        recordedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
      },
    ],
    // Track Parameters (additional metrics beyond vitals)
    trackParameters: [
      {
        date: {
          type: Date,
          default: Date.now,
        },
        parameterName: {
          type: String,
          required: true,
          trim: true,
        },
        value: {
          type: mongoose.Schema.Types.Mixed, // Can be number or string
        },
        unit: {
          type: String,
          trim: true,
        },
        normalRange: {
          type: String,
          trim: true,
        },
        status: {
          type: String,
          enum: ["normal", "abnormal", "critical"],
          default: "normal",
        },
        notes: {
          type: String,
          trim: true,
        },
        recordedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
      },
    ],
    // Diagnosis tracking
    diagnoses: [
      {
        date: {
          type: Date,
          default: Date.now,
        },
        diagnosis: {
          type: String,
          required: true,
          trim: true,
        },
        icdCode: {
          type: String,
          trim: true,
        },
        type: {
          type: String,
          enum: ["primary", "secondary", "differential", "provisional", "confirmed"],
          default: "primary",
        },
        status: {
          type: String,
          enum: ["active", "resolved", "chronic", "monitoring"],
          default: "active",
        },
        notes: {
          type: String,
          trim: true,
        },
        diagnosedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
      },
    ],
    // Created/Updated by
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  }
);

// Index for faster queries
clinicalDataSchema.index({ patientId: 1, createdAt: -1 });
clinicalDataSchema.index({ sourceType: 1, sourceId: 1 });
clinicalDataSchema.index({ "vitalSigns.date": -1 });
clinicalDataSchema.index({ "labResults.testDate": -1 });
clinicalDataSchema.index({ "imagingReports.reportDate": -1 });

const ClinicalData = mongoose.model("ClinicalData", clinicalDataSchema);

export default ClinicalData;
