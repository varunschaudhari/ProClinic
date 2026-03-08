import Document from "../models/Document.js";
import Patient from "../models/Patient.js";
import { logInfo, logError } from "../config/logger.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// @desc    Get all documents for a patient
// @route   GET /api/documents/patient/:patientId
// @access  Private
export const getPatientDocuments = async (req, res) => {
  try {
    const documents = await Document.find({ patientId: req.params.patientId })
      .sort({ uploadDate: -1 })
      .populate("uploadedBy", "name email");

    logInfo("Patient documents fetched", {
      userId: req.user.id,
      patientId: req.params.patientId,
      count: documents.length,
    });

    res.status(200).json({
      success: true,
      count: documents.length,
      data: { documents },
    });
  } catch (error) {
    logError("Get patient documents error", error, {
      userId: req.user?.id,
      patientId: req.params.patientId,
    });
    res.status(500).json({
      success: false,
      message: "Server error. Please try again later.",
    });
  }
};

// @desc    Get single document
// @route   GET /api/documents/:id
// @access  Private
export const getDocument = async (req, res) => {
  try {
    const document = await Document.findById(req.params.id).populate(
      "uploadedBy",
      "name email"
    );

    if (!document) {
      return res.status(404).json({
        success: false,
        message: "Document not found",
      });
    }

    res.status(200).json({
      success: true,
      data: { document },
    });
  } catch (error) {
    logError("Get document error", error, {
      userId: req.user?.id,
      documentId: req.params.id,
    });
    res.status(500).json({
      success: false,
      message: "Server error. Please try again later.",
    });
  }
};

// @desc    Create document
// @route   POST /api/documents
// @access  Private
export const createDocument = async (req, res) => {
  try {
    const { patientId, documentType, title, description } = req.body;

    // Validate patient exists
    const patient = await Patient.findById(patientId);
    if (!patient) {
      return res.status(404).json({
        success: false,
        message: "Patient not found",
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Please upload a file",
      });
    }

    const document = await Document.create({
      patientId,
      documentType: documentType || "Report",
      title: title || req.file.originalname,
      description: description || null,
      filePath: `/uploads/documents/${req.file.filename}`,
      fileName: req.file.originalname,
      fileSize: req.file.size,
      mimeType: req.file.mimetype,
      uploadedBy: req.user.id,
    });

    logInfo("Document created", {
      createdBy: req.user.id,
      documentId: document._id,
      patientId: patientId,
    });

    res.status(201).json({
      success: true,
      message: "Document uploaded successfully",
      data: { document },
    });
  } catch (error) {
    logError("Create document error", error, {
      createdBy: req.user?.id,
      patientId: req.body.patientId,
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

// @desc    Update document metadata
// @route   PUT /api/documents/:id
// @access  Private
export const updateDocument = async (req, res) => {
  try {
    const { documentType, title, description } = req.body;

    const document = await Document.findById(req.params.id);

    if (!document) {
      return res.status(404).json({
        success: false,
        message: "Document not found",
      });
    }

    // Update document fields
    if (documentType) document.documentType = documentType;
    if (title) document.title = title;
    if (description !== undefined) document.description = description || null;

    await document.save();

    logInfo("Document updated", {
      updatedBy: req.user.id,
      documentId: document._id,
    });

    res.status(200).json({
      success: true,
      message: "Document updated successfully",
      data: { document },
    });
  } catch (error) {
    logError("Update document error", error, {
      updatedBy: req.user?.id,
      documentId: req.params.id,
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

// @desc    Delete document
// @route   DELETE /api/documents/:id
// @access  Private
export const deleteDocument = async (req, res) => {
  try {
    const document = await Document.findById(req.params.id);

    if (!document) {
      return res.status(404).json({
        success: false,
        message: "Document not found",
      });
    }

    // Delete physical file
    const filePath = path.join(__dirname, "..", document.filePath);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    await Document.findByIdAndDelete(req.params.id);

    logInfo("Document deleted", {
      deletedBy: req.user.id,
      documentId: req.params.id,
    });

    res.status(200).json({
      success: true,
      message: "Document deleted successfully",
    });
  } catch (error) {
    logError("Delete document error", error, {
      deletedBy: req.user?.id,
      documentId: req.params.id,
    });
    res.status(500).json({
      success: false,
      message: "Server error. Please try again later.",
    });
  }
};
