const Inward = require("../models/inward.model");
const InwardItem = require("../models/inwardItem.model");
const Product = require("../models/product.model");

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

    const exists = await Inward.findOne({
      challanNo: challanNo.trim(),
      templeId: req.user.templeId,
    });

    if (exists) {
      return res.status(400).json({
        message: "Challan number already exists",
      });
    }

    const inward = await Inward.create({
      templeId: req.user.templeId,
      vendorName: vendorName.trim(),
      vendorMobile,
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

    const match = {
      templeId: req.user.templeId,
    };

    if (vendorName)
      match.vendorName = { $regex: vendorName, $options: "i" };

    if (vendorMobile)
      match.vendorMobile = { $regex: vendorMobile, $options: "i" };

    if (vendorAddress)
      match.vendorAddress = { $regex: vendorAddress, $options: "i" };

    if (challanNo)
      match.challanNo = { $regex: challanNo, $options: "i" };

    if (status && status !== "All")
      match.status = status;

    if (startDate && endDate) {
      match.inwardDate = {
        $gte: new Date(startDate + "T00:00:00"),
        $lte: new Date(endDate + "T23:59:59"),
      };
    }

    let pipeline = [
      { $match: match },

      {
        $lookup: {
          from: "users",
          localField: "createdBy",
          foreignField: "_id",
          as: "user",
        },
      },
      {
        $unwind: {
          path: "$user",
          preserveNullAndEmptyArrays: true,
        },
      },

      {
        $addFields: {
          inwardBy: "$user.userName",
          inwardByLower: { $toLower: "$user.userName" },

          inwardDateString: {
            $dateToString: {
              format: "%d %b %Y",
              date: "$inwardDate",
            },
          },

          createdDateString: {
            $dateToString: {
              format: "%d %b %Y",
              date: "$createdAt",
            },
          },

          vendorNameLower: { $toLower: "$vendorName" },
          vendorMobileLower: { $toLower: "$vendorMobile" },
          vendorAddressLower: { $toLower: "$vendorAddress" },
          challanNoLower: { $toLower: "$challanNo" },
          statusLower: { $toLower: "$status" },
        },
      },
    ];

    if (search) {
      const searchLower = search.toLowerCase();

      pipeline.push({
        $match: {
          $or: [
            { vendorNameLower: { $regex: searchLower } },
            { vendorMobileLower: { $regex: searchLower } },
            { vendorAddressLower: { $regex: searchLower } },
            { challanNoLower: { $regex: searchLower } },
            { inwardByLower: { $regex: searchLower } },
            { inwardDateString: { $regex: search, $options: "i" } },
            { createdDateString: { $regex: search, $options: "i" } },
          ],
        },
      });
    }

    let sort = { createdAt: -1 };

    if (sortField) {
      const order = sortOrder === "asc" ? 1 : -1;

      const sortFields = {
        vendorName: "vendorNameLower",
        vendorMobile: "vendorMobileLower",
        vendorAddress: "vendorAddressLower",
        challanNo: "challanNoLower",
        status: "statusLower",
        inwardBy: "inwardByLower",
      };

      if (sortFields[sortField])
        sort = { [sortFields[sortField]]: order };
      else
        sort = { [sortField]: order };
    }

    pipeline.push({ $sort: sort });

    pipeline.push({
      $project: {
        vendorNameLower: 0,
        vendorMobileLower: 0,
        vendorAddressLower: 0,
        challanNoLower: 0,
        statusLower: 0,
        inwardByLower: 0,
        user: 0,
      },
    });

    const inwards = await Inward.aggregate(pipeline);

    const result = await Promise.all(
      inwards.map(async (inward) => {
        const items = await InwardItem.find({
          inwardId: inward._id,
        }).populate("productId", "productName uom"); // ✅ FINAL CHANGE

        return {
          ...inward,
          inwardDate: formatDate(inward.inwardDate),
          createdAt: formatDate(inward.createdAt),
          items,
        };
      })
    );

    return res.json(result);
  } catch (error) {
    return res.status(500).json({
      message: "Internal Server Error",
      error: error.message,
    });
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
      {
        _id: inwardId,
        templeId: req.user.templeId,
      },
      {
        vendorName: vendorName.trim(),
        vendorMobile,
        vendorAddress: vendorAddress.trim(),
        challanNo: challanNo.trim(),
        inwardDate,
        description,
      },
      {
        returnDocument: "after",
      }
    );

    if (!inward)
      return res.status(404).json({ message: "Inward not found" });

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

    return res.json({
      message: "Inward updated successfully",
    });

  } catch (error) {

    if (error.code === 11000) {
      const field = Object.keys(error.keyValue)[0];
      return res.status(400).json({
        message: `${field} already exists`,
      });
    }

    if (error.name === "CastError") {
      return res.status(400).json({
        message: "Invalid ID format",
      });
    }

    return res.status(500).json({
      message: "Something went wrong",
    });

  }
};

/* ================= DELETE INWARD ================= */

exports.deleteInward = async (req, res) => {
  try {

    const { inwardId } = req.body;

    if (!inwardId)
      return res.status(400).json({ message: "Inward ID is required" });

    const inward = await Inward.findOne({
      _id: inwardId,
      templeId: req.user.templeId,
    });

    if (!inward)
      return res.status(404).json({ message: "Inward not found" });

    const items = await InwardItem.find({ inwardId });

    for (const item of items) {
      await Product.findByIdAndUpdate(item.productId, {
        $inc: { currentStock: -Number(item.qty) },
      });
    }

    await InwardItem.deleteMany({ inwardId });

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