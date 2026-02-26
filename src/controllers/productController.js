const Product = require("../models/product.model");

/* ================= DATE FORMATTER ================= */

const formatDate = (date) => {
  if (!date) return null;
  return new Date(date).toLocaleDateString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

/* =====================================================
   ✅ CATEGORY DROPDOWN API (DYNAMIC FROM DB)
===================================================== */

exports.getCategoryList = async (req, res) => {
  try {
    const categories = await Product.distinct("category", {
      templeId: req.user.templeId,
      category: { $ne: null },
    });

    return res.json(categories.filter((c) => c && c.trim()).sort());
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

/* ================= CREATE PRODUCT ================= */

exports.createProduct = async (req, res) => {
  try {
    const { productName, category, minQty, currentStock, status } = req.body;

    if (!productName || !productName.trim()) {
      return res.status(400).json({ message: "Product name is required" });
    }

    if (!category || !category.trim()) {
      return res.status(400).json({ message: "Category is required" });
    }

    if (minQty !== undefined && Number(minQty) < 0) {
      return res
        .status(400)
        .json({ message: "Minimum quantity cannot be negative" });
    }

    if (currentStock !== undefined && Number(currentStock) < 0) {
      return res
        .status(400)
        .json({ message: "Current stock cannot be negative" });
    }

    if (status && !["Active", "Inactive"].includes(status)) {
      return res.status(400).json({ message: "Invalid product status" });
    }

    const exists = await Product.findOne({
      productName: productName.trim(),
      templeId: req.user.templeId,
    });

    if (exists) {
      return res.status(400).json({ message: "Product already exists" });
    }

    const product = await Product.create({
      ...req.body,
      productName: productName.trim(),
      category: category.trim(),
      templeId: req.user.templeId,
      currentStock: currentStock || 0,
    });

    return res.status(201).json({
      message: "Product created successfully",
      product,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

/* ================= LIST PRODUCTS ================= */

exports.listProducts = async (req, res) => {
  try {
    const {
      search,
      status,
      productName,
      category,
      minQty,
      currentStock,
      lastInwardDate,
      lastOutwardDate,
      sortField,
      sortOrder,
    } = req.body || {};

    const matchStage = {
      templeId: req.user.templeId,
    };

    /* ================= COLUMN FILTERS ================= */

    if (status && status !== "All") matchStage.status = status;

    if (productName) {
      matchStage.productName = { $regex: productName, $options: "i" };
    }

    /* ✅ SMART CATEGORY FILTER */
    if (category && category !== "All") {
      matchStage.category = {
        $regex: `^${category.trim()}$`,
        $options: "i",
      };
    }

    if (minQty !== undefined) matchStage.minQty = Number(minQty);
    if (currentStock !== undefined)
      matchStage.currentStock = Number(currentStock);

    const pipeline = [
      { $match: matchStage },

      {
        $lookup: {
          from: "temples",
          localField: "templeId",
          foreignField: "_id",
          as: "temple",
        },
      },
      { $unwind: { path: "$temple", preserveNullAndEmptyArrays: true } },

      {
        $lookup: {
          from: "inwarditems",
          localField: "_id",
          foreignField: "productId",
          as: "inwardItems",
        },
      },
      {
        $lookup: {
          from: "outwarditems",
          localField: "_id",
          foreignField: "productId",
          as: "outwardItems",
        },
      },

      {
        $addFields: {
          lastInwardDate: { $max: "$inwardItems.createdAt" },
          lastOutwardDate: { $max: "$outwardItems.createdAt" },
          templeName: "$temple.templeName",
        },
      },
    ];

    /* ================= GLOBAL SEARCH ================= */

    if (search) {
      pipeline.push({
        $match: {
          $or: [
            { productName: { $regex: search, $options: "i" } },
            { category: { $regex: search, $options: "i" } },
            { templeName: { $regex: search, $options: "i" } },
            { status: { $regex: search, $options: "i" } },
          ],
        },
      });
    }

    if (lastInwardDate) {
      pipeline.push({
        $match: {
          lastInwardDate: {
            $gte: new Date(lastInwardDate + "T00:00:00"),
            $lte: new Date(lastInwardDate + "T23:59:59"),
          },
        },
      });
    }

    if (lastOutwardDate) {
      pipeline.push({
        $match: {
          lastOutwardDate: {
            $gte: new Date(lastOutwardDate + "T00:00:00"),
            $lte: new Date(lastOutwardDate + "T23:59:59"),
          },
        },
      });
    }

    pipeline.push({
      $project: {
        inwardItems: 0,
        outwardItems: 0,
        temple: 0,
      },
    });

    pipeline.push({
      $sort: sortField
        ? { [sortField]: sortOrder === "asc" ? 1 : -1 }
        : { createdAt: -1 },
    });

    const products = await Product.aggregate(pipeline);

    const formattedProducts = products.map((p) => ({
      ...p,
      lastInwardDate: formatDate(p.lastInwardDate),
      lastOutwardDate: formatDate(p.lastOutwardDate),
    }));

    return res.json(formattedProducts);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

/* ================= UPDATE PRODUCT ================= */

exports.updateProduct = async (req, res) => {
  try {
    const { id, ...updateData } = req.body || {};

    if (!id) {
      return res.status(400).json({ message: "Product ID is required" });
    }

    if (
      updateData.productName !== undefined &&
      !updateData.productName.trim()
    ) {
      return res.status(400).json({ message: "Product name cannot be empty" });
    }

    if (updateData.category !== undefined && !updateData.category.trim()) {
      return res.status(400).json({ message: "Category cannot be empty" });
    }

    if (updateData.minQty !== undefined && Number(updateData.minQty) < 0) {
      return res
        .status(400)
        .json({ message: "Minimum quantity cannot be negative" });
    }

    if (
      updateData.currentStock !== undefined &&
      Number(updateData.currentStock) < 0
    ) {
      return res
        .status(400)
        .json({ message: "Current stock cannot be negative" });
    }

    if (
      updateData.status &&
      !["Active", "Inactive"].includes(updateData.status)
    ) {
      return res.status(400).json({ message: "Invalid product status" });
    }

    const product = await Product.findOneAndUpdate(
      { _id: id, templeId: req.user.templeId },
      updateData,
      { returnDocument: "after" },
    );

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    return res.json({
      message: "Product updated successfully",
      product,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};
