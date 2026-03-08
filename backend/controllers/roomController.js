import Room from "../models/Room.js";
import IPD from "../models/IPD.js";
import { logInfo, logError } from "../config/logger.js";

// @desc    Get all rooms
// @route   GET /api/rooms
// @access  Private
export const getRooms = async (req, res) => {
  try {
    const { roomType, floor, ward, status } = req.query;

    const query = {};

    if (roomType) query.roomType = roomType;
    if (floor) query.floor = floor;
    if (ward) query.ward = ward;
    if (status) {
      // Filter by bed status
      query["beds.status"] = status;
    }

    const rooms = await Room.find(query).sort({ roomNumber: 1 });

    // Get occupancy statistics for each room
    const roomsWithStats = await Promise.all(
      rooms.map(async (room) => {
        const occupiedBeds = room.beds.filter((bed) => bed.status === "occupied").length;
        const availableBeds = room.beds.filter((bed) => bed.status === "available").length;
        const maintenanceBeds = room.beds.filter((bed) => bed.status === "maintenance").length;

        // Get current patients in this room
        const currentPatients = await IPD.find({
          roomId: room._id,
          status: { $in: ["admitted", "under-treatment"] },
        })
          .populate("patientId", "name patientId")
          .select("patientId bedNumber _id");

        return {
          ...room.toObject(),
          stats: {
            total: room.beds.length,
            occupied: occupiedBeds,
            available: availableBeds,
            maintenance: maintenanceBeds,
            occupancyRate: room.beds.length > 0 ? ((occupiedBeds / room.beds.length) * 100).toFixed(2) : "0",
          },
          currentPatients: currentPatients.map((ipd) => ({
            ipdId: ipd._id,
            patientId: ipd.patientId,
            bedNumber: ipd.bedNumber,
          })),
        };
      })
    );

    logInfo("Rooms fetched", {
      userId: req.user.id,
      count: rooms.length,
    });

    res.status(200).json({
      success: true,
      count: rooms.length,
      data: { rooms: roomsWithStats },
    });
  } catch (error) {
    logError("Get rooms error", error, {
      userId: req.user?.id,
    });
    res.status(500).json({
      success: false,
      message: "Server error. Please try again later.",
    });
  }
};

// @desc    Get single room
// @route   GET /api/rooms/:id
// @access  Private
export const getRoom = async (req, res) => {
  try {
    const room = await Room.findById(req.params.id);

    if (!room) {
      return res.status(404).json({
        success: false,
        message: "Room not found",
      });
    }

        // Get current patients in this room
        const currentPatients = await IPD.find({
          roomId: room._id,
          status: { $in: ["admitted", "under-treatment"] },
        })
          .populate("patientId", "name patientId phone")
          .populate("doctorId", "name")
          .select("patientId doctorId bedNumber ipdNumber admissionDate _id");

        const occupiedBeds = room.beds.filter((bed) => bed.status === "occupied").length;
        const availableBeds = room.beds.filter((bed) => bed.status === "available").length;

        res.status(200).json({
          success: true,
          data: {
            room: {
              ...room.toObject(),
              stats: {
                total: room.beds.length,
                occupied: occupiedBeds,
                available: availableBeds,
                occupancyRate: room.beds.length > 0 ? ((occupiedBeds / room.beds.length) * 100).toFixed(2) : "0",
              },
              currentPatients: currentPatients.map((ipd) => ({
                ipdId: ipd._id,
                patientId: ipd.patientId,
                bedNumber: ipd.bedNumber,
              })),
            },
          },
        });
  } catch (error) {
    logError("Get room error", error, {
      userId: req.user?.id,
      roomId: req.params.id,
    });
    res.status(500).json({
      success: false,
      message: "Server error. Please try again later.",
    });
  }
};

// @desc    Create room
// @route   POST /api/rooms
// @access  Private
export const createRoom = async (req, res) => {
  try {
    const {
      roomNumber,
      roomType,
      floor,
      ward,
      capacity,
      ratePerDay,
      amenities,
      notes,
      beds, // Array of bed numbers
    } = req.body;

    if (!roomNumber || !roomType || !capacity) {
      return res.status(400).json({
        success: false,
        message: "Room number, type, and capacity are required",
      });
    }

    // Check if room number already exists
    const existingRoom = await Room.findOne({ roomNumber: roomNumber.toUpperCase() });
    if (existingRoom) {
      return res.status(400).json({
        success: false,
        message: "Room number already exists",
      });
    }

    // Create beds array
    const bedsArray = [];
    if (beds && Array.isArray(beds) && beds.length > 0) {
      beds.forEach((bedNumber) => {
        bedsArray.push({
          bedNumber: String(bedNumber).trim(),
          status: "available",
        });
      });
    } else {
      // Create default beds based on capacity
      for (let i = 1; i <= capacity; i++) {
        bedsArray.push({
          bedNumber: String(i),
          status: "available",
        });
      }
    }

    const room = await Room.create({
      roomNumber: roomNumber.toUpperCase(),
      roomType,
      floor: floor || null,
      ward: ward || null,
      capacity,
      ratePerDay: ratePerDay || 0,
      amenities: amenities || [],
      notes: notes || null,
      beds: bedsArray,
    });

    logInfo("Room created", {
      createdBy: req.user.id,
      roomId: room._id,
      roomNumber: room.roomNumber,
    });

    res.status(201).json({
      success: true,
      message: "Room created successfully",
      data: { room },
    });
  } catch (error) {
    logError("Create room error", error, {
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
        message: "Room number already exists",
      });
    }
    res.status(500).json({
      success: false,
      message: "Server error. Please try again later.",
    });
  }
};

