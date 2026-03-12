import ServiceCategory from "../models/ServiceCategory.js";
import Service from "../models/Service.js";
import logger from "../config/logger.js";

// @desc    Get all service categories
// @route   GET /api/service-categories
// @access  Private
export const getServiceCategories = async (req, res) => {
  try {
    const { status, search } = req.query;
    const query = {};

    if (status) {
      query.status = status;
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { code: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }

    const categories = await ServiceCategory.find(query)
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: categories.length,
      data: { categories },
    });
  } catch (error) {
    logger.error("Get service categories error", { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      message: "Error fetching service categories",
      error: error.message,
    });
  }
};

// @desc    Get single service category
// @route   GET /api/service-categories/:id
// @access  Private
export const getServiceCategory = async (req, res) => {
  try {
    const category = await ServiceCategory.findById(req.params.id);

    if (!category || category.isDeleted) {
      return res.status(404).json({
        success: false,
        message: "Service category not found",
      });
    }

    res.status(200).json({
      success: true,
      data: { category },
    });
  } catch (error) {
    logger.error("Get service category error", { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      message: "Error fetching service category",
      error: error.message,
    });
  }
};

// @desc    Create service category
// @route   POST /api/service-categories
// @access  Private (Admin only)
export const createServiceCategory = async (req, res) => {
  try {
    const { name, code, description, status } = req.body;

    if (!name || !code) {
      return res.status(400).json({
        success: false,
        message: "Category name and code are required",
      });
    }

    // Check if category code already exists
    const existingCategory = await ServiceCategory.findOne({ code: code.toUpperCase() });
    if (existingCategory && !existingCategory.isDeleted) {
      return res.status(400).json({
        success: false,
        message: "Category code already exists",
      });
    }

    const category = await ServiceCategory.create({
      name,
      code: code.toUpperCase(),
      description: description || null,
      status: status || "active",
    });

    res.status(201).json({
      success: true,
      message: "Service category created successfully",
      data: { category },
    });
  } catch (error) {
    logger.error("Create service category error", { error: error.message, stack: error.stack });
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "Category code already exists",
      });
    }
    res.status(500).json({
      success: false,
      message: "Error creating service category",
      error: error.message,
    });
  }
};

// @desc    Update service category
// @route   PUT /api/service-categories/:id
// @access  Private (Admin only)
export const updateServiceCategory = async (req, res) => {
  try {
    const { name, code, description, status } = req.body;

    const category = await ServiceCategory.findById(req.params.id);

    if (!category || category.isDeleted) {
      return res.status(404).json({
        success: false,
        message: "Service category not found",
      });
    }

    // Check if code is being changed and if it already exists
    if (code && code.toUpperCase() !== category.code) {
      const existingCategory = await ServiceCategory.findOne({ code: code.toUpperCase() });
      if (existingCategory && existingCategory._id.toString() !== req.params.id && !existingCategory.isDeleted) {
        return res.status(400).json({
          success: false,
          message: "Category code already exists",
        });
      }
    }

    // Update fields
    if (name) category.name = name;
    if (code) category.code = code.toUpperCase();
    if (description !== undefined) category.description = description || null;
    if (status) category.status = status;

    await category.save();

    res.status(200).json({
      success: true,
      message: "Service category updated successfully",
      data: { category },
    });
  } catch (error) {
    logger.error("Update service category error", { error: error.message, stack: error.stack });
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "Category code already exists",
      });
    }
    res.status(500).json({
      success: false,
      message: "Error updating service category",
      error: error.message,
    });
  }
};

// @desc    Soft delete service category
// @route   DELETE /api/service-categories/:id
// @access  Private (Admin only)
export const deleteServiceCategory = async (req, res) => {
  try {
    const category = await ServiceCategory.findById(req.params.id);

    if (!category || category.isDeleted) {
      return res.status(404).json({
        success: false,
        message: "Service category not found",
      });
    }

    // Check if any services are using this category
    const servicesUsingCategory = await Service.countDocuments({
      categoryId: req.params.id,
      isDeleted: false,
    });

    if (servicesUsingCategory > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete category. ${servicesUsingCategory} service(s) are using this category.`,
      });
    }

    category.isDeleted = true;
    category.deletedAt = new Date();
    category.deletedBy = req.user?.id || null;

    await category.save();

    res.status(200).json({
      success: true,
      message: "Service category deleted successfully",
    });
  } catch (error) {
    logger.error("Delete service category error", { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      message: "Error deleting service category",
      error: error.message,
    });
  }
};
