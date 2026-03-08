import OperationTheater from "../models/OperationTheater.js";
import { logInfo, logError } from "../config/logger.js";

// @desc    Get all operation theaters
// @route   GET /api/ot
// @access  Private
export const getOperationTheaters = async (req, res) => {
  try {
    const { otType, floor, ward, isActive, otComplexId } = req.query;

    const query = {};
    if (otType) query.otType = otType;
    if (floor) query.floor = floor;
    if (ward) query.ward = ward;
    if (isActive !== undefined) query.isActive = isActive === "true";
    if (otComplexId) query.otComplexId = otComplexId;

    const operationTheaters = await OperationTheater.find(query)
      .populate("createdBy", "name email")
      .populate("otComplexId", "complexCode complexName")
      .sort({ otNumber: 1 });

    logInfo("Operation theaters fetched", {
      userId: req.user.id,
      count: operationTheaters.length,
    });

    res.status(200).json({
      success: true,
      count: operationTheaters.length,
      data: { operationTheaters },
    });
  } catch (error) {
    logError("Get operation theaters error", error, {
      userId: req.user?.id,
    });
    res.status(500).json({
      success: false,
      message: "Server error. Please try again later.",
    });
  }
};

// @desc    Get single operation theater
// @route   GET /api/ot/:id
// @access  Private
export const getOperationTheater = async (req, res) => {
  try {
    const operationTheater = await OperationTheater.findById(req.params.id)
      .populate("createdBy", "name email")
      .populate("updatedBy", "name email")
      .populate("otComplexId", "complexCode complexName location floor building");

    if (!operationTheater) {
      return res.status(404).json({
        success: false,
        message: "Operation theater not found",
      });
    }

    res.status(200).json({
      success: true,
      data: { operationTheater },
    });
  } catch (error) {
    logError("Get operation theater error", error, {
      userId: req.user?.id,
      otId: req.params.id,
    });
    res.status(500).json({
      success: false,
      message: "Server error. Please try again later.",
    });
  }
};

// @desc    Create operation theater
// @route   POST /api/ot
// @access  Private
export const createOperationTheater = async (req, res) => {
  try {
    const {
      otNumber,
      otName,
      otComplexId,
      otType,
      floor,
      ward,
      capacity,
      equipment,
      amenities,
      notes,
    } = req.body;

    if (!otNumber || !otName || !otType) {
      return res.status(400).json({
        success: false,
        message: "Please provide OT number, name, and type",
      });
    }

    // Check if OT number already exists
    const existingOT = await OperationTheater.findOne({ otNumber: otNumber.toUpperCase() });
    if (existingOT) {
      return res.status(400).json({
        success: false,
        message: `Operation theater with number ${otNumber} already exists`,
      });
    }

    // Validate OT Complex if provided
    if (otComplexId) {
      const OTComplex = (await import("../models/OTComplex.js")).default;
      const complex = await OTComplex.findById(otComplexId);
      if (!complex) {
        return res.status(404).json({
          success: false,
          message: "OT complex not found",
        });
      }
    }

    const operationTheater = await OperationTheater.create({
      otNumber: otNumber.toUpperCase(),
      otName,
      otComplexId: otComplexId || null,
      otType,
      floor: floor || null,
      ward: ward || null,
      capacity: capacity || 1,
      equipment: equipment || [],
      amenities: amenities || [],
      notes: notes || null,
      createdBy: req.user.id,
    });

    logInfo("Operation theater created", {
      createdBy: req.user.id,
      otId: operationTheater._id,
      otNumber: operationTheater.otNumber,
    });

    res.status(201).json({
      success: true,
      message: "Operation theater created successfully",
      data: { operationTheater },
    });
  } catch (error) {
    logError("Create operation theater error", error, {
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
        message: "Operation theater number already exists",
      });
    }
    res.status(500).json({
      success: false,
      message: "Server error. Please try again later.",
    });
  }
};

// @desc    Update operation theater
// @route   PUT /api/ot/:id
// @access  Private
export const updateOperationTheater = async (req, res) => {
  try {
    const {
      otNumber,
      otName,
      otComplexId,
      otType,
      floor,
      ward,
      capacity,
      equipment,
      amenities,
      notes,
      isActive,
    } = req.body;

    const operationTheater = await OperationTheater.findById(req.params.id);

    if (!operationTheater) {
      return res.status(404).json({
        success: false,
        message: "Operation theater not found",
      });
    }

    // Check if new OT number conflicts
    if (otNumber && otNumber.toUpperCase() !== operationTheater.otNumber) {
      const existingOT = await OperationTheater.findOne({ otNumber: otNumber.toUpperCase() });
      if (existingOT) {
        return res.status(400).json({
          success: false,
          message: `Operation theater with number ${otNumber} already exists`,
        });
      }
    }

    // Validate OT Complex if provided
    if (otComplexId !== undefined) {
      if (otComplexId) {
        const OTComplex = (await import("../models/OTComplex.js")).default;
        const complex = await OTComplex.findById(otComplexId);
        if (!complex) {
          return res.status(404).json({
            success: false,
            message: "OT complex not found",
          });
        }
      }
      operationTheater.otComplexId = otComplexId || null;
    }

    // Update fields
    if (otNumber) operationTheater.otNumber = otNumber.toUpperCase();
    if (otName) operationTheater.otName = otName;
    if (otType) operationTheater.otType = otType;
    if (floor !== undefined) operationTheater.floor = floor || null;
    if (ward !== undefined) operationTheater.ward = ward || null;
    if (capacity !== undefined) operationTheater.capacity = capacity;
    if (equipment !== undefined) operationTheater.equipment = equipment;
    if (amenities !== undefined) operationTheater.amenities = amenities;
    if (notes !== undefined) operationTheater.notes = notes || null;
    if (isActive !== undefined) operationTheater.isActive = isActive;

    operationTheater.updatedBy = req.user.id;
    await operationTheater.save();

    logInfo("Operation theater updated", {
      updatedBy: req.user.id,
      otId: operationTheater._id,
    });

    res.status(200).json({
      success: true,
      message: "Operation theater updated successfully",
      data: { operationTheater },
    });
  } catch (error) {
    logError("Update operation theater error", error, {
      updatedBy: req.user?.id,
      otId: req.params.id,
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
        message: "Operation theater number already exists",
      });
    }
    res.status(500).json({
      success: false,
      message: "Server error. Please try again later.",
    });
  }
};

// @desc    Delete operation theater
// @route   DELETE /api/ot/:id
// @access  Private
export const deleteOperationTheater = async (req, res) => {
  try {
    const operationTheater = await OperationTheater.findById(req.params.id);

    if (!operationTheater) {
      return res.status(404).json({
        success: false,
        message: "Operation theater not found",
      });
    }

    // Check if OT has scheduled operations
    const OTScheduler = (await import("../models/OTScheduler.js")).default;
    const scheduledOps = await OTScheduler.countDocuments({
      otId: req.params.id,
      status: { $in: ["scheduled", "in-progress"] },
    });

    if (scheduledOps > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete operation theater as it has ${scheduledOps} scheduled operation(s). Please cancel or complete them first.`,
      });
    }

    await OperationTheater.findByIdAndDelete(req.params.id);

    logInfo("Operation theater deleted", {
      deletedBy: req.user.id,
      otId: req.params.id,
    });

    res.status(200).json({
      success: true,
      message: "Operation theater deleted successfully",
    });
  } catch (error) {
    logError("Delete operation theater error", error, {
      deletedBy: req.user?.id,
      otId: req.params.id,
    });
    res.status(500).json({
      success: false,
      message: "Server error. Please try again later.",
    });
  }
};
