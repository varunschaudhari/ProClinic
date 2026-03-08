import Patient from "../models/Patient.js";
import Sequence from "../models/Sequence.js";
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

    logInfo("Patients fetched", {
      userId: req.user.id,
      count: patients.length,
      patientCount: patientCount,
      filters: { status, isActive, search },
    });

    res.status(200).json({
      success: true,
      count: patients.length,
      patientCount: patientCount, // Total patient count from sequence
      data: { patients },
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

    res.status(200).json({
      success: true,
      data: { patient },
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
