import mongoose from "mongoose";
import Patient from "../models/Patient.js";
import Sequence from "../models/Sequence.js";
import OPD from "../models/OPD.js";
import IPD from "../models/IPD.js";
import PatientBillingTransaction from "../models/PatientBillingTransaction.js";
import OTScheduler from "../models/OTScheduler.js";
import { logInfo, logError } from "../config/logger.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper function to get patient count from sequence
const getPatientCount = async () => {
  try {
    const sequence = await Sequence.findOne({ name: "patient" });
    return sequence ? sequence.value : 0;
  } catch (error) {
    logError("Get patient count error", error);
    return 0;
  }
};


// @desc    Get all patients
// @route   GET /api/patients
// @access  Private
export const getPatients = async (req, res) => {
  try {
    const { status, isActive, search } = req.query;

    const query = {};
    
    // Handle status filter - include patients without status field (default to "active")
    if (status) {
      if (status === "active") {
        // For "active" status, include patients with status="active" OR no status field
        query.$or = [
          { status: "active" },
          { status: { $exists: false } },
          { status: null },
        ];
      } else {
        // For other statuses, only match exact status
        query.status = status;
      }
    }
    
    if (isActive !== undefined) query.isActive = isActive === "true";

    // Search functionality
    if (search) {
      const searchQuery = { $regex: search, $options: "i" };
      const searchConditions = [
        { name: searchQuery },
        { patientId: searchQuery },
        { phone: searchQuery },
        { email: searchQuery },
      ];
      
      if (query.$or) {
        // If we already have $or for status, combine with $and
        query.$and = [
          { $or: query.$or },
          { $or: searchConditions },
        ];
        delete query.$or;
      } else {
        query.$or = searchConditions;
      }
    }

    const patients = await Patient.find(query)
      .populate("statusChangedBy", "name email")
      .sort({ createdAt: -1 });

    // Get patient count from sequence
    const patientCount = await getPatientCount();

    // Get visit counts for each patient (OPD + IPD)
    // Also determine patientType (inpatient/outpatient) based on active IPD records
    // Use Promise.all with countDocuments for reliability
    const patientsWithVisitCounts = await Promise.all(
      patients.map(async (patient) => {
        try {
          // Use countDocuments directly with patient._id (Mongoose handles ObjectId conversion)
          const opdCount = await OPD.countDocuments({ patientId: patient._id });
          const ipdCount = await IPD.countDocuments({ patientId: patient._id });
          const totalVisits = opdCount + ipdCount;
          
          // Check if patient has active IPD records (admitted or under-treatment)
          const activeIPDCount = await IPD.countDocuments({
            patientId: patient._id,
            status: { $in: ["admitted", "under-treatment"] }
          });
          
          // Determine patientType: inpatient if has active IPD, otherwise outpatient
          const patientType = activeIPDCount > 0 ? "inpatient" : "outpatient";
          
          // Convert to plain object and add visit counts and patientType
          const patientObj = patient.toObject ? patient.toObject() : { ...patient };
          patientObj.visitCount = totalVisits;
          patientObj.opdCount = opdCount;
          patientObj.ipdCount = ipdCount;
          patientObj.patientType = patientType;
          patientObj.isInpatient = activeIPDCount > 0; // Boolean flag for convenience
          
          // Debug logging for first patient
          if (patients.indexOf(patient) === 0) {
            logInfo("Sample visit count calculation", {
              patientId: patient.patientId,
              patientName: patient.name,
              patient_id: patient._id ? patient._id.toString() : String(patient._id),
              opdCount,
              ipdCount,
              totalVisits,
              patientType,
              activeIPDCount
            });
          }
          
          return patientObj;
        } catch (error) {
          logError("Error counting visits for patient", error, { 
            patientId: patient._id ? patient._id.toString() : String(patient._id),
            patientName: patient.name
          });
          // Return patient with zero counts on error
          const patientObj = patient.toObject ? patient.toObject() : { ...patient };
          patientObj.visitCount = 0;
          patientObj.opdCount = 0;
          patientObj.ipdCount = 0;
          patientObj.patientType = "outpatient";
          patientObj.isInpatient = false;
          return patientObj;
        }
      })
    );

    // Log visit count summary for debugging
    const visitCountSummary = patientsWithVisitCounts.map(p => ({
      patientId: p.patientId,
      name: p.name,
      visitCount: p.visitCount,
      opdCount: p.opdCount,
      ipdCount: p.ipdCount,
      _id: p._id ? p._id.toString() : String(p._id)
    }));
    
    // Verify visit counts are being set correctly
    const patientsWithVisits = visitCountSummary.filter(p => p.visitCount > 0);
    const totalVisitsSum = visitCountSummary.reduce((sum, p) => sum + (p.visitCount || 0), 0);
    
    logInfo("Patients fetched", {
      userId: req.user.id,
      count: patients.length,
      patientCount: patientCount,
      filters: { status, isActive, search },
      visitCounts: visitCountSummary.slice(0, 5), // Log first 5 for debugging
      patientsWithVisits: patientsWithVisits.length,
      totalVisitsSum: totalVisitsSum
    });
    
    // Verify sample patient has visitCount in response
    if (patientsWithVisitCounts.length > 0) {
      const samplePatient = patientsWithVisitCounts[0];
      logInfo("Sample patient response", {
        hasVisitCount: 'visitCount' in samplePatient,
        visitCount: samplePatient.visitCount,
        visitCountType: typeof samplePatient.visitCount,
        opdCount: samplePatient.opdCount,
        ipdCount: samplePatient.ipdCount
      });
    }

    res.status(200).json({
      success: true,
      count: patients.length,
      patientCount: patientCount, // Total patient count from sequence
      data: { patients: patientsWithVisitCounts },
    });
  } catch (error) {
    logError("Get patients error", error, {
      userId: req.user?.id,
    });
    res.status(500).json({
      success: false,
      message: "Server error. Please try again later.",
    });
  }
};

