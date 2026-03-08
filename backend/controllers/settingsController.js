import Settings from "../models/Settings.js";
import { logInfo, logError } from "../config/logger.js";

// @desc    Get all settings
// @route   GET /api/settings
// @access  Private
export const getSettings = async (req, res) => {
  try {
    const { category, isActive } = req.query;

    const query = {};
    if (category) query.category = category;
    if (isActive !== undefined) query.isActive = isActive === "true";

    const settings = await Settings.find(query).sort({ category: 1, key: 1 });

    // Group settings by category for easier access
    const groupedSettings = {};
    settings.forEach((setting) => {
      if (!groupedSettings[setting.category]) {
        groupedSettings[setting.category] = [];
      }
      groupedSettings[setting.category].push({
        _id: setting._id,
        key: setting.key,
        value: setting.value,
        description: setting.description,
        isActive: setting.isActive,
        isSystem: setting.isSystem,
      });
    });

    logInfo("Settings fetched", {
      userId: req.user.id,
      count: settings.length,
    });

    res.status(200).json({
      success: true,
      count: settings.length,
      data: { settings: groupedSettings, allSettings: settings },
    });
  } catch (error) {
    logError("Get settings error", error, {
      userId: req.user?.id,
    });
    res.status(500).json({
      success: false,
      message: "Server error. Please try again later.",
    });
  }
};

// @desc    Get single setting
// @route   GET /api/settings/:key
// @access  Private
export const getSetting = async (req, res) => {
  try {
    const setting = await Settings.findOne({ key: req.params.key.toLowerCase() });

    if (!setting) {
      return res.status(404).json({
        success: false,
        message: "Setting not found",
      });
    }

    res.status(200).json({
      success: true,
      data: { setting },
    });
  } catch (error) {
    logError("Get setting error", error, {
      userId: req.user?.id,
      key: req.params.key,
    });
    res.status(500).json({
      success: false,
      message: "Server error. Please try again later.",
    });
  }
};

// @desc    Get room types
// @route   GET /api/settings/room-types
// @access  Private
export const getRoomTypes = async (req, res) => {
  try {
    const roomTypes = await Settings.find({
      category: "room-types",
      isActive: true,
    }).sort({ key: 1 });

    // Default room types if none exist
    const defaultRoomTypes = [
      "general",
      "private",
      "semi-private",
      "icu",
      "ccu",
      "isolation",
      "ward",
      "other",
    ];

    const types = roomTypes.length > 0
      ? roomTypes.map((s) => s.value || s.key)
      : defaultRoomTypes;

    logInfo("Room types fetched", {
      userId: req.user.id,
      count: types.length,
    });

    res.status(200).json({
      success: true,
      data: { roomTypes: types },
    });
  } catch (error) {
    logError("Get room types error", error, {
      userId: req.user?.id,
    });
    res.status(500).json({
      success: false,
      message: "Server error. Please try again later.",
    });
  }
};

