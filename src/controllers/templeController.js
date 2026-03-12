const Temple = require("../models/temple.model");

/* ================= DATE FORMATTER ================= */
const formatDate = (date) => {
  if (!date) return null;

  return new Date(date)
    .toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
      timeZone: "Asia/Kolkata",
    })
    .replace(",", "");
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

    if (status && !["Active", "Deactive"].includes(status)) {
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

    if (status && status !== "All" && !["Active", "Deactive"].includes(status)) {
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

    const temples = await Temple.find(filter);

    /* ================= SORT ================= */

    let sortedTemples = temples;

    if (sortField) {

      const order = sortOrder === "asc" ? 1 : -1;

      sortedTemples = temples.sort((a, b) => {

        let valA = a[sortField];
        let valB = b[sortField];

        if (valA === undefined || valA === null) valA = "";
        if (valB === undefined || valB === null) valB = "";

        if (typeof valA === "string") valA = valA.toLowerCase();
        if (typeof valB === "string") valB = valB.toLowerCase();

        if (valA > valB) return order;
        if (valA < valB) return -order;

        return 0;

      });

    } else {

      /* ===== DEFAULT ABCD SORT ===== */

      sortedTemples = temples.sort((a, b) =>
        a.templeName.toLowerCase().localeCompare(b.templeName.toLowerCase())
      );

    }

    /* ================= FORMAT DATES ================= */

    const formattedTemples = sortedTemples.map(t => ({
      ...t.toObject(),
      createdAt: formatDate(t.createdAt),
      updatedAt: formatDate(t.updatedAt),
    }));

    return res.json(formattedTemples);

  } catch (error) {

    return res.status(500).json({
      message: error.message
    });

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
      !["Active", "Deactive"].includes(updateData.status)
    ) {
      return res.status(400).json({
        message: "Invalid temple status",
      });
    }

    const temple = await Temple.findByIdAndUpdate(
      id,
      updateData,
      { returnDocument: "after" }
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

    // ⭐ Handle duplicate key error
    if (error.code === 11000) {
      const field = Object.keys(error.keyValue)[0];

      return res.status(400).json({
        message: `${field} already exists`,
      });
    }

    return res.status(500).json({
      message: "Something went wrong",
    });
  }
};