const Inward = require("../models/inward.model");
const InwardItem = require("../models/inwardItem.model");
const Product = require("../models/product.model");

const formatDate = (date) => {
  if (!date) return null;
  return new Date(date).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

/* ================= CREATE INWARD ================= */

exports.createInward = async (req, res) => {
  try {
    const {
      vendorName,
      vendorMobile,
      vendorAddress,
      challanNo,
      inwardDate,
      description,
      items,
    } = req.body;

    /* ========= PROFESSIONAL VALIDATION ========= */

    if (!vendorName || !vendorName.trim()) {
      return res.status(400).json({ message: "Vendor name is required" });
    }

    if (!vendorAddress || !vendorAddress.trim()) {
      return res.status(400).json({ message: "Vendor address is required" });
    }

    if (!challanNo || !challanNo.trim()) {
      return res.status(400).json({ message: "Challan number is required" });
    }

    if (!inwardDate) {
      return res.status(400).json({ message: "Inward date is required" });
    }

    if (new Date(inwardDate) > new Date()) {
      return res.status(400).json({
        message: "Inward date cannot be in future",
      });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        message: "At least one inward item is required",
      });
    }

    for (const item of items) {
      if (!item.productId) {
        return res.status(400).json({
          message: "Product is required for each item",
        });
      }

      if (!item.qty || Number(item.qty) <= 0) {
        return res.status(400).json({
          message: "Quantity must be greater than 0",
        });
      }
    }

    /* ========= DUPLICATE CHALLAN CHECK ========= */

    const exists = await Inward.findOne({
      challanNo: challanNo.trim(),
      templeId: req.user.templeId,
    });

    if (exists) {
      return res.status(400).json({
        message: "Challan number already exists",
      });
    }

    /* ========= CREATE INWARD ========= */

    const inward = await Inward.create({
      templeId: req.user.templeId,
      vendorName: vendorName.trim(),
      vendorMobile, // optional no rule
      vendorAddress: vendorAddress.trim(),
      challanNo: challanNo.trim(),
      inwardDate,
      description,
      status: "Active",
      createdBy: req.user._id,
    });

    for (const item of items) {
      await InwardItem.create({
        inwardId: inward._id,
        productId: item.productId,
        remarks: item.remarks,
        qty: item.qty,
        batchNo: item.batchNo,
        expDate: item.expDate,
      });

      await Product.findByIdAndUpdate(item.productId, {
        $inc: { currentStock: Number(item.qty) },
      });
    }

    return res.status(201).json({
      message: "Inward created successfully",
    });
  } catch (error) {
    return res.status(500).json({
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

/* ================= GET INWARD LIST ================= */

exports.getInwardList = async (req, res) => {
  try {
    const {
      search,
      vendorName,
      vendorMobile,
      vendorAddress,
      challanNo,
      status,
      startDate,
      endDate,
      sortField,
      sortOrder,
    } = req.body || {};

    const filter = { templeId: req.user.templeId };

    if (vendorName) filter.vendorName = { $regex: vendorName, $options: "i" };

    if (vendorMobile)
      filter.vendorMobile = { $regex: vendorMobile, $options: "i" };

    if (vendorAddress)
      filter.vendorAddress = { $regex: vendorAddress, $options: "i" };

    if (challanNo) filter.challanNo = { $regex: challanNo, $options: "i" };

    if (status && status !== "All") filter.status = status;

    if (startDate && endDate) {
      filter.inwardDate = {
        $gte: new Date(startDate + "T00:00:00"),
        $lte: new Date(endDate + "T23:59:59"),
      };
    }

    if (search) {
      filter.$or = [
        { vendorName: { $regex: search, $options: "i" } },
        { vendorMobile: { $regex: search, $options: "i" } },
        { vendorAddress: { $regex: search, $options: "i" } },
        { challanNo: { $regex: search, $options: "i" } },
      ];
    }

    let sortOptions = { createdAt: -1 };

    if (sortField) {
      sortOptions = {
        [sortField]: sortOrder === "asc" ? 1 : -1,
      };
    }

    const inwards = await Inward.find(filter).sort(sortOptions);

    const result = await Promise.all(
      inwards.map(async (inward) => {
        const items = await InwardItem.find({
          inwardId: inward._id,
        }).populate("productId", "productName");

        return {
          ...inward.toObject(),
          inwardDate: formatDate(inward.inwardDate),
          items,
        };
      }),
    );

    return res.json(result);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

/* ================= UPDATE INWARD ================= */

exports.updateInward = async (req, res) => {
  try {
    const {
      inwardId,
      vendorName,
      vendorMobile,
      vendorAddress,
      challanNo,
      inwardDate,
      description,
      items,
    } = req.body;

    if (!inwardId)
      return res.status(400).json({ message: "Inward ID is required" });

    if (!vendorName?.trim())
      return res.status(400).json({ message: "Vendor name is required" });

    if (!vendorAddress?.trim())
      return res.status(400).json({ message: "Vendor address is required" });

    if (!challanNo?.trim())
      return res.status(400).json({ message: "Challan number is required" });

    if (!inwardDate)
      return res.status(400).json({ message: "Inward date is required" });

    if (!Array.isArray(items) || items.length === 0)
      return res.status(400).json({ message: "At least one item is required" });

    const inward = await Inward.findOneAndUpdate(
      { _id: inwardId, templeId: req.user.templeId },
      {
        vendorName: vendorName.trim(),
        vendorMobile,
        vendorAddress: vendorAddress.trim(),
        challanNo: challanNo.trim(),
        inwardDate,
        description,
      },
      { returnDocument: "after" },
    );
    if (!inward) return res.status(404).json({ message: "Inward not found" });

    const oldItems = await InwardItem.find({ inwardId });

    for (const old of oldItems) {
      await Product.findByIdAndUpdate(old.productId, {
        $inc: { currentStock: -Number(old.qty) },
      });
    }

    await InwardItem.deleteMany({ inwardId });

    for (const item of items) {
      await InwardItem.create({
        inwardId,
        productId: item.productId,
        remarks: item.remarks,
        qty: item.qty,
        batchNo: item.batchNo,
        expDate: item.expDate,
      });

      await Product.findByIdAndUpdate(item.productId, {
        $inc: { currentStock: Number(item.qty) },
      });
    }

    return res.json({ message: "Inward updated successfully" });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

/* ================= DELETE INWARD ================= */

exports.deleteInward = async (req, res) => {
  try {
    const { inwardId } = req.body;

    if (!inwardId) {
      return res.status(400).json({ message: "Inward ID is required" });
    }

    // 🔍 Find inward (temple safe)
    const inward = await Inward.findOne({
      _id: inwardId,
      templeId: req.user.templeId,
    });

    if (!inward) {
      return res.status(404).json({ message: "Inward not found" });
    }

    // 📦 Get all inward items
    const items = await InwardItem.find({ inwardId });

    // 🔻 Reverse stock
    for (const item of items) {
      await Product.findByIdAndUpdate(item.productId, {
        $inc: { currentStock: -Number(item.qty) },
      });
    }

    // 🗑 Delete items
    await InwardItem.deleteMany({ inwardId });

    // 🗑 Delete inward
    await Inward.deleteOne({ _id: inwardId });

    return res.json({
      message: "Inward deleted successfully",
    });
  } catch (error) {
    return res.status(500).json({
      message: "Internal Server Error",
      error: error.message,
    });
  }
};