// @desc    Update room
// @route   PUT /api/rooms/:id
// @access  Private
export const updateRoom = async (req, res) => {
  try {
    const {
      roomNumber,
      roomType,
      floor,
      ward,
      capacity,
      ratePerDay,
      amenities,
      notes,
      beds,
      isActive,
    } = req.body;

    const room = await Room.findById(req.params.id);

    if (!room) {
      return res.status(404).json({
        success: false,
        message: "Room not found",
      });
    }

    // Check if room number is being changed and if it already exists
    if (roomNumber && roomNumber.toUpperCase() !== room.roomNumber) {
      const existingRoom = await Room.findOne({ roomNumber: roomNumber.toUpperCase() });
      if (existingRoom) {
        return res.status(400).json({
          success: false,
          message: "Room number already exists",
        });
      }
      room.roomNumber = roomNumber.toUpperCase();
    }

    if (roomType) room.roomType = roomType;
    if (floor !== undefined) room.floor = floor || null;
    if (ward !== undefined) room.ward = ward || null;
    if (capacity !== undefined) room.capacity = capacity;
    if (ratePerDay !== undefined) room.ratePerDay = ratePerDay;
    if (amenities !== undefined) room.amenities = amenities;
    if (notes !== undefined) room.notes = notes || null;
    if (isActive !== undefined) room.isActive = isActive;

    // Update beds if provided
    if (beds && Array.isArray(beds)) {
      // Only update beds that are not currently occupied
      beds.forEach((bedUpdate) => {
        const bed = room.beds.find((b) => b.bedNumber === bedUpdate.bedNumber);
        if (bed) {
          // Only allow status change if bed is not occupied
          if (bed.status !== "occupied" || bedUpdate.status === "occupied") {
            if (bedUpdate.status) bed.status = bedUpdate.status;
          }
        } else {
          // Add new bed
          room.beds.push({
            bedNumber: bedUpdate.bedNumber,
            status: bedUpdate.status || "available",
          });
        }
      });
    }

    await room.save();

    logInfo("Room updated", {
      updatedBy: req.user.id,
      roomId: room._id,
    });

    res.status(200).json({
      success: true,
      message: "Room updated successfully",
      data: { room },
    });
  } catch (error) {
    logError("Update room error", error, {
      updatedBy: req.user?.id,
      roomId: req.params.id,
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

// @desc    Delete room
// @route   DELETE /api/rooms/:id
// @access  Private
export const deleteRoom = async (req, res) => {
  try {
    const room = await Room.findById(req.params.id);

    if (!room) {
      return res.status(404).json({
        success: false,
        message: "Room not found",
      });
    }

    // Check if room has any occupied beds
    const occupiedBeds = room.beds.filter((bed) => bed.status === "occupied");
    if (occupiedBeds.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Cannot delete room with occupied beds",
      });
    }

    await Room.findByIdAndDelete(req.params.id);

    logInfo("Room deleted", {
      deletedBy: req.user.id,
      roomId: req.params.id,
    });

    res.status(200).json({
      success: true,
      message: "Room deleted successfully",
    });
  } catch (error) {
    logError("Delete room error", error, {
      deletedBy: req.user?.id,
      roomId: req.params.id,
    });
    res.status(500).json({
      success: false,
      message: "Server error. Please try again later.",
    });
  }
};

// @desc    Get available beds
// @route   GET /api/rooms/available-beds
// @access  Private
export const getAvailableBeds = async (req, res) => {
  try {
    const { roomType } = req.query;

    const query = { isActive: true };
    if (roomType) query.roomType = roomType;

    const rooms = await Room.find(query);

    const availableBeds = [];
    rooms.forEach((room) => {
      room.beds.forEach((bed) => {
        if (bed.status === "available") {
          availableBeds.push({
            roomId: room._id,
            roomNumber: room.roomNumber,
            roomType: room.roomType,
            floor: room.floor,
            ward: room.ward,
            bedNumber: bed.bedNumber,
            ratePerDay: room.ratePerDay,
          });
        }
      });
    });

    logInfo("Available beds fetched", {
      userId: req.user.id,
      count: availableBeds.length,
    });

    res.status(200).json({
      success: true,
      count: availableBeds.length,
      data: { availableBeds },
    });
  } catch (error) {
    logError("Get available beds error", error, {
      userId: req.user?.id,
    });
    res.status(500).json({
      success: false,
      message: "Server error. Please try again later.",
    });
  }
};

// @desc    Get room statistics
// @route   GET /api/rooms/stats
// @access  Private
export const getRoomStats = async (req, res) => {
  try {
    const rooms = await Room.find({ isActive: true });
    const currentIPD = await IPD.find({
      status: { $in: ["admitted", "under-treatment"] },
    });

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

    const stats = {
      totalRooms: rooms.length,
      totalBeds,
      occupiedBeds,
      availableBeds,
      maintenanceBeds,
      occupancyRate: totalBeds > 0 ? ((occupiedBeds / totalBeds) * 100).toFixed(2) : "0",
      currentAdmissions: currentIPD.length,
      roomsByType: {},
    };

    // Count rooms by type
    rooms.forEach((room) => {
      if (!stats.roomsByType[room.roomType]) {
        stats.roomsByType[room.roomType] = 0;
      }
      stats.roomsByType[room.roomType]++;
    });

    logInfo("Room statistics fetched", {
      userId: req.user.id,
    });

    res.status(200).json({
      success: true,
      data: { stats },
    });
  } catch (error) {
    logError("Get room stats error", error, {
      userId: req.user?.id,
    });
    res.status(500).json({
      success: false,
      message: "Server error. Please try again later.",
    });
  }
};
