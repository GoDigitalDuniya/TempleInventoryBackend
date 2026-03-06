    const Product = require("../models/product.model");
const InwardItem = require("../models/inwardItem.model");
const OutwardItem = require("../models/outwardItem.model");

const formatDate = (date) => {
  if (!date) return null;

  return new Date(date).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

/* =====================================================
   STOCK LIST
===================================================== */

exports.getStockList = async (req, res) => {
  try {
    const { search, category, status } = req.body || {};

    const filter = {
      templeId: req.user.templeId,
    };

    if (search) {
      filter.productName = {
        $regex: search,
        $options: "i",
      };
    }

    if (category && category !== "All") filter.category = category;

    if (status && status !== "All") filter.status = status;

    const products = await Product.find(filter).sort({ createdAt: -1 });

    const result = await Promise.all(
      products.map(async (product) => {
        const lastInward = await InwardItem.findOne({
          productId: product._id,
        })
          .populate("inwardId")
          .sort({ createdAt: -1 });

        const lastOutward = await OutwardItem.findOne({
          productId: product._id,
        })
          .populate("outwardId")
          .sort({ createdAt: -1 });

        return {
          productId: product._id,
          productName: product.productName,
          category: product.category,
          unitName: product.unitName,
          minStock: product.minQty,
          currentStock: product.currentStock,
          status: product.status,

          lastInwardDate: formatDate(lastInward?.inwardId?.inwardDate),
          lastOutwardDate: formatDate(lastOutward?.outwardId?.outwardDate),
        };
      }),
    );

    return res.json(result);
  } catch (error) {
    return res.status(500).json({
      message: error.message,
    });
  }
};

/* =====================================================
   TRANSACTION HISTORY (MERGED)
===================================================== */

exports.getTransactionHistory = async (req, res) => {
  try {
    const { productId } = req.body;

    if (!productId)
      return res.status(400).json({
        message: "Product ID required",
      });

    const inward = await InwardItem.find({ productId })
      .populate("inwardId")
      .populate("productId", "productName");

    const outward = await OutwardItem.find({ productId })
      .populate("outwardId")
      .populate("productId", "productName");

    const inwardData = inward.map((i) => ({
      type: "INWARD",
      transactionNo: i.inwardId?.challanNo || "",
      name: i.inwardId?.vendorName || "",
      productName: i.productId?.productName,
      qty: i.qty,
      batchNo: i.batchNo,
      expDate: formatDate(i.expDate),
      remarks: i.remarks || "",
      date: formatDate(i.inwardId?.inwardDate),
    }));

    const outwardData = outward.map((o) => ({
      type: "OUTWARD",
      transactionNo: o.outwardId?.outwardNo || "",
      name: o.outwardId?.outwardName || "",
      productName: o.productId?.productName,
      qty: o.qty,
      remarks: o.remarks || "",
      date: formatDate(o.outwardId?.outwardDate),
    }));

    const history = [...inwardData, ...outwardData].sort(
      (a, b) => new Date(b.date) - new Date(a.date),
    );

    return res.json(history);
  } catch (error) {
    return res.status(500).json({
      message: error.message,
    });
  }
};

/* =====================================================
   INWARD HISTORY
===================================================== */

exports.getProductInwardHistory = async (req, res) => {
  try {
    const { productId } = req.body;

    const data = await InwardItem.find({ productId })
      .populate("inwardId")
      .populate("productId", "productName");

    const result = data.map((item) => ({
      challanNo: item.inwardId?.challanNo || "",
      vendorName: item.inwardId?.vendorName || "",
      productName: item.productId?.productName,
      qty: item.qty,
      batchNo: item.batchNo,
      expDate: formatDate(item.expDate),
      remarks: item.remarks,
      inwardDate: formatDate(item.inwardId?.inwardDate),
    }));

    return res.json(result);
  } catch (error) {
    return res.status(500).json({
      message: error.message,
    });
  }
};

/* =====================================================
   OUTWARD HISTORY
===================================================== */

exports.getProductOutwardHistory = async (req, res) => {
  try {
    const { productId } = req.body;

    const data = await OutwardItem.find({ productId })
      .populate("outwardId")
      .populate("productId", "productName");

    const result = data.map((item) => ({
      outwardNo: item.outwardId?.outwardNo || "",
      outwardName: item.outwardId?.outwardName || "",
      productName: item.productId?.productName,
      qty: item.qty,
      remarks: item.remarks,
      outwardDate: formatDate(item.outwardId?.outwardDate),
    }));

    return res.json(result);
  } catch (error) {
    return res.status(500).json({
      message: error.message,
    });
  }
};