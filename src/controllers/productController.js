const Product = require("../models/product.model");

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

/* =====================================================
   CATEGORY DROPDOWN
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
      warehouseReck,
      minQty,
      currentStock,
      startInwardDate,
      endInwardDate,
      startOutwardDate,
      endOutwardDate,
      sortField,
      sortOrder,
    } = req.body || {};

    const matchStage = {
      templeId: req.user.templeId,
    };

    /* ===== COLUMN FILTERS ===== */

    if (status && status !== "All") matchStage.status = status;

    if (productName)
      matchStage.productName = { $regex: productName, $options: "i" };

    if (category && category !== "All")
      matchStage.category = { $regex: `^${category}$`, $options: "i" };

    if (warehouseReck)
      matchStage.warehouseReck = { $regex: warehouseReck, $options: "i" };

    if (minQty !== "" && minQty !== undefined)
      matchStage.minQty = Number(minQty);

    if (currentStock !== "" && currentStock !== undefined)
      matchStage.currentStock = Number(currentStock);

    const pipeline = [
      { $match: matchStage },

      /* ===== TEMPLE JOIN ===== */

      {
        $lookup: {
          from: "temples",
          localField: "templeId",
          foreignField: "_id",
          as: "temple",
        },
      },

      { $unwind: { path: "$temple", preserveNullAndEmptyArrays: true } },

      /* ===== INWARD JOIN ===== */

      {
        $lookup: {
          from: "inwarditems",
          localField: "_id",
          foreignField: "productId",
          as: "inwardItems",
        },
      },

      /* ===== OUTWARD JOIN ===== */

      {
        $lookup: {
          from: "outwarditems",
          localField: "_id",
          foreignField: "productId",
          as: "outwardItems",
        },
      },

      /* ===== CALCULATED FIELDS ===== */

      {
        $addFields: {
          templeName: "$temple.templeName",

          lastInwardDate: { $max: "$inwardItems.createdAt" },
          lastOutwardDate: { $max: "$outwardItems.createdAt" },

          lastInwardDateString: {
            $dateToString: {
              format: "%d %b %Y",
              date: { $max: "$inwardItems.createdAt" },
            },
          },

          lastOutwardDateString: {
            $dateToString: {
              format: "%d %b %Y",
              date: { $max: "$outwardItems.createdAt" },
            },
          },

          /* lowercase fields for proper ABC sorting */

          productNameLower: { $toLower: "$productName" },
          categoryLower: { $toLower: "$category" },
          warehouseReckLower: { $toLower: "$warehouseReck" },
          templeNameLower: { $toLower: "$templeName" },
        },
      },
    ];

    /* ===== GLOBAL SEARCH ===== */

    if (search) {
      const regex = new RegExp(search, "i");

      const searchMatch = {
        $or: [
          { productName: regex },
          { category: regex },
          { warehouseReck: regex },
          { templeName: regex },
          { status: regex },
          { uom: regex },
          { lastInwardDateString: regex },
          { lastOutwardDateString: regex },
        ],
      };

      if (!isNaN(search)) {
        searchMatch.$or.push({ minQty: Number(search) });
        searchMatch.$or.push({ currentStock: Number(search) });
      }

      pipeline.push({ $match: searchMatch });
    }

    /* ===== INWARD DATE RANGE ===== */

    if (startInwardDate || endInwardDate) {
      const inwardFilter = {};

      if (startInwardDate)
        inwardFilter.$gte = new Date(startInwardDate + "T00:00:00");

      if (endInwardDate)
        inwardFilter.$lte = new Date(endInwardDate + "T23:59:59");

      pipeline.push({
        $match: { lastInwardDate: inwardFilter },
      });
    }

    /* ===== OUTWARD DATE RANGE ===== */

    if (startOutwardDate || endOutwardDate) {
      const outwardFilter = {};

      if (startOutwardDate)
        outwardFilter.$gte = new Date(startOutwardDate + "T00:00:00");

      if (endOutwardDate)
        outwardFilter.$lte = new Date(endOutwardDate + "T23:59:59");

      pipeline.push({
        $match: { lastOutwardDate: outwardFilter },
      });
    }

    /* ===== SORTING ===== */

    let sort = { createdAt: -1 };

    if (sortField) {
      const order = sortOrder === "asc" ? 1 : -1;

      const sortFields = {
        productName: "productNameLower",
        category: "categoryLower",
        warehouseReck: "warehouseReckLower",
        templeName: "templeNameLower",
      };

      if (sortFields[sortField]) {
        sort = { [sortFields[sortField]]: order };
      } else {
        sort = { [sortField]: order };
      }
    }

    pipeline.push({ $sort: sort });

    /* ===== REMOVE EXTRA DATA ===== */

    pipeline.push({
      $project: {
        inwardItems: 0,
        outwardItems: 0,
        temple: 0,
        productNameLower: 0,
        categoryLower: 0,
        warehouseReckLower: 0,
        templeNameLower: 0,
      },
    });

    const products = await Product.aggregate(pipeline);

    const formattedProducts = products.map((p) => ({
      ...p,
      lastInwardDate: formatDate(p.lastInwardDate),
      lastOutwardDate: formatDate(p.lastOutwardDate),
    }));

    return res.json(formattedProducts);
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: error.message });
  }
};

/* ================= UPDATE PRODUCT ================= */
exports.updateProduct = async (req, res) => {
  try {

    const { id, ...updateData } = req.body || {};

    if (!id) {
      return res.status(400).json({
        message: "Product ID is required",
      });
    }

    const product = await Product.findOneAndUpdate(
      { _id: id, templeId: req.user.templeId },
      updateData,
      { returnDocument: "after" }
    );

    if (!product) {
      return res.status(404).json({
        message: "Product not found",
      });
    }

    return res.json({
      message: "Product updated successfully",
      product,
    });

  } catch (error) {

    /* Duplicate key error */
    if (error.code === 11000) {
      const field = Object.keys(error.keyValue)[0];

      return res.status(400).json({
        message: `${field} already exists`,
      });
    }

    /* Invalid Mongo ObjectId */
    if (error.name === "CastError") {
      return res.status(400).json({
        message: "Invalid Product ID",
      });
    }

    return res.status(500).json({
      message: "Something went wrong",
    });
  }
};