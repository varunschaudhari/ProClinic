import Ward from "../models/Ward.js";
import Room from "../models/Room.js";
import IPD from "../models/IPD.js";
import { logInfo, logError } from "../config/logger.js";

// @desc    Get all wards
// @route   GET /api/wards
// @access  Private
export const getWards = async (req, res) => {
  try {
    const { wardType, floor, isActive, inCharge } = req.query;

    const query = {};
    if (wardType) query.wardType = wardType;
    if (floor) query.floor = floor;
    if (isActive !== undefined) query.isActive = isActive === "true";
    if (inCharge) query.inCharge = inCharge;

    const wards = await Ward.find(query)
      .populate("inCharge", "name email")
      .populate("createdBy", "name email")
      .sort({ wardName: 1 });

    // Calculate real-time statistics for each ward
    const wardsWithStats = await Promise.all(
      wards.map(async (ward) => {
        // Count rooms in this ward
        const rooms = await Room.find({ ward: ward.wardName });
        const totalRooms = rooms.length;
        
        // Count beds
        let totalBeds = 0;
        let occupiedBeds = 0;
        let availableBeds = 0;
        
        rooms.forEach((room) => {
          totalBeds += room.beds.length;
          room.beds.forEach((bed) => {
            if (bed.status === "occupied") occupiedBeds++;
            else if (bed.status === "available") availableBeds++;
          });
        });

        // Count current IPD admissions in this ward
        const currentAdmissions = await IPD.countDocuments({
          roomId: { $in: rooms.map((r) => r._id) },
          status: { $in: ["admitted", "under-treatment"] },
        });

        return {
          ...ward.toObject(),
          stats: {
            totalRooms,
            totalBeds,
            occupiedBeds,
            availableBeds,
            currentAdmissions,
            occupancyRate: totalBeds > 0 ? ((occupiedBeds / totalBeds) * 100).toFixed(2) : "0",
          },
        };
      })
    );

    logInfo("Wards fetched", {
      userId: req.user.id,
      count: wards.length,
    });

    res.status(200).json({
      success: true,
      count: wards.length,
      data: { wards: wardsWithStats },
    });
  } catch (error) {
    logError("Get wards error", error, {
      userId: req.user?.id,
    });
    res.status(500).json({
      success: false,
      message: "Server error. Please try again later.",
    });
  }
};

// @desc    Get single ward
// @route   GET /api/wards/:id
// @access  Private
export const getWard = async (req, res) => {
  try {
    const ward = await Ward.findById(req.params.id)
      .populate("inCharge", "name email phone designation")
      .populate("createdBy", "name email")
      .populate("updatedBy", "name email");

    if (!ward) {
      return res.status(404).json({
        success: false,
        message: "Ward not found",
      });
    }

    // Get rooms in this ward
    const rooms = await Room.find({ ward: ward.wardName })
      .populate("beds.currentPatientId", "patientId ipdNumber")
      .sort({ roomNumber: 1 });

    // Calculate statistics
    let totalBeds = 0;
    let occupiedBeds = 0;
    let availableBeds = 0;
    let maintenanceBeds = 0;

    rooms.forEach((room) => {
      totalBeds += room.beds.length;
      room.beds.forEach((bed) => {
        if (bed.status === "occupied") occupiedBeds++;
        else if (bed.status === "available") availableBeds++;
        else if (bed.status === "maintenance") maintenanceBeds++;
      });
    });

    const currentAdmissions = await IPD.countDocuments({
      roomId: { $in: rooms.map((r) => r._id) },
      status: { $in: ["admitted", "under-treatment"] },
    });

    const wardWithStats = {
      ...ward.toObject(),
      rooms,
      stats: {
        totalRooms: rooms.length,
        totalBeds,
        occupiedBeds,
        availableBeds,
        maintenanceBeds,
        currentAdmissions,
        occupancyRate: totalBeds > 0 ? ((occupiedBeds / totalBeds) * 100).toFixed(2) : "0",
      },
    };

    res.status(200).json({
      success: true,
      data: { ward: wardWithStats },
    });
  } catch (error) {
    logError("Get ward error", error, {
      userId: req.user?.id,
      wardId: req.params.id,
    });
    res.status(500).json({
      success: false,
      message: "Server error. Please try again later.",
    });
  }
};

// @desc    Create ward
// @route   POST /api/wards
// @access  Private
export const createWard = async (req, res) => {
  try {
    const {
      wardName,
      wardCode,
      wardType,
      floor,
      description,
      capacity,
      inCharge,
      notes,
    } = req.body;

    if (!wardName || !wardType) {
      return res.status(400).json({
        success: false,
        message: "Please provide ward name and ward type",
      });
    }

    // Check if ward name already exists
    const existingWard = await Ward.findOne({ wardName });
    if (existingWard) {
      return res.status(400).json({
        success: false,
        message: `Ward with name "${wardName}" already exists`,
      });
    }

    // Check if ward code already exists (if provided)
    if (wardCode) {
      const existingCode = await Ward.findOne({ wardCode });
      if (existingCode) {
        return res.status(400).json({
          success: false,
          message: `Ward code "${wardCode}" already exists`,
        });
      }
    }

    // Validate in-charge if provided
    if (inCharge) {
      const User = (await import("../models/User.js")).default;
      const user = await User.findById(inCharge);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: "In-charge user not found",
        });
      }
    }

    const ward = await Ward.create({
      wardName,
      wardCode: wardCode || null,
      wardType,
      floor: floor || null,
      description: description || null,
      capacity: capacity || 0,
      currentOccupancy: 0,
      inCharge: inCharge || null,
      notes: notes || null,
      createdBy: req.user.id,
    });

    logInfo("Ward created", {
      createdBy: req.user.id,
      wardId: ward._id,
      wardName: ward.wardName,
    });

    res.status(201).json({
      success: true,
      message: "Ward created successfully",
      data: { ward },
    });
  } catch (error) {
    logError("Create ward error", error, {
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
        message: "Ward name or code already exists",
      });
    }
    res.status(500).json({
      success: false,
      message: "Server error. Please try again later.",
    });
  }
};

