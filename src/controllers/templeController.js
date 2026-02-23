const Temple = require("../models/temple.model");

/* ================= CREATE TEMPLE ================= */

exports.createTemple = async (req, res) => {
  try {
    if (req.user.role !== "Admin") {
      return res.status(403).json({
        message: "Only Admin can create temple",
      });
    }

    const { templeName, templeCode } = req.body;

    if (!templeName || !templeCode) {
      return res.status(400).json({
        message: "Temple name and code required",
      });
    }

    const temple = await Temple.create({
      ...req.body,
      createdBy: req.user._id,
    });

    return res.status(201).json({
      message: "Temple created successfully",
      temple,
    });

  } catch (error) {
    return res.status(500).json({ message: error.message });
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
    } = req.body || {};

    const filter = {};

    /* ===== Global Search ===== */
    if (search) {
      filter.$or = [
        { templeName: { $regex: search, $options: "i" } },
        { templeCode: { $regex: search, $options: "i" } },
        { address: { $regex: search, $options: "i" } },
      ];
    }

    /* ===== Column Filters ===== */
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

    const temples = await Temple.find(filter)
      .sort({ createdAt: -1 });

    return res.json(temples);

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
      return res.status(400).json({ message: "Temple ID required" });
    }

    const temple = await Temple.findByIdAndUpdate(
      id,
      updateData,
      { new: true }
    );

    if (!temple) {
      return res.status(404).json({ message: "Temple not found" });
    }

    return res.json({
      message: "Temple updated successfully",
      temple,
    });

  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};