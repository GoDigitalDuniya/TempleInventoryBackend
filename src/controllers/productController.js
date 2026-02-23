const Product = require("../models/product.model");

/* ================= CREATE PRODUCT ================= */

exports.createProduct = async (req, res) => {
  try {
    const { productName } = req.body;

    if (!productName) {
      return res.status(400).json({ message: "Product name required" });
    }

    const product = await Product.create({
      ...req.body,
      templeId: req.user.templeId,
      currentStock: req.body.currentStock || 0,
    });

    return res.status(201).json({
      message: "Product created successfully",
      product,
    });

  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};


/* ================= LIST PRODUCTS (WITH FILTERS) ================= */

exports.listProducts = async (req, res) => {
  try {
    const {
      search,
      status,
      productName,
      category,
      minQty,
      currentStock,
      templeName,
      lastInwardDate,
      lastOutwardDate,
    } = req.body || {};

    const matchStage = {
      templeId: req.user.templeId,
    };

    /* ===== Global Search ===== */
    if (search) {
      matchStage.$or = [
        { productName: { $regex: search, $options: "i" } },
        { category: { $regex: search, $options: "i" } },
      ];
    }

    if (status && status !== "All") {
      matchStage.status = status;
    }

    if (productName) {
      matchStage.productName = { $regex: productName, $options: "i" };
    }

    if (category) {
      matchStage.category = { $regex: category, $options: "i" };
    }

    if (minQty) {
      matchStage.minQuantity = Number(minQty);
    }

    if (currentStock) {
      matchStage.currentStock = Number(currentStock);
    }

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

      ...(templeName
        ? [
            {
              $match: {
                "temple.templeName": {
                  $regex: templeName,
                  $options: "i",
                },
              },
            },
          ]
        : []),

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

      ...(lastInwardDate
        ? [
            {
              $match: {
                lastInwardDate: {
                  $gte: new Date(lastInwardDate + "T00:00:00"),
                  $lte: new Date(lastInwardDate + "T23:59:59"),
                },
              },
            },
          ]
        : []),

      ...(lastOutwardDate
        ? [
            {
              $match: {
                lastOutwardDate: {
                  $gte: new Date(lastOutwardDate + "T00:00:00"),
                  $lte: new Date(lastOutwardDate + "T23:59:59"),
                },
              },
            },
          ]
        : []),

      {
        $project: {
          inwardItems: 0,
          outwardItems: 0,
          temple: 0,
        },
      },

      { $sort: { createdAt: -1 } },
    ];

    const products = await Product.aggregate(pipeline);

    return res.json(products);

  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};


/* ================= UPDATE PRODUCT ================= */

exports.updateProduct = async (req, res) => {
  try {
    const { id, ...updateData } = req.body || {};

    if (!id) {
      return res.status(400).json({ message: "Product ID required" });
    }

    const product = await Product.findOneAndUpdate(
      { _id: id, templeId: req.user.templeId },
      updateData,
      { new: true }
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