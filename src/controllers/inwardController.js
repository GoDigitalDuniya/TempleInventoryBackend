const Inward = require("../models/inward.model");
const InwardItem = require("../models/inwardItem.model");
const Product = require("../models/product.model");

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

    if (!items || items.length === 0) {
      return res.status(400).json({ message: "Items required" });
    }

    const inward = await Inward.create({
      templeId: req.user.templeId,
      vendorName,
      vendorMobile,
      vendorAddress,
      challanNo,
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

      await Product.findByIdAndUpdate(
        item.productId,
        { $inc: { currentStock: Number(item.qty) } }
      );
    }

    return res.status(201).json({
      message: "Inward created successfully",
    });

  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};


exports.getInwardList = async (req, res) => {
  try {
    const {
      search,          // ✅ GLOBAL SEARCH KEY
      vendorName,
      vendorMobile,
      vendorAddress,
      challanNo,
      status,
      startDate,
      endDate,
      sortField,
      sortOrder
    } = req.body || {};

    const filter = {
      templeId: req.user.templeId,
    };

    /* ================= COLUMN FILTERS ================= */

    if (vendorName) {
      filter.vendorName = { $regex: vendorName, $options: "i" };
    }

    if (vendorMobile) {
      filter.vendorMobile = { $regex: vendorMobile, $options: "i" };
    }

    if (vendorAddress) {
      filter.vendorAddress = { $regex: vendorAddress, $options: "i" };
    }

    if (challanNo) {
      filter.challanNo = { $regex: challanNo, $options: "i" };
    }

    if (status && status !== "All") {
      filter.status = status;
    }

    if (startDate && endDate) {
      filter.inwardDate = {
        $gte: new Date(startDate + "T00:00:00"),
        $lte: new Date(endDate + "T23:59:59"),
      };
    }

    /* ================= GLOBAL SEARCH ================= */

    if (search) {
      filter.$or = [
        { vendorName: { $regex: search, $options: "i" } },
        { vendorMobile: { $regex: search, $options: "i" } },
        { vendorAddress: { $regex: search, $options: "i" } },
        { challanNo: { $regex: search, $options: "i" } },
        { inwardNo: { $regex: search, $options: "i" } }, // if you have this field
      ];
    }

    /* ================= SORT ================= */

    let sortOptions = { createdAt: -1 };

    if (sortField) {
      sortOptions = {
        [sortField]: sortOrder === "asc" ? 1 : -1,
      };
    }

    const inwards = await Inward.find(filter).sort(sortOptions);

    const result = await Promise.all(
      inwards.map(async (inward) => {
        const items = await InwardItem.find({ inwardId: inward._id })
          .populate("productId", "productName");

        return {
          ...inward.toObject(),
          items,
        };
      })
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

    if (!inwardId) {
      return res.status(400).json({ message: "Inward ID required" });
    }

    if (!items || items.length === 0) {
      return res.status(400).json({ message: "Items required" });
    }

    const inward = await Inward.findOneAndUpdate(
      { _id: inwardId, templeId: req.user.templeId },
      {
        vendorName,
        vendorMobile,
        vendorAddress,
        challanNo,
        inwardDate,
        description,
      },
      { new: true }
    );

    if (!inward) {
      return res.status(404).json({ message: "Inward not found" });
    }

    // 🔄 Rollback old stock
    const oldItems = await InwardItem.find({ inwardId });

    for (const old of oldItems) {
      await Product.findByIdAndUpdate(
        old.productId,
        { $inc: { currentStock: -Number(old.qty) } }
      );
    }

    await InwardItem.deleteMany({ inwardId });

    // ➕ Insert new items + apply stock
    for (const item of items) {
      await InwardItem.create({
        inwardId,
        productId: item.productId,
        remarks: item.remarks,
        qty: item.qty,
        batchNo: item.batchNo,
        expDate: item.expDate,
      });

      await Product.findByIdAndUpdate(
        item.productId,
        { $inc: { currentStock: Number(item.qty) } }
      );
    }

    return res.json({
      message: "Inward updated successfully",
    });

  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};