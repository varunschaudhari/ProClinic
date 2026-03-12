import Department from "../models/Department.js";
import logger from "../config/logger.js";

// @desc    Get all departments
// @route   GET /api/departments
// @access  Private
export const getDepartments = async (req, res) => {
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

    const departments = await Department.find(query)
      .populate("headOfDepartment", "name email")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: departments.length,
      data: { departments },
    });
  } catch (error) {
    logger.error("Get departments error", { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      message: "Error fetching departments",
      error: error.message,
    });
  }
};

// @desc    Get single department
// @route   GET /api/departments/:id
// @access  Private
export const getDepartment = async (req, res) => {
  try {
    const department = await Department.findById(req.params.id).populate(
      "headOfDepartment",
      "name email"
    );

    if (!department || department.isDeleted) {
      return res.status(404).json({
        success: false,
        message: "Department not found",
      });
    }

    res.status(200).json({
      success: true,
      data: { department },
    });
  } catch (error) {
    logger.error("Get department error", { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      message: "Error fetching department",
      error: error.message,
    });
  }
};

// @desc    Create department
// @route   POST /api/departments
// @access  Private (Admin only)
export const createDepartment = async (req, res) => {
  try {
    const { name, code, description, headOfDepartment, status } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: "Department name is required",
      });
    }

    const department = await Department.create({
      name,
      code: code || null,
      description: description || null,
      headOfDepartment: headOfDepartment || null,
      status: status || "active",
    });

    await department.populate("headOfDepartment", "name email");

    res.status(201).json({
      success: true,
      message: "Department created successfully",
      data: { department },
    });
  } catch (error) {
    logger.error("Create department error", { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      message: "Error creating department",
      error: error.message,
    });
  }
};

// @desc    Update department
// @route   PUT /api/departments/:id
// @access  Private (Admin only)
export const updateDepartment = async (req, res) => {
  try {
    const { name, code, description, headOfDepartment, status } = req.body;

    const department = await Department.findById(req.params.id);

    if (!department || department.isDeleted) {
      return res.status(404).json({
        success: false,
        message: "Department not found",
      });
    }

    if (name) department.name = name;
    if (code !== undefined) department.code = code || null;
    if (description !== undefined) department.description = description || null;
    if (headOfDepartment !== undefined) department.headOfDepartment = headOfDepartment || null;
    if (status) department.status = status;

    await department.save();
    await department.populate("headOfDepartment", "name email");

    res.status(200).json({
      success: true,
      message: "Department updated successfully",
      data: { department },
    });
  } catch (error) {
    logger.error("Update department error", { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      message: "Error updating department",
      error: error.message,
    });
  }
};

// @desc    Soft delete department
// @route   DELETE /api/departments/:id
// @access  Private (Admin only)
export const deleteDepartment = async (req, res) => {
  try {
    const department = await Department.findById(req.params.id);

    if (!department || department.isDeleted) {
      return res.status(404).json({
        success: false,
        message: "Department not found",
      });
    }

    department.isDeleted = true;
    department.deletedAt = new Date();
    department.deletedBy = req.user?.id || null;

    await department.save();

    res.status(200).json({
      success: true,
      message: "Department deleted successfully",
    });
  } catch (error) {
    logger.error("Delete department error", { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      message: "Error deleting department",
      error: error.message,
    });
  }
};
