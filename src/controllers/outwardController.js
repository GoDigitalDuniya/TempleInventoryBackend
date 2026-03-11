const Outward = require("../models/outward.model");
const OutwardItem = require("../models/outwardItem.model");
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
/* ================= CREATE OUTWARD ================= */

exports.createOutward = async (req, res) => {
  try {
    const {
      outwardName,
      outwardMobile,
      outwardNo,
      outwardDate,
      description,
      items,
    } = req.body;

    /* ========= BASIC VALIDATION ========= */

    if (!outwardName?.trim())
      return res.status(400).json({ message: "Outward name is required" });

    if (!outwardNo?.trim())
      return res.status(400).json({ message: "Outward number is required" });

    if (!outwardDate)
      return res.status(400).json({ message: "Outward date is required" });

    if (new Date(outwardDate) > new Date())
      return res.status(400).json({
        message: "Outward date cannot be in future",
      });

    if (!Array.isArray(items) || items.length === 0)
      return res.status(400).json({
        message: "At least one outward item is required",
      });

    /* ========= DUPLICATE CHECK ========= */

    const exists = await Outward.findOne({
      outwardNo: outwardNo.trim(),
      templeId: req.user.templeId,
    });

    if (exists)
      return res.status(400).json({
        message: "Outward number already exists",
      });

    /* ========= STOCK CHECK FIRST (IMPORTANT FIX) ========= */

    for (const item of items) {
      if (!item.productId)
        return res.status(400).json({
          message: "Product is required",
        });

      if (!item.qty || Number(item.qty) <= 0)
        return res.status(400).json({
          message: "Invalid quantity",
        });

      const product = await Product.findById(item.productId);

      if (!product) {
        return res.status(404).json({
          message: "Product not found",
        });
      }

      if (product.currentStock < Number(item.qty)) {
        return res.status(400).json({
          message: `Insufficient stock for product: ${product.productName}`,
          productId: product._id,
          availableStock: product.currentStock,
          requestedQty: Number(item.qty),
        });
      }
    }

    /* ========= CREATE OUTWARD HEADER ========= */

    const outward = await Outward.create({
      templeId: req.user.templeId,
      outwardName: outwardName.trim(),
      outwardMobile,
      outwardNo: outwardNo.trim(),
      outwardDate,
      description,
      status: "Active",
      createdBy: req.user._id,
    });

    /* ========= CREATE ITEMS + REDUCE STOCK ========= */

    for (const item of items) {
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
    console.log("CREATE OUTWARD ERROR:", error);

    return res.status(500).json({
      message: "Internal Server Error",
    });
  }
};

/* ================= LIST OUTWARD ================= */

exports.getOutwardList = async (req, res) => {
  try {
    const {
      search,
      outwardName,
      outwardMobile,
      outwardNo,
      outwardBy,
      status,
      startDate,
      endDate,
      sortField,
      sortOrder,
    } = req.body || {};

    const match = {
      templeId: req.user.templeId,
    };

    /* ===== COLUMN FILTER ===== */

    if (outwardName) match.outwardName = { $regex: outwardName, $options: "i" };

    if (outwardMobile)
      match.outwardMobile = { $regex: outwardMobile, $options: "i" };

    if (outwardNo) match.outwardNo = { $regex: outwardNo, $options: "i" };

    if (status && status !== "All") match.status = status;

    /* ===== DATE RANGE FILTER ===== */

    if (startDate && endDate) {
      match.outwardDate = {
        $gte: new Date(startDate + "T00:00:00"),
        $lte: new Date(endDate + "T23:59:59"),
      };
    }

    let pipeline = [
      { $match: match },

      /* ===== JOIN USER ===== */

      {
        $lookup: {
          from: "users",
          localField: "createdBy",
          foreignField: "_id",
          as: "createdByUser",
        },
      },

      {
        $unwind: {
          path: "$createdByUser",
          preserveNullAndEmptyArrays: true,
        },
      },

      /* ===== ADD COMPUTED FIELDS ===== */

      {
        $addFields: {
          outwardBy: "$createdByUser.userName",

          outwardDateString: {
            $dateToString: {
              format: "%d %b %Y",
              date: "$outwardDate",
            },
          },

          createdDateString: {
            $dateToString: {
              format: "%d %b %Y",
              date: "$createdAt",
            },
          },

          /* lowercase fields for ABC sorting */

          outwardNameLower: { $toLower: "$outwardName" },
          outwardMobileLower: { $toLower: "$outwardMobile" },
          outwardNoLower: { $toLower: "$outwardNo" },
          outwardByLower: { $toLower: "$createdByUser.userName" },
          statusLower: { $toLower: "$status" },
        },
      },
    ];

    /* ===== COLUMN SEARCH FOR OUTWARD BY ===== */

    if (outwardBy) {
      pipeline.push({
        $match: {
          outwardBy: { $regex: outwardBy, $options: "i" },
        },
      });
    }

    /* ===== GLOBAL SEARCH ===== */

    if (search) {
      pipeline.push({
        $match: {
          $or: [
            { outwardName: { $regex: search, $options: "i" } },
            { outwardMobile: { $regex: search, $options: "i" } },
            { outwardNo: { $regex: search, $options: "i" } },
            { status: { $regex: search, $options: "i" } },
            { outwardBy: { $regex: search, $options: "i" } },
            { outwardDateString: { $regex: search, $options: "i" } },
            { createdDateString: { $regex: search, $options: "i" } },
          ],
        },
      });
    }

    /* ===== SORT ===== */

    let sort = { createdAt: -1 };

    if (sortField) {
      const order = sortOrder === "asc" ? 1 : -1;

      const sortFields = {
        outwardName: "outwardNameLower",
        outwardMobile: "outwardMobileLower",
        outwardNo: "outwardNoLower",
        outwardBy: "outwardByLower",
        status: "statusLower",
      };

      if (sortFields[sortField]) {
        sort = { [sortFields[sortField]]: order };
      } else {
        sort = { [sortField]: order };
      }
    }

    pipeline.push({ $sort: sort });

    /* ===== REMOVE TEMP FIELDS ===== */

    pipeline.push({
      $project: {
        createdByUser: 0,
        outwardNameLower: 0,
        outwardMobileLower: 0,
        outwardNoLower: 0,
        outwardByLower: 0,
        statusLower: 0,
      },
    });

    /* ===== EXECUTE PIPELINE ===== */

    const outwards = await Outward.aggregate(pipeline);

    const result = await Promise.all(
      outwards.map(async (outward) => {
        const items = await OutwardItem.find({
          outwardId: outward._id,
        }).populate("productId", "productName");

        return {
          ...outward,
          outwardDate: formatDate(outward.outwardDate),
          createdAt: formatDate(outward.createdAt),
          items,
        };
      }),
    );

    return res.json(result);
  } catch (error) {
    console.log(error);

    return res.status(500).json({
      message: "Internal Server Error",
    });
  }
};

/* ================= UPDATE OUTWARD ================= */

exports.updateOutward = async (req, res) => {
  try {

    const {
      outwardId,
      outwardName,
      outwardMobile,
      outwardNo,
      outwardDate,
      description,
      status,
      items,
    } = req.body;

    /* ================= VALIDATION ================= */

    if (!outwardId) {
      return res.status(400).json({
        message: "Outward ID required",
      });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        message: "Items required",
      });
    }

    const outward = await Outward.findOne({
      _id: outwardId,
      templeId: req.user.templeId,
    });

    if (!outward) {
      return res.status(404).json({
        message: "Outward not found",
      });
    }

    /* ================= RESTORE OLD STOCK ================= */

    const oldItems = await OutwardItem.find({ outwardId });

    for (const old of oldItems) {
      await Product.findByIdAndUpdate(old.productId, {
        $inc: { currentStock: Number(old.qty) },
      });
    }

    /* ================= STOCK CHECK ================= */

    for (const item of items) {

      const product = await Product.findById(item.productId);

      if (!product) {
        return res.status(404).json({
          message: "Product not found",
        });
      }

      if (product.currentStock < Number(item.qty)) {

        /* rollback restored stock */

        for (const old of oldItems) {
          await Product.findByIdAndUpdate(old.productId, {
            $inc: { currentStock: -Number(old.qty) },
          });
        }

        return res.status(400).json({
          message: `Insufficient stock for product: ${product.productName}`,
          productId: product._id,
          availableStock: product.currentStock,
          requestedQty: Number(item.qty),
        });
      }
    }

    /* ================= UPDATE OUTWARD ================= */

    await Outward.findOneAndUpdate(
      {
        _id: outwardId,
        templeId: req.user.templeId,
      },
      {
        outwardName,
        outwardMobile,
        outwardNo,
        outwardDate,
        description,
        status,
      },
      {
        returnDocument: "after",
      }
    );

    /* ================= DELETE OLD ITEMS ================= */

    await OutwardItem.deleteMany({ outwardId });

    /* ================= CREATE NEW ITEMS ================= */

    for (const item of items) {

      await OutwardItem.create({
        outwardId,
        productId: item.productId,
        remarks: item.remarks,
        qty: item.qty,
      });

      await Product.findByIdAndUpdate(item.productId, {
        $inc: { currentStock: -Number(item.qty) },
      });
    }

    /* ================= SUCCESS ================= */

    return res.json({
      message: "Outward updated successfully",
    });

  } catch (error) {

    /* Duplicate key error */
    if (error.code === 11000) {
      const field = Object.keys(error.keyValue)[0];

      return res.status(400).json({
        message: `${field} already exists`,
      });
    }

    /* Invalid ObjectId */
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
/* ================= DELETE OUTWARD ================= */

exports.deleteOutward = async (req, res) => {
  try {
    const { outwardId } = req.body;

    if (!outwardId)
      return res.status(400).json({ message: "Outward ID required" });

    const items = await OutwardItem.find({ outwardId });

    for (const item of items)
      await Product.findByIdAndUpdate(item.productId, {
        $inc: { currentStock: Number(item.qty) },
      });

    await OutwardItem.deleteMany({ outwardId });

    await Outward.deleteOne({ _id: outwardId });

    return res.json({
      message: "Outward deleted successfully",
    });
  } catch (error) {
    return res.status(500).json({
      message: "Internal Server Error",
    });
  }
};
