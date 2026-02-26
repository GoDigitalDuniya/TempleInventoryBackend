const Temple = require("../models/temple.model");

/* ================= DATE FORMATTER ================= */

const formatDate = (date) => {
  if (!date) return null;
  return new Date(date).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

/* ================= CREATE TEMPLE ================= */

exports.createTemple = async (req, res) => {
  try {
    if (req.user.role !== "Admin") {
      return res.status(403).json({
        message: "Only Admin can create temple",
      });
    }

    const { templeName, templeCode, status, address } = req.body;

    /* ========= PROFESSIONAL VALIDATION ========= */

    if (!templeName || !templeName.trim()) {
      return res.status(400).json({
        message: "Temple name is required",
      });
    }

    if (!templeCode || !templeCode.trim()) {
      return res.status(400).json({
        message: "Temple code is required",
      });
    }

    if (status && !["Active", "Inactive"].includes(status)) {
      return res.status(400).json({
        message: "Invalid temple status",
      });
    }

    /* ========= DUPLICATE CHECK ========= */

    const nameExists = await Temple.findOne({
      templeName: templeName.trim(),
    });

    if (nameExists) {
      return res.status(400).json({
        message: "Temple name already exists",
      });
    }

    const codeExists = await Temple.findOne({
      templeCode: templeCode.trim(),
    });

    if (codeExists) {
      return res.status(400).json({
        message: "Temple code already exists",
      });
    }

    /* ========= CREATE TEMPLE ========= */

    const temple = await Temple.create({
      templeName: templeName.trim(),
      templeCode: templeCode.trim(),
      address,
      status: status || "Active",
      createdBy: req.user._id,
    });

    return res.status(201).json({
      message: "Temple created successfully",
      temple,
    });

  } catch (error) {
    return res.status(500).json({
      message: "Internal Server Error",
      error: error.message,
    });
  }
};


/* ================= LIST + FULL FILTER SYSTEM ================= */

exports.getTempleList = async (req, res) => {
  try {
    const {
      search,
      templeName,
      templeCode,
      address,
      status,
      sortField,
      sortOrder
    } = req.body || {};

    const filter = {};

    /* ========= VALIDATION ========= */

    if (status && status !== "All" && !["Active", "Inactive"].includes(status)) {
      return res.status(400).json({
        message: "Invalid status filter",
      });
    }

    /* ================= COLUMN FILTERS ================= */

    if (templeName) {
      filter.templeName = { $regex: templeName, $options: "i" };
    }

    if (templeCode) {
      filter.templeCode = { $regex: templeCode, $options: "i" };
    }

    if (address) {
      filter.address = { $regex: address, $options: "i" };
    }

    if (status && status !== "All") {
      filter.status = status;
    }

    /* ================= GLOBAL SEARCH ================= */

    if (search) {
      filter.$or = [
        { templeName: { $regex: search, $options: "i" } },
        { templeCode: { $regex: search, $options: "i" } },
        { address: { $regex: search, $options: "i" } },
        { status: { $regex: search, $options: "i" } },
      ];
    }

    /* ================= SORT ================= */

    let sortOptions = { createdAt: -1 };

    if (sortField) {
      sortOptions = {
        [sortField]: sortOrder === "asc" ? 1 : -1,
      };
    }

    const temples = await Temple.find(filter).sort(sortOptions);

    /* ================= FORMAT DATES ================= */

    const formattedTemples = temples.map(t => ({
      ...t.toObject(),
      createdAt: formatDate(t.createdAt),
      updatedAt: formatDate(t.updatedAt),
    }));

    return res.json(formattedTemples);

  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};


/* ================= UPDATE TEMPLE ================= */

exports.updateTemple = async (req, res) => {
  try {
    if (req.user.role !== "Admin") {
      return res.status(403).json({
        message: "Only Admin can update temple",
      });
    }

    const { id, ...updateData } = req.body || {};

    if (!id) {
      return res.status(400).json({
        message: "Temple ID is required",
      });
    }

    if (updateData.templeName !== undefined && !updateData.templeName.trim()) {
      return res.status(400).json({
        message: "Temple name cannot be empty",
      });
    }

    if (updateData.templeCode !== undefined && !updateData.templeCode.trim()) {
      return res.status(400).json({
        message: "Temple code cannot be empty",
      });
    }

    if (
      updateData.status &&
      !["Active", "Inactive"].includes(updateData.status)
    ) {
      return res.status(400).json({
        message: "Invalid temple status",
      });
    }

    const temple = await Temple.findByIdAndUpdate(
      id,
      updateData,
      { new: true }
    );

    if (!temple) {
      return res.status(404).json({
        message: "Temple not found",
      });
    }

    return res.json({
      message: "Temple updated successfully",
      temple,
    });

  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};