// @desc    Create or update setting
// @route   POST /api/settings
// @access  Private
export const createSetting = async (req, res) => {
  try {
    const { key, value, category, description, isActive } = req.body;

    if (!key || value === undefined) {
      return res.status(400).json({
        success: false,
        message: "Key and value are required",
      });
    }

    // Check if setting exists
    const existingSetting = await Settings.findOne({ key: key.toLowerCase() });

    if (existingSetting) {
      // Update existing setting
      if (value !== undefined) existingSetting.value = value;
      if (category) existingSetting.category = category;
      if (description !== undefined) existingSetting.description = description;
      if (isActive !== undefined) existingSetting.isActive = isActive;

      await existingSetting.save();

      logInfo("Setting updated", {
        updatedBy: req.user.id,
        settingKey: existingSetting.key,
      });

      res.status(200).json({
        success: true,
        message: "Setting updated successfully",
        data: { setting: existingSetting },
      });
    } else {
      // Create new setting
      const setting = await Settings.create({
        key: key.toLowerCase(),
        value,
        category: category || "other",
        description: description || null,
        isActive: isActive !== undefined ? isActive : true,
      });

      logInfo("Setting created", {
        createdBy: req.user.id,
        settingKey: setting.key,
      });

      res.status(201).json({
        success: true,
        message: "Setting created successfully",
        data: { setting },
      });
    }
  } catch (error) {
    logError("Create setting error", error, {
      createdBy: req.user?.id,
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

// @desc    Update setting
// @route   PUT /api/settings/:id
// @access  Private
export const updateSetting = async (req, res) => {
  try {
    const { value, category, description, isActive } = req.body;

    const setting = await Settings.findById(req.params.id);

    if (!setting) {
      return res.status(404).json({
        success: false,
        message: "Setting not found",
      });
    }

    if (setting.isSystem) {
      return res.status(400).json({
        success: false,
        message: "Cannot modify system settings",
      });
    }

    if (value !== undefined) setting.value = value;
    if (category) setting.category = category;
    if (description !== undefined) setting.description = description;
    if (isActive !== undefined) setting.isActive = isActive;

    await setting.save();

    logInfo("Setting updated", {
      updatedBy: req.user.id,
      settingId: setting._id,
    });

    res.status(200).json({
      success: true,
      message: "Setting updated successfully",
      data: { setting },
    });
  } catch (error) {
    logError("Update setting error", error, {
      updatedBy: req.user?.id,
      settingId: req.params.id,
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

// @desc    Delete setting
// @route   DELETE /api/settings/:id
// @access  Private
export const deleteSetting = async (req, res) => {
  try {
    const setting = await Settings.findById(req.params.id);

    if (!setting) {
      return res.status(404).json({
        success: false,
        message: "Setting not found",
      });
    }

    if (setting.isSystem) {
      return res.status(400).json({
        success: false,
        message: "Cannot delete system settings",
      });
    }

    await Settings.findByIdAndDelete(req.params.id);

    logInfo("Setting deleted", {
      deletedBy: req.user.id,
      settingId: req.params.id,
    });

    res.status(200).json({
      success: true,
      message: "Setting deleted successfully",
    });
  } catch (error) {
    logError("Delete setting error", error, {
      deletedBy: req.user?.id,
      settingId: req.params.id,
    });
    res.status(500).json({
      success: false,
      message: "Server error. Please try again later.",
    });
  }
};

// @desc    Add room type
// @route   POST /api/settings/room-types
// @access  Private
export const addRoomType = async (req, res) => {
  try {
    const { roomType, description } = req.body;

    if (!roomType || !roomType.trim()) {
      return res.status(400).json({
        success: false,
        message: "Room type name is required",
      });
    }

    const key = `room-type-${roomType.toLowerCase().replace(/\s+/g, "-")}`;

    // Check if room type already exists
    const existing = await Settings.findOne({ key });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: "Room type already exists",
      });
    }

    const setting = await Settings.create({
      key,
      value: roomType.trim(),
      category: "room-types",
      description: description || null,
      isActive: true,
    });

    logInfo("Room type added", {
      addedBy: req.user.id,
      roomType: roomType,
    });

    res.status(201).json({
      success: true,
      message: "Room type added successfully",
      data: { setting },
    });
  } catch (error) {
    logError("Add room type error", error, {
      addedBy: req.user?.id,
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

// @desc    Get ward types
// @route   GET /api/settings/ward-types
// @access  Private
export const getWardTypes = async (req, res) => {
  try {
    const wardTypes = await Settings.find({
      category: "ward-types",
      isActive: true,
    }).sort({ key: 1 });

    // Default ward types if none exist
    const defaultWardTypes = [
      "general",
      "icu",
      "ccu",
      "surgical",
      "medical",
      "pediatric",
      "maternity",
      "orthopedic",
      "cardiac",
      "neurology",
      "oncology",
      "emergency",
      "other",
    ];

    const types = wardTypes.length > 0
      ? wardTypes.map((s) => s.value || s.key)
      : defaultWardTypes;

    logInfo("Ward types fetched", {
      userId: req.user.id,
      count: types.length,
    });

    res.status(200).json({
      success: true,
      data: { wardTypes: types },
    });
  } catch (error) {
    logError("Get ward types error", error, {
      userId: req.user?.id,
    });
    res.status(500).json({
      success: false,
      message: "Server error. Please try again later.",
    });
  }
};

// @desc    Add ward type
// @route   POST /api/settings/ward-types
// @access  Private
export const addWardType = async (req, res) => {
  try {
    const { wardType, description } = req.body;

    if (!wardType || !wardType.trim()) {
      return res.status(400).json({
        success: false,
        message: "Ward type name is required",
      });
    }

    const key = `ward-type-${wardType.toLowerCase().replace(/\s+/g, "-")}`;

    // Check if ward type already exists
    const existing = await Settings.findOne({ key });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: "Ward type already exists",
      });
    }

    const setting = await Settings.create({
      key,
      value: wardType.trim(),
      category: "ward-types",
      description: description || null,
      isActive: true,
    });

    logInfo("Ward type added", {
      addedBy: req.user.id,
      wardType: wardType,
    });

    res.status(201).json({
      success: true,
      message: "Ward type added successfully",
      data: { setting },
    });
  } catch (error) {
    logError("Add ward type error", error, {
      addedBy: req.user?.id,
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