// @desc    Update ward
// @route   PUT /api/wards/:id
// @access  Private
export const updateWard = async (req, res) => {
  try {
    const {
      wardName,
      wardCode,
      wardType,
      floor,
      description,
      capacity,
      inCharge,
      notes,
      isActive,
    } = req.body;

    const ward = await Ward.findById(req.params.id);

    if (!ward) {
      return res.status(404).json({
        success: false,
        message: "Ward not found",
      });
    }

    // Check if new ward name conflicts with existing ward
    if (wardName && wardName !== ward.wardName) {
      const existingWard = await Ward.findOne({ wardName });
      if (existingWard) {
        return res.status(400).json({
          success: false,
          message: `Ward with name "${wardName}" already exists`,
        });
      }
    }

    // Check if new ward code conflicts
    if (wardCode && wardCode !== ward.wardCode) {
      const existingCode = await Ward.findOne({ wardCode });
      if (existingCode) {
        return res.status(400).json({
          success: false,
          message: `Ward code "${wardCode}" already exists`,
        });
      }
    }

    // Validate in-charge if provided
    if (inCharge && inCharge !== ward.inCharge?.toString()) {
      const User = (await import("../models/User.js")).default;
      const user = await User.findById(inCharge);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: "In-charge user not found",
        });
      }
    }

    // Update fields
    if (wardName) ward.wardName = wardName;
    if (wardCode !== undefined) ward.wardCode = wardCode || null;
    if (wardType) ward.wardType = wardType;
    if (floor !== undefined) ward.floor = floor || null;
    if (description !== undefined) ward.description = description || null;
    if (capacity !== undefined) ward.capacity = capacity;
    if (inCharge !== undefined) ward.inCharge = inCharge || null;
    if (notes !== undefined) ward.notes = notes || null;
    if (isActive !== undefined) ward.isActive = isActive;

    ward.updatedBy = req.user.id;
    await ward.save();

    // Update ward name in all rooms if ward name changed
    if (wardName && wardName !== req.body.oldWardName) {
      await Room.updateMany(
        { ward: req.body.oldWardName || ward.wardName },
        { ward: wardName }
      );
    }

    logInfo("Ward updated", {
      updatedBy: req.user.id,
      wardId: ward._id,
    });

    res.status(200).json({
      success: true,
      message: "Ward updated successfully",
      data: { ward },
    });
  } catch (error) {
    logError("Update ward error", error, {
      updatedBy: req.user?.id,
      wardId: req.params.id,
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
        message: "Ward name or code already exists",
      });
    }
    res.status(500).json({
      success: false,
      message: "Server error. Please try again later.",
    });
  }
};

// @desc    Delete ward
// @route   DELETE /api/wards/:id
// @access  Private
export const deleteWard = async (req, res) => {
  try {
    const ward = await Ward.findById(req.params.id);

    if (!ward) {
      return res.status(404).json({
        success: false,
        message: "Ward not found",
      });
    }

    // Check if ward has rooms
    const roomsInWard = await Room.countDocuments({ ward: ward.wardName });
    if (roomsInWard > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete ward "${ward.wardName}" as it has ${roomsInWard} room(s) assigned. Please reassign or remove rooms first.`,
      });
    }

    await Ward.findByIdAndDelete(req.params.id);

    logInfo("Ward deleted", {
      deletedBy: req.user.id,
      wardId: req.params.id,
    });

    res.status(200).json({
      success: true,
      message: "Ward deleted successfully",
    });
  } catch (error) {
    logError("Delete ward error", error, {
      deletedBy: req.user?.id,
      wardId: req.params.id,
    });
    res.status(500).json({
      success: false,
      message: "Server error. Please try again later.",
    });
  }
};

// @desc    Get ward statistics
// @route   GET /api/wards/stats
// @access  Private
export const getWardStats = async (req, res) => {
  try {
    const { wardType } = req.query;
    const query = { isActive: true };
    if (wardType) query.wardType = wardType;

    const wards = await Ward.find(query);
    
    let totalWards = wards.length;
    let totalCapacity = 0;
    let totalOccupancy = 0;
    let wardsByType = {};

    for (const ward of wards) {
      totalCapacity += ward.capacity || 0;
      totalOccupancy += ward.currentOccupancy || 0;
      
      if (!wardsByType[ward.wardType]) {
        wardsByType[ward.wardType] = 0;
      }
      wardsByType[ward.wardType]++;
    }

    const overallOccupancyRate = totalCapacity > 0 
      ? ((totalOccupancy / totalCapacity) * 100).toFixed(2) 
      : "0";

    const stats = {
      totalWards,
      totalCapacity,
      totalOccupancy,
      overallOccupancyRate,
      wardsByType,
    };

    logInfo("Ward stats fetched", {
      userId: req.user.id,
      filters: query,
    });

    res.status(200).json({
      success: true,
      data: { stats },
    });
  } catch (error) {
    logError("Get ward stats error", error, {
      userId: req.user?.id,
    });
    res.status(500).json({
      success: false,
      message: "Server error. Please try again later.",
    });
  }
};
