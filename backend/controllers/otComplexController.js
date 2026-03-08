import OTComplex from "../models/OTComplex.js";
import OperationTheater from "../models/OperationTheater.js";
import { logInfo, logError } from "../config/logger.js";

// @desc    Get all OT complexes
// @route   GET /api/ot/complexes
// @access  Private
export const getOTComplexes = async (req, res) => {
  try {
    const { isActive } = req.query;

    const query = {};
    if (isActive !== undefined) query.isActive = isActive === "true";

    const complexes = await OTComplex.find(query)
      .populate("createdBy", "name email")
      .sort({ complexCode: 1 });

    // Populate OT count for each complex
    const complexesWithOTCount = await Promise.all(
      complexes.map(async (complex) => {
        const otCount = await OperationTheater.countDocuments({
          otComplexId: complex._id,
        });
        return {
          ...complex.toObject(),
          otCount,
        };
      })
    );

    logInfo("OT complexes fetched", {
      userId: req.user.id,
      count: complexesWithOTCount.length,
    });

    res.status(200).json({
      success: true,
      count: complexesWithOTCount.length,
      data: { complexes: complexesWithOTCount },
    });
  } catch (error) {
    logError("Get OT complexes error", error, {
      userId: req.user?.id,
    });
    res.status(500).json({
      success: false,
      message: "Server error. Please try again later.",
    });
  }
};

// @desc    Get single OT complex with OTs
// @route   GET /api/ot/complexes/:id
// @access  Private
export const getOTComplex = async (req, res) => {
  try {
    const complex = await OTComplex.findById(req.params.id)
      .populate("createdBy", "name email")
      .populate("updatedBy", "name email");

    if (!complex) {
      return res.status(404).json({
        success: false,
        message: "OT complex not found",
      });
    }

    // Get all OTs in this complex
    const ots = await OperationTheater.find({ otComplexId: complex._id })
      .populate("createdBy", "name email")
      .sort({ otNumber: 1 });

    const complexWithOTs = {
      ...complex.toObject(),
      ots,
      otCount: ots.length,
    };

    res.status(200).json({
      success: true,
      data: { complex: complexWithOTs },
    });
  } catch (error) {
    logError("Get OT complex error", error, {
      userId: req.user?.id,
      complexId: req.params.id,
    });
    res.status(500).json({
      success: false,
      message: "Server error. Please try again later.",
    });
  }
};

// @desc    Create OT complex
// @route   POST /api/ot/complexes
// @access  Private
export const createOTComplex = async (req, res) => {
  try {
    const { complexCode, complexName, location, floor, building, description, notes } = req.body;

    if (!complexCode || !complexName) {
      return res.status(400).json({
        success: false,
        message: "Please provide complex code and name",
      });
    }

    // Check if complex code already exists
    const existingComplex = await OTComplex.findOne({ complexCode: complexCode.toUpperCase() });
    if (existingComplex) {
      return res.status(400).json({
        success: false,
        message: `OT complex with code ${complexCode} already exists`,
      });
    }

    const complex = await OTComplex.create({
      complexCode: complexCode.toUpperCase(),
      complexName,
      location: location || null,
      floor: floor || null,
      building: building || null,
      description: description || null,
      notes: notes || null,
      createdBy: req.user.id,
    });

    logInfo("OT complex created", {
      createdBy: req.user.id,
      complexId: complex._id,
      complexCode: complex.complexCode,
    });

    res.status(201).json({
      success: true,
      message: "OT complex created successfully",
      data: { complex },
    });
  } catch (error) {
    logError("Create OT complex error", error, {
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
        message: "OT complex code already exists",
      });
    }
    res.status(500).json({
      success: false,
      message: "Server error. Please try again later.",
    });
  }
};

// @desc    Update OT complex
// @route   PUT /api/ot/complexes/:id
// @access  Private
export const updateOTComplex = async (req, res) => {
  try {
    const { complexCode, complexName, location, floor, building, description, notes, isActive } = req.body;

    const complex = await OTComplex.findById(req.params.id);

    if (!complex) {
      return res.status(404).json({
        success: false,
        message: "OT complex not found",
      });
    }

    // Check if new complex code conflicts
    if (complexCode && complexCode.toUpperCase() !== complex.complexCode) {
      const existingComplex = await OTComplex.findOne({ complexCode: complexCode.toUpperCase() });
      if (existingComplex) {
        return res.status(400).json({
          success: false,
          message: `OT complex with code ${complexCode} already exists`,
        });
      }
    }

    // Update fields
    if (complexCode) complex.complexCode = complexCode.toUpperCase();
    if (complexName) complex.complexName = complexName;
    if (location !== undefined) complex.location = location || null;
    if (floor !== undefined) complex.floor = floor || null;
    if (building !== undefined) complex.building = building || null;
    if (description !== undefined) complex.description = description || null;
    if (notes !== undefined) complex.notes = notes || null;
    if (isActive !== undefined) complex.isActive = isActive;

    complex.updatedBy = req.user.id;
    await complex.save();

    logInfo("OT complex updated", {
      updatedBy: req.user.id,
      complexId: complex._id,
    });

    res.status(200).json({
      success: true,
      message: "OT complex updated successfully",
      data: { complex },
    });
  } catch (error) {
    logError("Update OT complex error", error, {
      updatedBy: req.user?.id,
      complexId: req.params.id,
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
        message: "OT complex code already exists",
      });
    }
    res.status(500).json({
      success: false,
      message: "Server error. Please try again later.",
    });
  }
};

// @desc    Delete OT complex
// @route   DELETE /api/ot/complexes/:id
// @access  Private
export const deleteOTComplex = async (req, res) => {
  try {
    const complex = await OTComplex.findById(req.params.id);

    if (!complex) {
      return res.status(404).json({
        success: false,
        message: "OT complex not found",
      });
    }

    // Check if complex has OTs
    const otCount = await OperationTheater.countDocuments({ otComplexId: req.params.id });
    if (otCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete OT complex as it has ${otCount} operation theater(s). Please remove or reassign them first.`,
      });
    }

    await OTComplex.findByIdAndDelete(req.params.id);

    logInfo("OT complex deleted", {
      deletedBy: req.user.id,
      complexId: req.params.id,
    });

    res.status(200).json({
      success: true,
      message: "OT complex deleted successfully",
    });
  } catch (error) {
    logError("Delete OT complex error", error, {
      deletedBy: req.user?.id,
      complexId: req.params.id,
    });
    res.status(500).json({
      success: false,
      message: "Server error. Please try again later.",
    });
  }
};