// @desc    Get single patient
// @route   GET /api/patients/:id
// @access  Private
export const getPatient = async (req, res) => {
  try {
    const patient = await Patient.findById(req.params.id)
      .populate("statusChangedBy", "name email");

    if (!patient) {
      return res.status(404).json({
        success: false,
        message: "Patient not found",
      });
    }

    // Check if patient has active IPD records to determine patientType
    const activeIPDCount = await IPD.countDocuments({
      patientId: patient._id,
      status: { $in: ["admitted", "under-treatment"] }
    });
    
    // Get total OPD and IPD visit counts
    const opdCount = await OPD.countDocuments({ patientId: patient._id });
    const ipdCount = await IPD.countDocuments({ patientId: patient._id });
    const totalVisits = opdCount + ipdCount;
    
    // Convert to plain object and add computed patientType and visit counts
    const patientObj = patient.toObject ? patient.toObject() : { ...patient };
    patientObj.patientType = activeIPDCount > 0 ? "inpatient" : "outpatient";
    patientObj.isInpatient = activeIPDCount > 0;
    patientObj.opdCount = opdCount;
    patientObj.ipdCount = ipdCount;
    patientObj.totalVisits = totalVisits;
    patientObj.activeIPDCount = activeIPDCount;

    res.status(200).json({
      success: true,
      data: { patient: patientObj },
    });
  } catch (error) {
    logError("Get patient error", error, {
      userId: req.user?.id,
      requestedPatientId: req.params.id,
    });
    res.status(500).json({
      success: false,
      message: "Server error. Please try again later.",
    });
  }
};

// @desc    Create patient
// @route   POST /api/patients
// @access  Private
export const createPatient = async (req, res) => {
  try {
    const {
      name,
      dateOfBirth,
      gender,
      bloodGroup,
      phone,
      email,
      address,
      emergencyContact,
      medicalHistory,
      allergies,
      chronicConditions,
      notes,
      tags,
    } = req.body;

    // Validate input
    if (!name || !dateOfBirth || !gender || !phone) {
      return res.status(400).json({
        success: false,
        message: "Please provide name, date of birth, gender, and phone",
      });
    }

    // Handle profile image
    let profileImage = null;
    if (req.file) {
      profileImage = `/uploads/profiles/${req.file.filename}`;
    }

    // Parse allergies if it's a string
    let allergiesArray = [];
    if (allergies) {
      if (typeof allergies === "string") {
        allergiesArray = allergies.split(",").map((a) => a.trim()).filter((a) => a);
      } else if (Array.isArray(allergies)) {
        allergiesArray = allergies;
      }
    }

    // Parse chronic conditions if it's a string
    let chronicConditionsArray = [];
    if (chronicConditions) {
      if (typeof chronicConditions === "string") {
        chronicConditionsArray = chronicConditions.split(",").map((c) => c.trim()).filter((c) => c);
      } else if (Array.isArray(chronicConditions)) {
        chronicConditionsArray = chronicConditions;
      }
    }

    // Parse tags if it's a string
    let tagsArray = [];
    if (tags) {
      if (typeof tags === "string") {
        tagsArray = tags.split(",").map((t) => t.trim()).filter((t) => t);
      } else if (Array.isArray(tags)) {
        tagsArray = tags;
      }
    }

    // Parse nested objects from FormData
    let addressObj = null;
    if (req.body.address) {
      if (typeof req.body.address === 'string') {
        try {
          addressObj = JSON.parse(req.body.address);
        } catch (e) {
          // Handle FormData format: address[street], address[village], address[city], etc.
          addressObj = {
            street: req.body['address[street]'] || "",
            village: req.body['address[village]'] || "",
            city: req.body['address[city]'] || "",
            state: req.body['address[state]'] || "",
            zipCode: req.body['address[zipCode]'] || "",
            country: req.body['address[country]'] || "India",
          };
        }
      } else {
        addressObj = req.body.address;
      }
    }

    let emergencyContactObj = null;
    if (req.body.emergencyContact) {
      if (typeof req.body.emergencyContact === 'string') {
        try {
          emergencyContactObj = JSON.parse(req.body.emergencyContact);
        } catch (e) {
          // Handle FormData format
          emergencyContactObj = {
            name: req.body['emergencyContact[name]'] || "",
            relationship: req.body['emergencyContact[relationship]'] || "",
            phone: req.body['emergencyContact[phone]'] || "",
          };
        }
      } else {
        emergencyContactObj = req.body.emergencyContact;
      }
    }

    // Create patient
    const patientData = {
      name,
      dateOfBirth,
      gender,
      bloodGroup: bloodGroup || null,
      phone,
      email: email || null,
      profileImage,
      medicalHistory: medicalHistory || null,
      allergies: allergiesArray,
      chronicConditions: chronicConditionsArray,
      notes: notes || null,
      tags: tagsArray,
    };

    // Add address if provided
    if (addressObj && (addressObj.street || addressObj.village || addressObj.city || addressObj.state || addressObj.zipCode)) {
      patientData.address = {
        street: addressObj.street || "",
        village: addressObj.village || "",
        city: addressObj.city || "",
        state: addressObj.state || "",
        zipCode: addressObj.zipCode || "",
        country: addressObj.country || "India",
      };
    }

    // Add emergency contact if provided
    if (emergencyContactObj && (emergencyContactObj.name || emergencyContactObj.phone)) {
      patientData.emergencyContact = {
        name: emergencyContactObj.name || "",
        relationship: emergencyContactObj.relationship || "",
        phone: emergencyContactObj.phone || "",
      };
    }

    const patient = await Patient.create(patientData);

    // Get updated patient count
    const patientCount = await getPatientCount();

    logInfo("Patient created", {
      createdBy: req.user.id,
      newPatientId: patient._id,
      patientId: patient.patientId,
      patientCount: patientCount,
    });

    res.status(201).json({
      success: true,
      message: "Patient created successfully",
      patientCount: patientCount,
      data: { patient },
    });
  } catch (error) {
    logError("Create patient error", error, {
      createdBy: req.user?.id,
    });
    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map((err) => err.message);
      return res.status(400).json({
        success: false,
        message: messages.join(", "),
      });
    }
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "Patient ID already exists",
      });
    }
    res.status(500).json({
      success: false,
      message: "Server error. Please try again later.",
    });
  }
};

