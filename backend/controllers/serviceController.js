import Service from "../models/Service.js";
import logger from "../config/logger.js";

// @desc    Get all services
// @route   GET /api/services
// @access  Private
export const getServices = async (req, res) => {
  try {
    const { status, categoryId, departmentId, search } = req.query;
    const query = {};

    if (status) {
      query.status = status;
    }

    if (categoryId) {
      query.categoryId = categoryId;
    }

    if (departmentId) {
      query.departmentId = departmentId;
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { code: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }

    const services = await Service.find(query)
      .populate("categoryId", "name code")
      .populate("departmentId", "name code")
      .populate("priceHistory.changedBy", "name email")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: services.length,
      data: { services },
    });
  } catch (error) {
    logger.error("Get services error", { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      message: "Error fetching services",
      error: error.message,
    });
  }
};

// @desc    Get single service
// @route   GET /api/services/:id
// @access  Private
export const getService = async (req, res) => {
  try {
    const service = await Service.findById(req.params.id)
      .populate("departmentId", "name code")
      .populate("priceHistory.changedBy", "name email");

    if (!service || service.isDeleted) {
      return res.status(404).json({
        success: false,
        message: "Service not found",
      });
    }

    res.status(200).json({
      success: true,
      data: { service },
    });
  } catch (error) {
    logger.error("Get service error", { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      message: "Error fetching service",
      error: error.message,
    });
  }
};

// @desc    Create service
// @route   POST /api/services
// @access  Private (Admin only)
export const createService = async (req, res) => {
  try {
    const { name, code, description, categoryId, price, duration, status, departmentId } = req.body;

    if (!name || !code || price === undefined) {
      return res.status(400).json({
        success: false,
        message: "Service name, code, and price are required",
      });
    }

    // Check if service code already exists
    const existingService = await Service.findOne({ code: code.toUpperCase() });
    if (existingService && !existingService.isDeleted) {
      return res.status(400).json({
        success: false,
        message: "Service code already exists",
      });
    }

    const service = await Service.create({
      name,
      code: code.toUpperCase(),
      description: description || null,
      categoryId: categoryId || null,
      price: parseFloat(price),
      duration: duration ? parseInt(duration) : null,
      status: status || "active",
      departmentId: departmentId || null,
      priceHistory: [
        {
          price: parseFloat(price),
          effectiveDate: new Date(),
          changedBy: req.user.id,
          note: "Initial price",
        },
      ],
    });

    await service.populate("categoryId", "name code");
    await service.populate("departmentId", "name code");

    res.status(201).json({
      success: true,
      message: "Service created successfully",
      data: { service },
    });
  } catch (error) {
    logger.error("Create service error", { error: error.message, stack: error.stack });
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "Service code already exists",
      });
    }
    res.status(500).json({
      success: false,
      message: "Error creating service",
      error: error.message,
    });
  }
};

// @desc    Update service
// @route   PUT /api/services/:id
// @access  Private (Admin only)
export const updateService = async (req, res) => {
  try {
    const { name, code, description, categoryId, price, duration, status, departmentId } = req.body;

    const service = await Service.findById(req.params.id);

    if (!service || service.isDeleted) {
      return res.status(404).json({
        success: false,
        message: "Service not found",
      });
    }

    // Check if code is being changed and if it already exists
    if (code && code.toUpperCase() !== service.code) {
      const existingService = await Service.findOne({ code: code.toUpperCase() });
      if (existingService && existingService._id.toString() !== req.params.id && !existingService.isDeleted) {
        return res.status(400).json({
          success: false,
          message: "Service code already exists",
        });
      }
    }

    const oldPrice = service.price;

    // Update fields
    if (name) service.name = name;
    if (code) service.code = code.toUpperCase();
    if (description !== undefined) service.description = description || null;
    if (categoryId !== undefined) service.categoryId = categoryId || null;
    if (price !== undefined) {
      const newPrice = parseFloat(price);
      // Track price change
      if (oldPrice !== newPrice) {
        if (!service.priceHistory) {
          service.priceHistory = [];
        }
        service.priceHistory.push({
          price: oldPrice,
          effectiveDate: service.updatedAt || service.createdAt,
          changedBy: req.user.id,
          note: `Price changed from ${oldPrice} to ${newPrice}`,
        });
      }
      service.price = newPrice;
    }
    if (duration !== undefined) service.duration = duration ? parseInt(duration) : null;
    if (status) service.status = status;
    if (departmentId !== undefined) service.departmentId = departmentId || null;

    await service.save();
    await service.populate("categoryId", "name code");
    await service.populate("departmentId", "name code");
    await service.populate("priceHistory.changedBy", "name email");

    res.status(200).json({
      success: true,
      message: "Service updated successfully",
      data: { service },
    });
  } catch (error) {
    logger.error("Update service error", { error: error.message, stack: error.stack });
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "Service code already exists",
      });
    }
    res.status(500).json({
      success: false,
      message: "Error updating service",
      error: error.message,
    });
  }
};

// @desc    Soft delete service
// @route   DELETE /api/services/:id
// @access  Private (Admin only)
export const deleteService = async (req, res) => {
  try {
    const service = await Service.findById(req.params.id);

    if (!service || service.isDeleted) {
      return res.status(404).json({
        success: false,
        message: "Service not found",
      });
    }

    service.isDeleted = true;
    service.deletedAt = new Date();
    service.deletedBy = req.user?.id || null;

    await service.save();

    res.status(200).json({
      success: true,
      message: "Service deleted successfully",
    });
  } catch (error) {
    logger.error("Delete service error", { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      message: "Error deleting service",
      error: error.message,
    });
  }
};
