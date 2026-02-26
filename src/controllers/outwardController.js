const Outward = require("../models/outward.model");
const OutwardItem = require("../models/outwardItem.model");
const Product = require("../models/product.model");

const formatDate = (date) => {
  if (!date) return null;
  return new Date(date).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

/* ================= CREATE OUTWARD ================= */

exports.createOutward = async (req, res) => {
  try {
    const {
      customerName,
      customerMobile,
      outwardNo,
      outwardDate,
      description,
      items,
    } = req.body;

    /* ========= PROFESSIONAL VALIDATION ========= */

    if (!customerName || !customerName.trim()) {
      return res.status(400).json({ message: "Outward name is required" });
    }

    if (!outwardNo || !outwardNo.trim()) {
      return res.status(400).json({ message: "Outward number is required" });
    }

    if (!outwardDate) {
      return res.status(400).json({ message: "Outward date is required" });
    }

    if (new Date(outwardDate) > new Date()) {
      return res.status(400).json({
        message: "Outward date cannot be in future",
      });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        message: "At least one outward item is required",
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

    /* ========= DUPLICATE OUTWARD NO ========= */

    const exists = await Outward.findOne({
      outwardNo: outwardNo.trim(),
      templeId: req.user.templeId,
    });

    if (exists) {
      return res.status(400).json({
        message: "Outward number already exists",
      });
    }

    /* ========= CREATE OUTWARD ========= */

    const outward = await Outward.create({
      templeId: req.user.templeId,
      customerName: customerName.trim(),
      customerMobile,
      outwardNo: outwardNo.trim(),
      outwardDate,
      description,
      status: "Active",
      createdBy: req.user._id,
    });

    for (const item of items) {
      const product = await Product.findById(item.productId);

      if (!product || product.currentStock < Number(item.qty)) {
        return res.status(400).json({
          message: "Insufficient stock for one or more products",
        });
      }

      await OutwardItem.create({
        outwardId: outward._id,
        productId: item.productId,
        remarks: item.remarks,
        qty: item.qty,
      });

      await Product.findByIdAndUpdate(item.productId, {
        $inc: { currentStock: -Number(item.qty) },
      });
    }

    return res.status(201).json({
      message: "Outward created successfully",
    });
  } catch (error) {
    return res.status(500).json({
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

/* ================= LIST OUTWARD ================= */

exports.getOutwardList = async (req, res) => {
  try {
    const {
      search,
      customerName,
      customerMobile,
      outwardNo,
      outwardBy,
      status,
      startDate,
      endDate,
      sortField,
      sortOrder,
    } = req.body || {};

    const filter = { templeId: req.user.templeId };

    if (customerName)
      filter.customerName = { $regex: customerName, $options: "i" };

    if (customerMobile)
      filter.customerMobile = { $regex: customerMobile, $options: "i" };

    if (outwardNo) filter.outwardNo = { $regex: outwardNo, $options: "i" };

    if (status && status !== "All") filter.status = status;

    if (startDate && endDate) {
      filter.outwardDate = {
        $gte: new Date(startDate + "T00:00:00"),
        $lte: new Date(endDate + "T23:59:59"),
      };
    }

    if (search) {
      filter.$or = [
        { customerName: { $regex: search, $options: "i" } },
        { customerMobile: { $regex: search, $options: "i" } },
        { outwardNo: { $regex: search, $options: "i" } },
        { status: { $regex: search, $options: "i" } },
      ];
    }

    let sortOptions = { createdAt: -1 };

    if (sortField) {
      sortOptions = {
        [sortField]: sortOrder === "asc" ? 1 : -1,
      };
    }

    const outwards = await Outward.find(filter)
      .populate("createdBy", "userName role")
      .sort(sortOptions);

    const result = await Promise.all(
      outwards.map(async (outward) => {
        const items = await OutwardItem.find({
          outwardId: outward._id,
        }).populate("productId", "productName");

        if (
          outwardBy &&
          !outward.createdBy?.userName
            ?.toLowerCase()
            .includes(outwardBy.toLowerCase())
        ) {
          return null;
        }

        if (
          search &&
          outward.createdBy?.userName &&
          !outward.createdBy.userName
            .toLowerCase()
            .includes(search.toLowerCase()) &&
          !outward.customerName?.toLowerCase().includes(search.toLowerCase()) &&
          !outward.customerMobile?.includes(search) &&
          !outward.outwardNo?.toLowerCase().includes(search.toLowerCase()) &&
          !outward.status?.toLowerCase().includes(search.toLowerCase())
        ) {
          return null;
        }

        return {
          ...outward.toObject(),
          outwardDate: formatDate(outward.outwardDate),
          outwardBy: outward.createdBy?.userName || "",
          items,
        };
      }),
    );

    return res.json(result.filter(Boolean));
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

/* ================= UPDATE OUTWARD ================= */

exports.updateOutward = async (req, res) => {
  try {
    const { outwardId, customerName, customerMobile, description, status } =
      req.body;

    if (!outwardId)
      return res.status(400).json({ message: "Outward ID is required" });

    if (!customerName?.trim())
      return res.status(400).json({ message: "Customer name is required" });
    const outward = await Outward.findOneAndUpdate(
      { _id: outwardId, templeId: req.user.templeId },
      {
        customerName: customerName.trim(),
        customerMobile,
        description,
        status,
      },
      { returnDocument: "after" },
    );

    if (!outward) return res.status(404).json({ message: "Outward not found" });

    return res.json({
      message: "Outward updated successfully",
      outward,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

/* ================= DELETE OUTWARD ================= */

exports.deleteOutward = async (req, res) => {
  try {
    const { outwardId } = req.body;

    if (!outwardId) {
      return res.status(400).json({ message: "Outward ID is required" });
    }

    // 🔍 Temple-safe fetch
    const outward = await Outward.findOne({
      _id: outwardId,
      templeId: req.user.templeId,
    });

    if (!outward) {
      return res.status(404).json({ message: "Outward not found" });
    }

    // 📦 Get outward items
    const items = await OutwardItem.find({ outwardId });

    // 🔺 Restore stock
    for (const item of items) {
      await Product.findByIdAndUpdate(item.productId, {
        $inc: { currentStock: Number(item.qty) },
      });
    }

    // 🗑 Delete items
    await OutwardItem.deleteMany({ outwardId });

    // 🗑 Delete outward
    await Outward.deleteOne({ _id: outwardId });

    return res.json({
      message: "Outward deleted successfully",
    });
  } catch (error) {
    return res.status(500).json({
      message: "Internal Server Error",
      error: error.message,
    });
  }
};