// @desc    Update patient
// @route   PUT /api/patients/:id
// @access  Private
export const updatePatient = async (req, res) => {
  try {
    const {
      name,
      dateOfBirth,
      gender,
      bloodGroup,
      phone,
      email,
      address,
      emergencyContact,
      medicalHistory,
      allergies,
      chronicConditions,
      notes,
      receptionRemarks,
      doctorRemarks,
      tags,
      status,
      statusNotes,
      isActive,
    } = req.body;

    let patient = await Patient.findById(req.params.id);

    if (!patient) {
      return res.status(404).json({
        success: false,
        message: "Patient not found",
      });
    }

    // Handle profile image upload
    if (req.file) {
      // Delete old profile image if exists
      if (patient.profileImage) {
        const oldImagePath = path.join(__dirname, "..", patient.profileImage);
        if (fs.existsSync(oldImagePath)) {
          fs.unlinkSync(oldImagePath);
        }
      }
      patient.profileImage = `/uploads/profiles/${req.file.filename}`;
    }

    // Parse allergies if it's a string
    if (allergies !== undefined) {
      if (typeof allergies === "string") {
        patient.allergies = allergies.split(",").map((a) => a.trim()).filter((a) => a);
      } else if (Array.isArray(allergies)) {
        patient.allergies = allergies;
      }
    }

    // Parse chronic conditions if it's a string
    if (chronicConditions !== undefined) {
      if (typeof chronicConditions === "string") {
        patient.chronicConditions = chronicConditions.split(",").map((c) => c.trim()).filter((c) => c);
      } else if (Array.isArray(chronicConditions)) {
        patient.chronicConditions = chronicConditions;
      }
    }

    // Parse tags if it's a string
    if (tags !== undefined) {
      if (typeof tags === "string") {
        patient.tags = tags.split(",").map((t) => t.trim()).filter((t) => t);
      } else if (Array.isArray(tags)) {
        patient.tags = tags;
      }
    }

    // Update patient fields
    if (name) patient.name = name;
    if (dateOfBirth) patient.dateOfBirth = dateOfBirth;
    if (gender) patient.gender = gender;
    if (bloodGroup !== undefined) patient.bloodGroup = bloodGroup || null;
    if (phone) patient.phone = phone;
    if (email !== undefined) patient.email = email || null;
    if (medicalHistory !== undefined) patient.medicalHistory = medicalHistory || null;
    if (notes !== undefined) patient.notes = notes || null;
    if (receptionRemarks !== undefined) patient.receptionRemarks = receptionRemarks || null;
    if (doctorRemarks !== undefined) patient.doctorRemarks = doctorRemarks || null;
    if (isActive !== undefined) patient.isActive = isActive;

    // Handle status update
    if (status && status !== patient.status) {
      patient.status = status;
      patient.statusChangedDate = new Date();
      patient.statusChangedBy = req.user.id;
      if (statusNotes !== undefined) patient.statusNotes = statusNotes || null;
    } else if (statusNotes !== undefined) {
      patient.statusNotes = statusNotes || null;
    }

    // Parse nested objects from FormData
    let addressObj = null;
    if (req.body.address !== undefined) {
      if (typeof req.body.address === 'string') {
        try {
          addressObj = JSON.parse(req.body.address);
        } catch (e) {
          // Handle FormData format
          addressObj = {
            street: req.body['address[street]'] !== undefined ? req.body['address[street]'] : patient.address?.street || "",
            village: req.body['address[village]'] !== undefined ? req.body['address[village]'] : patient.address?.village || "",
            city: req.body['address[city]'] !== undefined ? req.body['address[city]'] : patient.address?.city || "",
            state: req.body['address[state]'] !== undefined ? req.body['address[state]'] : patient.address?.state || "",
            zipCode: req.body['address[zipCode]'] !== undefined ? req.body['address[zipCode]'] : patient.address?.zipCode || "",
            country: req.body['address[country]'] !== undefined ? req.body['address[country]'] : patient.address?.country || "India",
          };
        }
      } else {
        addressObj = req.body.address;
      }
    }

    let emergencyContactObj = null;
    if (req.body.emergencyContact !== undefined) {
      if (typeof req.body.emergencyContact === 'string') {
        try {
          emergencyContactObj = JSON.parse(req.body.emergencyContact);
        } catch (e) {
          // Handle FormData format
          emergencyContactObj = {
            name: req.body['emergencyContact[name]'] !== undefined ? req.body['emergencyContact[name]'] : patient.emergencyContact?.name || "",
            relationship: req.body['emergencyContact[relationship]'] !== undefined ? req.body['emergencyContact[relationship]'] : patient.emergencyContact?.relationship || "",
            phone: req.body['emergencyContact[phone]'] !== undefined ? req.body['emergencyContact[phone]'] : patient.emergencyContact?.phone || "",
          };
        }
      } else {
        emergencyContactObj = req.body.emergencyContact;
      }
    }

    // Update address if provided
    if (addressObj) {
      patient.address = {
        street: addressObj.street || patient.address?.street || "",
        village: addressObj.village || patient.address?.village || "",
        city: addressObj.city || patient.address?.city || "",
        state: addressObj.state || patient.address?.state || "",
        zipCode: addressObj.zipCode || patient.address?.zipCode || "",
        country: addressObj.country || patient.address?.country || "India",
      };
    }

    // Update emergency contact if provided
    if (emergencyContactObj) {
      patient.emergencyContact = {
        name: emergencyContactObj.name || patient.emergencyContact?.name || "",
        relationship: emergencyContactObj.relationship || patient.emergencyContact?.relationship || "",
        phone: emergencyContactObj.phone || patient.emergencyContact?.phone || "",
      };
    }

    await patient.save();

    logInfo("Patient updated", {
      updatedBy: req.user.id,
      updatedPatientId: patient._id,
      patientId: patient.patientId,
    });

    res.status(200).json({
      success: true,
      message: "Patient updated successfully",
      data: { patient },
    });
  } catch (error) {
    logError("Update patient error", error, {
      updatedBy: req.user?.id,
      patientId: req.params.id,
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

// @desc    Delete patient
// @route   DELETE /api/patients/:id
// @access  Private
export const deletePatient = async (req, res) => {
  try {
    const patient = await Patient.findById(req.params.id);

    if (!patient) {
      return res.status(404).json({
        success: false,
        message: "Patient not found",
      });
    }

    // Delete profile image if exists
    if (patient.profileImage) {
      const imagePath = path.join(__dirname, "..", patient.profileImage);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }

    await Patient.findByIdAndDelete(req.params.id);

    logInfo("Patient deleted", {
      deletedBy: req.user.id,
      deletedPatientId: req.params.id,
      patientId: patient.patientId,
    });

    res.status(200).json({
      success: true,
      message: "Patient deleted successfully",
    });
  } catch (error) {
    logError("Delete patient error", error, {
      deletedBy: req.user?.id,
      patientId: req.params.id,
    });
    res.status(500).json({
      success: false,
      message: "Server error. Please try again later.",
    });
  }
};

// @desc    Update patient status
// @route   PATCH /api/patients/:id/status
// @access  Private
export const updatePatientStatus = async (req, res) => {
  try {
    const { status, statusNotes } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        message: "Status is required",
      });
    }

    const validStatuses = ["active", "inactive", "discharged", "transferred", "deceased", "absconded", "on-leave", "follow-up"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${validStatuses.join(", ")}`,
      });
    }

    const patient = await Patient.findById(req.params.id);

    if (!patient) {
      return res.status(404).json({
        success: false,
        message: "Patient not found",
      });
    }

    const oldStatus = patient.status;
    patient.status = status;
    patient.statusChangedDate = new Date();
    patient.statusChangedBy = req.user.id;
    if (statusNotes !== undefined) patient.statusNotes = statusNotes || null;

    await patient.save();

    logInfo("Patient status updated", {
      updatedBy: req.user.id,
      patientId: patient._id,
      oldStatus,
      newStatus: status,
    });

    res.status(200).json({
      success: true,
      message: "Patient status updated successfully",
      data: { patient },
    });
  } catch (error) {
    logError("Update patient status error", error, {
      updatedBy: req.user?.id,
      patientId: req.params.id,
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

// @desc    Get consultation summary for a patient (aggregate OPD visits)
// @route   GET /api/patients/:patientId/consultation-summary
// @access  Private
export const getConsultationSummary = async (req, res) => {
  try {
    const { patientId } = req.params;

    const opdRecords = await OPD.find({ patientId })
      .populate("doctorId", "name email role")
      .populate("createdBy", "name email")
      .sort({ visitDate: -1 });

    // Calculate summary statistics
    const totalVisits = opdRecords.length;
    const completedVisits = opdRecords.filter((opd) => opd.status === "completed").length;
    const totalBilling = opdRecords.reduce((sum, opd) => sum + (opd.totalAmount || 0), 0);
    const totalPaid = opdRecords.reduce((sum, opd) => sum + (opd.paidAmount || 0), 0);
    const pendingAmount = totalBilling - totalPaid;

    // Group by diagnosis
    const diagnosisCount = {};
    opdRecords.forEach((opd) => {
      if (opd.diagnosis) {
        diagnosisCount[opd.diagnosis] = (diagnosisCount[opd.diagnosis] || 0) + 1;
      }
    });

    // Get follow-up appointments
    const followUps = opdRecords.filter((opd) => opd.followUpRequired && opd.followUpDate);

    logInfo(`Fetched consultation summary for patient ${patientId}`);

    res.status(200).json({
      success: true,
      data: {
        summary: {
          totalVisits,
          completedVisits,
          totalBilling,
          totalPaid,
          pendingAmount,
          diagnosisCount,
          followUpsCount: followUps.length,
        },
        visits: opdRecords,
        followUps: followUps.map((opd) => ({
          opdNumber: opd.opdNumber,
          visitDate: opd.visitDate,
          followUpDate: opd.followUpDate,
          doctor: opd.doctorId,
          diagnosis: opd.diagnosis,
        })),
      },
    });
  } catch (error) {
    logError("Get consultation summary error", error, {
      patientId: req.params.patientId,
    });
    res.status(500).json({
      success: false,
      message: "Error fetching consultation summary",
      error: error.message,
    });
  }
};

// @desc    Get operative summary for a patient (aggregate OT schedules)
// @route   GET /api/patients/:patientId/operative-summary
// @access  Private
export const getOperativeSummary = async (req, res) => {
  try {
    const { patientId } = req.params;

    const otSchedules = await OTScheduler.find({ patientId })
      .populate("surgeonId", "name email role")
      .populate("anesthetistId", "name email role")
      .populate("otId", "otNumber otName otType")
      .populate("ipdId", "ipdNumber")
      .populate("createdBy", "name email")
      .sort({ scheduledDate: -1 });

    // Calculate summary statistics
    const totalOperations = otSchedules.length;
    const completedOperations = otSchedules.filter((ot) => ot.status === "completed").length;
    const scheduledOperations = otSchedules.filter((ot) => ot.status === "scheduled").length;
    const cancelledOperations = otSchedules.filter((ot) => ot.status === "cancelled").length;

    // Group by operation type
    const operationTypeCount = {};
    otSchedules.forEach((ot) => {
      if (ot.operationType) {
        operationTypeCount[ot.operationType] = (operationTypeCount[ot.operationType] || 0) + 1;
      }
    });

    logInfo(`Fetched operative summary for patient ${patientId}`);

    res.status(200).json({
      success: true,
      data: {
        summary: {
          totalOperations,
          completedOperations,
          scheduledOperations,
          cancelledOperations,
          operationTypeCount,
        },
        operations: otSchedules,
      },
    });
  } catch (error) {
    logError("Get operative summary error", error, {
      patientId: req.params.patientId,
    });
    res.status(500).json({
      success: false,
      message: "Error fetching operative summary",
      error: error.message,
    });
  }
};

// @desc    Get billing information for a patient (aggregate OPD/IPD billing)
// @route   GET /api/patients/:patientId/billing-information
// @access  Private
export const getBillingInformation = async (req, res) => {
  try {
    const { patientId } = req.params;
    const { startDate, endDate, type, paymentStatus } = req.query;

    // Build query filters
    const opdQuery = { patientId };
    const ipdQuery = { patientId };

    // Date range filter
    if (startDate || endDate) {
      if (startDate && endDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        opdQuery.visitDate = { $gte: start, $lte: end };
        ipdQuery.admissionDate = { $gte: start, $lte: end };
      } else if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        opdQuery.visitDate = { $gte: start };
        ipdQuery.admissionDate = { $gte: start };
      } else if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        opdQuery.visitDate = { $lte: end };
        ipdQuery.admissionDate = { $lte: end };
      }
    }

    // Payment status filter
    if (paymentStatus) {
      opdQuery.paymentStatus = paymentStatus;
      ipdQuery.paymentStatus = paymentStatus;
    }

    // Get OPD billing records
    let opdRecords = [];
    if (!type || type === "OPD" || type === "all") {
      opdRecords = await OPD.find(opdQuery)
        .select("opdNumber visitDate consultationFee additionalCharges labTests discount totalAmount paidAmount paymentStatus paymentMethod paymentDate status refunds creditNotes advances")
        .populate("doctorId", "name")
        .sort({ visitDate: -1 });
    }

    // Get IPD billing records
    let ipdRecords = [];
    if (!type || type === "IPD" || type === "all") {
      ipdRecords = await IPD.find(ipdQuery)
        .select("ipdNumber admissionDate dischargeDate roomCharges medicationCharges procedureCharges labCharges otherCharges discount totalAmount paidAmount paymentStatus paymentMethod paymentDate status")
        .populate("doctorId", "name")
        .populate("roomId", "roomNumber bedNumber")
        .sort({ admissionDate: -1 });
    }

    // Patient-level transactions (advance, credit notes)
    const txQuery = { patientId };
    if (startDate || endDate) {
      if (startDate && endDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        txQuery.transactionDate = { $gte: start, $lte: end };
      } else if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        txQuery.transactionDate = { $gte: start };
      } else if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        txQuery.transactionDate = { $lte: end };
      }
    }

    const patientTransactions = await PatientBillingTransaction.find(txQuery)
      .select("transactionType amount method referenceNo note transactionDate createdBy")
      .populate("createdBy", "name")
      .sort({ transactionDate: -1 });

    const advanceTotal = patientTransactions
      .filter((t) => t.transactionType === "advance")
      .reduce((sum, t) => sum + (t.amount || 0), 0);

    const creditNoteTotal = patientTransactions
      .filter((t) => t.transactionType === "credit_note")
      .reduce((sum, t) => sum + (t.amount || 0), 0);

    // Calculate OPD totals
    const opdTotal = opdRecords.reduce((sum, opd) => sum + (opd.totalAmount || 0), 0);
    const opdPaid = opdRecords.reduce((sum, opd) => sum + (opd.paidAmount || 0), 0);
    const opdPending = opdTotal - opdPaid;

    // Calculate IPD totals
    const ipdTotal = ipdRecords.reduce((sum, ipd) => sum + (ipd.totalAmount || 0), 0);
    const ipdPaid = ipdRecords.reduce((sum, ipd) => sum + (ipd.paidAmount || 0), 0);
    const ipdPending = ipdTotal - ipdPaid;

    // Overall totals
    const grandTotal = opdTotal + ipdTotal;
    const grandPaid = opdPaid + ipdPaid;
    const grandPending = Math.max(0, grandTotal - creditNoteTotal - (grandPaid + advanceTotal));

    // Payment history (combine OPD and IPD payments)
    const paymentHistory = [
      ...opdRecords
        .filter((opd) => opd.paidAmount > 0)
        .map((opd) => ({
          date: opd.paymentDate || opd.visitDate,
          type: "OPD",
          reference: opd.opdNumber,
          amount: opd.paidAmount,
          method: opd.paymentMethod,
          status: opd.paymentStatus,
        })),
      ...opdRecords
        .flatMap((opd) =>
          (opd.creditNotes || []).map((c) => ({
            date: c.issuedAt || opd.visitDate,
            type: "OPD_CREDIT_NOTE",
            reference: opd.opdNumber,
            amount: -(c.amount || 0),
            method: "credit_note",
            status: "credited",
          }))
        )
        .filter((x) => x.amount !== 0),
      ...opdRecords
        .flatMap((opd) =>
          (opd.refunds || []).map((r) => ({
            date: r.refundedAt || opd.visitDate,
            type: "OPD_REFUND",
            reference: opd.opdNumber,
            amount: -(r.amount || 0),
            method: r.method,
            status: "refunded",
          }))
        )
        .filter((x) => x.amount !== 0),
      ...ipdRecords
        .filter((ipd) => ipd.paidAmount > 0)
        .map((ipd) => ({
          date: ipd.paymentDate || ipd.admissionDate,
          type: "IPD",
          reference: ipd.ipdNumber,
          amount: ipd.paidAmount,
          method: ipd.paymentMethod,
          status: ipd.paymentStatus,
        })),
      ...patientTransactions.map((t) => ({
        date: t.transactionDate,
        type: t.transactionType === "advance" ? "ADVANCE" : "CREDIT_NOTE",
        reference: t.referenceNo || "-",
        amount: t.transactionType === "advance" ? (t.amount || 0) : -(t.amount || 0),
        method: t.method || null,
        status: t.transactionType === "advance" ? "received" : "credited",
        createdBy: t.createdBy?.name || null,
      })),
    ].sort((a, b) => new Date(b.date) - new Date(a.date));

    // Pending invoices
    const pendingInvoices = [
      ...opdRecords
        .filter((opd) => opd.paymentStatus !== "paid")
        .map((opd) => ({
          date: opd.visitDate,
          type: "OPD",
          reference: opd.opdNumber,
          totalAmount: opd.totalAmount,
          paidAmount: opd.paidAmount,
          pendingAmount: (opd.totalAmount || 0) - (opd.paidAmount || 0),
          status: opd.paymentStatus,
        })),
      ...ipdRecords
        .filter((ipd) => ipd.paymentStatus !== "paid")
        .map((ipd) => ({
          date: ipd.admissionDate,
          type: "IPD",
          reference: ipd.ipdNumber,
          totalAmount: ipd.totalAmount,
          paidAmount: ipd.paidAmount,
          pendingAmount: (ipd.totalAmount || 0) - (ipd.paidAmount || 0),
          status: ipd.paymentStatus,
        })),
    ].sort((a, b) => new Date(b.date) - new Date(a.date));

    logInfo(`Fetched billing information for patient ${patientId}`);

    res.status(200).json({
      success: true,
      data: {
        summary: {
          opd: {
            total: opdTotal,
            paid: opdPaid,
            pending: opdPending,
            count: opdRecords.length,
          },
          ipd: {
            total: ipdTotal,
            paid: ipdPaid,
            pending: ipdPending,
            count: ipdRecords.length,
          },
          overall: {
            total: grandTotal,
            paid: grandPaid,
            pending: grandPending,
            advanceTotal,
            creditNoteTotal,
          },
        },
        opdRecords: opdRecords.map(opd => ({
          _id: opd._id,
          opdNumber: opd.opdNumber,
          visitDate: opd.visitDate,
          doctorId: opd.doctorId,
          consultationFee: opd.consultationFee,
          additionalCharges: opd.additionalCharges,
          labTests: opd.labTests,
          discount: opd.discount,
          totalAmount: opd.totalAmount,
          paidAmount: opd.paidAmount,
          pendingAmount: (opd.totalAmount || 0) - (opd.paidAmount || 0),
          paymentStatus: opd.paymentStatus,
          paymentMethod: opd.paymentMethod,
          paymentDate: opd.paymentDate,
          status: opd.status,
          type: "OPD",
        })),
        ipdRecords: ipdRecords.map(ipd => ({
          _id: ipd._id,
          ipdNumber: ipd.ipdNumber,
          admissionDate: ipd.admissionDate,
          dischargeDate: ipd.dischargeDate,
          doctorId: ipd.doctorId,
          roomId: ipd.roomId,
          roomCharges: ipd.roomCharges,
          medicationCharges: ipd.medicationCharges,
          procedureCharges: ipd.procedureCharges,
          labCharges: ipd.labCharges,
          otherCharges: ipd.otherCharges,
          discount: ipd.discount,
          totalAmount: ipd.totalAmount,
          paidAmount: ipd.paidAmount,
          pendingAmount: (ipd.totalAmount || 0) - (ipd.paidAmount || 0),
          paymentStatus: ipd.paymentStatus,
          paymentMethod: ipd.paymentMethod,
          paymentDate: ipd.paymentDate,
          status: ipd.status,
          type: "IPD",
        })),
        paymentHistory,
        pendingInvoices,
        patientTransactions,
      },
    });
  } catch (error) {
    logError("Get billing information error", error, {
      patientId: req.params.patientId,
    });
    res.status(500).json({
      success: false,
      message: "Error fetching billing information",
      error: error.message,
    });
  }
};

// @desc    Process payment for multiple bills (OPD/IPD)
// @route   POST /api/patients/:patientId/process-payment
// @access  Private
export const processPayment = async (req, res) => {
  try {
    const { patientId } = req.params;
    const { bills, paymentMethod, paymentDate, notes } = req.body;

    if (!bills || !Array.isArray(bills) || bills.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Please select at least one bill to process payment",
      });
    }

    if (!paymentMethod) {
      return res.status(400).json({
        success: false,
        message: "Payment method is required",
      });
    }

    const validPaymentMethods = ["cash", "card", "upi", "cheque", "other"];
    if (!validPaymentMethods.includes(paymentMethod)) {
      return res.status(400).json({
        success: false,
        message: `Invalid payment method. Must be one of: ${validPaymentMethods.join(", ")}`,
      });
    }

    const processedBills = [];
    const errors = [];

    for (const bill of bills) {
      try {
        const { type, id, amount } = bill;

        if (!type || !id || !amount || amount <= 0) {
          errors.push({ bill: id, error: "Invalid bill data" });
          continue;
        }

        if (type === "OPD") {
          const opdRecord = await OPD.findById(id);
          if (!opdRecord || opdRecord.patientId.toString() !== patientId) {
            errors.push({ bill: id, error: "OPD record not found or doesn't belong to patient" });
            continue;
          }

          const currentPaid = opdRecord.paidAmount || 0;
          const newPaidAmount = currentPaid + amount;
          const totalAmount = opdRecord.totalAmount || 0;

          if (newPaidAmount > totalAmount) {
            errors.push({ bill: id, error: "Payment amount exceeds total amount" });
            continue;
          }

          opdRecord.paidAmount = newPaidAmount;
          opdRecord.paymentMethod = paymentMethod;
          opdRecord.paymentDate = paymentDate ? new Date(paymentDate) : new Date();

          if (newPaidAmount >= totalAmount) {
            opdRecord.paymentStatus = "paid";
          } else if (newPaidAmount > 0) {
            opdRecord.paymentStatus = "partial";
          }

          opdRecord.updatedBy = req.user.id;
          await opdRecord.save();

          processedBills.push({
            type: "OPD",
            id: opdRecord._id,
            reference: opdRecord.opdNumber,
            amount: amount,
            totalAmount: totalAmount,
            paidAmount: newPaidAmount,
            paymentStatus: opdRecord.paymentStatus,
          });
        } else if (type === "IPD") {
          const ipdRecord = await IPD.findById(id);
          if (!ipdRecord || ipdRecord.patientId.toString() !== patientId) {
            errors.push({ bill: id, error: "IPD record not found or doesn't belong to patient" });
            continue;
          }

          const currentPaid = ipdRecord.paidAmount || 0;
          const newPaidAmount = currentPaid + amount;
          const totalAmount = ipdRecord.totalAmount || 0;

          if (newPaidAmount > totalAmount) {
            errors.push({ bill: id, error: "Payment amount exceeds total amount" });
            continue;
          }

          ipdRecord.paidAmount = newPaidAmount;
          ipdRecord.paymentMethod = paymentMethod;
          ipdRecord.paymentDate = paymentDate ? new Date(paymentDate) : new Date();

          if (newPaidAmount >= totalAmount) {
            ipdRecord.paymentStatus = "paid";
          } else if (newPaidAmount > 0) {
            ipdRecord.paymentStatus = "partial";
          }

          ipdRecord.updatedBy = req.user.id;
          await ipdRecord.save();

          processedBills.push({
            type: "IPD",
            id: ipdRecord._id,
            reference: ipdRecord.ipdNumber,
            amount: amount,
            totalAmount: totalAmount,
            paidAmount: newPaidAmount,
            paymentStatus: ipdRecord.paymentStatus,
          });
        } else {
          errors.push({ bill: id, error: "Invalid bill type" });
        }
      } catch (error) {
        errors.push({ bill: bill.id, error: error.message });
      }
    }

    if (processedBills.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No bills were processed",
        errors,
      });
    }

    const totalPaid = processedBills.reduce((sum, bill) => sum + bill.amount, 0);

    logInfo("Payment processed", {
      processedBy: req.user.id,
      patientId,
      billsProcessed: processedBills.length,
      totalAmount: totalPaid,
      paymentMethod,
    });

    res.status(200).json({
      success: true,
      message: `Payment processed for ${processedBills.length} bill(s)`,
      data: {
        processedBills,
        totalPaid,
        paymentMethod,
        paymentDate: paymentDate || new Date(),
        errors: errors.length > 0 ? errors : undefined,
      },
    });
  } catch (error) {
    logError("Process payment error", error, {
      patientId: req.params.patientId,
      processedBy: req.user?.id,
    });
    res.status(500).json({
      success: false,
      message: "Error processing payment",
      error: error.message,
    });
  }
};

// @desc    Add patient-level billing transaction (advance / credit note)
// @route   POST /api/patients/:patientId/billing/transactions
// @access  Private
export const addPatientBillingTransaction = async (req, res) => {
  try {
    const { patientId } = req.params;
    const { transactionType, amount, method, referenceNo, note, transactionDate } = req.body;

    if (!transactionType || !["advance", "credit_note"].includes(transactionType)) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid transactionType (advance, credit_note)",
      });
    }

    const amt = Number(amount);
    if (!amt || Number.isNaN(amt) || amt <= 0) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid amount",
      });
    }

    const tx = await PatientBillingTransaction.create({
      patientId,
      transactionType,
      amount: amt,
      method: method || "cash",
      referenceNo: referenceNo || null,
      note: note || null,
      transactionDate: transactionDate ? new Date(transactionDate) : new Date(),
      createdBy: req.user?.id || null,
    });

    const populated = await PatientBillingTransaction.findById(tx._id).populate("createdBy", "name");

    res.status(201).json({
      success: true,
      message: "Transaction added successfully",
      data: { transaction: populated },
    });
  } catch (error) {
    logError("Add patient billing transaction error", error, {
      patientId: req.params.patientId,
      userId: req.user?.id,
    });
    res.status(500).json({
      success: false,
      message: "Error adding transaction",
      error: error.message,
    });
  }
};

// @desc    Get patient-level billing transactions
// @route   GET /api/patients/:patientId/billing/transactions
// @access  Private
export const getPatientBillingTransactions = async (req, res) => {
  try {
    const { patientId } = req.params;
    const { startDate, endDate, transactionType } = req.query;

    const query = { patientId };
    if (transactionType && ["advance", "credit_note"].includes(transactionType)) {
      query.transactionType = transactionType;
    }

    if (startDate || endDate) {
      if (startDate && endDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.transactionDate = { $gte: start, $lte: end };
      } else if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        query.transactionDate = { $gte: start };
      } else if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.transactionDate = { $lte: end };
      }
    }

    const transactions = await PatientBillingTransaction.find(query)
      .populate("createdBy", "name")
      .sort({ transactionDate: -1 });

    res.status(200).json({
      success: true,
      data: { transactions, count: transactions.length },
    });
  } catch (error) {
    logError("Get patient billing transactions error", error, {
      patientId: req.params.patientId,
      userId: req.user?.id,
    });
    res.status(500).json({
      success: false,
      message: "Error fetching transactions",
      error: error.message,
    });
  }
};
