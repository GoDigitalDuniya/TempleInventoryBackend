const Product = require("../models/product.model");
const InwardItem = require("../models/inwardItem.model");
const OutwardItem = require("../models/outwardItem.model");
const { handleError } = require("../utils/errorHandler");

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

/* ================= DYNAMIC SORT ================= */

const dynamicSort = (data, sortField, sortOrder = "asc") => {
  return data.sort((a, b) => {
    let valA = a[sortField];
    let valB = b[sortField];

    if (valA === undefined || valA === null) valA = "";
    if (valB === undefined || valB === null) valB = "";

    if (sortField && sortField.toLowerCase().includes("date")) {
      valA = new Date(valA);
      valB = new Date(valB);
    }

    if (!isNaN(valA) && !isNaN(valB)) {
      valA = Number(valA);
      valB = Number(valB);
    }

    if (typeof valA === "string") valA = valA.toLowerCase();
    if (typeof valB === "string") valB = valB.toLowerCase();

    if (valA > valB) return sortOrder === "asc" ? 1 : -1;
    if (valA < valB) return sortOrder === "asc" ? -1 : 1;

    return 0;
  });
};

/* ================= STOCK LIST ================= */

exports.getStockList = async (req, res) => {
  try {
    const products = await Product.find({
      templeId: req.user.templeId,
    });

    return res.json(products);
  } catch (error) {
    return handleError(error, res);
  }
};

/* =====================================================
   TRANSACTION HISTORY
===================================================== */

exports.getTransactionHistory = async (req, res) => {
  try {
    const { productId, search, sortField, sortOrder } = req.body;

    if (!productId) {
      return res.status(400).json({
        message: "Product ID required",
      });
    }

    const inward = await InwardItem.find({ productId })
      .populate("inwardId")
      .populate("productId", "productName uom");

    const outward = await OutwardItem.find({ productId })
      .populate("outwardId")
      .populate("productId", "productName uom");

    const inwardData = inward.map((i) => ({
      type: "INWARD",
      transactionNo: i.inwardId?.challanNo || "",
      name: i.inwardId?.vendorName || "",
      productName: i.productId?.productName || "",
      uom: i.productId?.uom || "",
      qty: i.qty,
      remarks: i.remarks || "",
      date: i.inwardId?.inwardDate,
    }));

    const outwardData = outward.map((o) => ({
      type: "OUTWARD",
      transactionNo: o.outwardId?.outwardNo || "",
      name: o.outwardId?.outwardName || "",
      productName: o.productId?.productName || "",
      uom: o.productId?.uom || "",
      qty: o.qty,
      remarks: o.remarks || "",
      date: o.outwardId?.outwardDate,
    }));

    let history = [...inwardData, ...outwardData];

    if (search) {
      const s = search.toLowerCase().trim();

      history = history.filter((h) => {
        const rowString = `
        ${h.type}
        ${h.transactionNo}
        ${h.name}
        ${h.productName}
        ${h.uom}
        ${h.qty}
        ${h.qty} ${h.uom}
        ${h.remarks}
        ${formatDate(h.date)}
        `.toLowerCase();

        return rowString.includes(s);
      });
    }

    if (sortField) {
      history = dynamicSort(history, sortField, sortOrder);
    } else {
      history.sort((a, b) => new Date(b.date) - new Date(a.date));
    }

    history = history.map((h) => ({
      ...h,
      date: formatDate(h.date),
    }));

    return res.json(history);
  } catch (error) {
    return handleError(error, res);
  }
};

/* =====================================================
   INWARD HISTORY
===================================================== */
exports.getProductInwardHistory = async (req, res) => {
  try {
    const { productId, search, sortField, sortOrder } = req.body;

    const data = await InwardItem.find({ productId })
      .populate({
        path: "inwardId",
        populate: {
          path: "createdBy",
          model: "User",
          select: "userName",
        },
      })
      .populate("productId", "productName uom");

    let result = data.map((item) => ({
      challanNo: item.inwardId?.challanNo || "",
      vendorName: item.inwardId?.vendorName || "",
      inwardBy: item.inwardId?.createdBy?.userName || "", // ✅ FIXED
      userName: item.inwardId?.createdBy?.userName || "",
      productName: item.productId?.productName || "",
      uom: item.productId?.uom || "",
      qty: item.qty,
      batchNo: item.batchNo || "",
      expDate: item.expDate,
      remarks: item.remarks || "",
      inwardDate: item.inwardId?.inwardDate,
    }));


    /* ===== SEARCH ===== */

    if (search) {
      const s = search.toLowerCase().trim();

      result = result.filter((r) => {
        const rowString = `
        ${r.challanNo}
        ${r.vendorName}
        ${r.inwardBy}
        ${r.userName}
        ${r.productName}
        ${r.uom}
        ${r.qty}
        ${r.qty} ${r.uom}
        ${r.batchNo}
        ${r.remarks}
        ${formatDate(r.inwardDate)}
        `.toLowerCase();

        return rowString.includes(s);
      });
    }


    /* ===== SORT ===== */

    const inwardSortMap = {
      challanNo: "challanNo",
      vendorName: "vendorName",
      inwardBy: "inwardBy",
      userName: "userName",
      productName: "productName",
      uom: "uom",
      qty: "qty",
      inwardDate: "inwardDate",
    };

    if (sortField && inwardSortMap[sortField]) {
      result = dynamicSort(result, inwardSortMap[sortField], sortOrder);
    } else {
      result.sort((a, b) => new Date(b.inwardDate) - new Date(a.inwardDate));
    }


    /* ===== DATE FORMAT ===== */

    result = result.map((r) => ({
      ...r,
      inwardDate: formatDate(r.inwardDate),
      expDate: formatDate(r.expDate),
    }));


    return res.json(result);

  } catch (error) {
    return handleError(error, res);
  }
};
/* =====================================================
   OUTWARD HISTORY
===================================================== */
exports.getProductOutwardHistory = async (req, res) => {
  try {
    const { productId, search, sortField, sortOrder } = req.body;

    const data = await OutwardItem.find({ productId })
      .populate({
        path: "outwardId",
        populate: {
          path: "createdBy",
          model: "User",
          select: "userName",
        },
      })
      .populate("productId", "productName uom");

    let result = data.map((item) => ({
      outwardNo: item.outwardId?.outwardNo || "",
      outwardName: item.outwardId?.outwardName || "",
      outwardBy: item.outwardId?.createdBy?.userName || "", // ✅ FIXED
      userName: item.outwardId?.createdBy?.userName || "",
      productName: item.productId?.productName || "",
      uom: item.productId?.uom || "",
      qty: item.qty,
      remarks: item.remarks || "",
      outwardDate: item.outwardId?.outwardDate,
    }));


    /* ===== SEARCH ===== */

    if (search) {
      const s = search.toLowerCase().trim();

      result = result.filter((r) => {
        const rowString = `
        ${r.outwardNo}
        ${r.outwardName}
        ${r.outwardBy}
        ${r.userName}
        ${r.productName}
        ${r.uom}
        ${r.qty}
        ${r.qty} ${r.uom}
        ${r.remarks}
        ${formatDate(r.outwardDate)}
        `.toLowerCase();

        return rowString.includes(s);
      });
    }


    /* ===== SORT ===== */

    const outwardSortMap = {
      outwardNo: "outwardNo",
      outwardName: "outwardName",
      outwardBy: "outwardBy",
      userName: "userName",
      productName: "productName",
      uom: "uom",
      qty: "qty",
      outwardDate: "outwardDate",
    };

    if (sortField && outwardSortMap[sortField]) {
      result = dynamicSort(result, outwardSortMap[sortField], sortOrder);
    } else {
      result.sort((a, b) => new Date(b.outwardDate) - new Date(a.outwardDate));
    }


    /* ===== DATE FORMAT ===== */

    result = result.map((r) => ({
      ...r,
      outwardDate: formatDate(r.outwardDate),
    }));


    return res.json(result);

  } catch (error) {
    return handleError(error, res);
  }
};
/* =====================================================
   LOW STOCK ALERT
===================================================== */

exports.getLowStockAlert = async (req, res) => {
  try {
    const {
      search,
      status,
      productName,
      category,
      warehouseReck,
      minQty,
      currentStock,
      templeName,
      sortField,
      sortOrder,
    } = req.body || {};

    const filter = {
      templeId: req.user.templeId,
    };

    if (status && status !== "All") {
      filter.status = status;
    }

    if (productName) {
      filter.productName = { $regex: productName, $options: "i" };
    }

    if (category) {
      filter.category = { $regex: category, $options: "i" };
    }

    if (warehouseReck) {
      filter.warehouseReck = { $regex: warehouseReck, $options: "i" };
    }

    const products = await Product.find(filter).populate(
      "templeId",
      "templeName",
    );

    if (!products.length) {
      return res.status(404).json({
        message: "No products found",
      });
    }

    let lowStockProducts = products
      .filter((p) => p.currentStock <= p.minQty)
      .map((p) => ({
        status: p.status,
        productName: p.productName,
        category: p.category,
        uom: p.uom,
        minQty: p.minQty,
        currentStock: p.currentStock,
        warehouseReck: p.warehouseReck,
        templeName: p.templeId?.templeName || "",
      }));

    /* COLUMN SEARCH */

    if (minQty) {
      const s = minQty.toLowerCase();
      lowStockProducts = lowStockProducts.filter((p) =>
        `${p.minQty} ${p.uom}`.toLowerCase().includes(s),
      );
    }

    if (currentStock) {
      const s = currentStock.toLowerCase();
      lowStockProducts = lowStockProducts.filter((p) =>
        `${p.currentStock} ${p.uom}`.toLowerCase().includes(s),
      );
    }

    if (templeName) {
      lowStockProducts = lowStockProducts.filter((p) =>
        p.templeName.toLowerCase().includes(templeName.toLowerCase()),
      );
    }

    /* GLOBAL SEARCH */

    if (search) {
      const s = search.toLowerCase().trim();

      lowStockProducts = lowStockProducts.filter((p) => {
        const rowString = `
          ${p.status}
          ${p.productName}
          ${p.category}
          ${p.uom}
          ${p.minQty}
          ${p.currentStock}
          ${p.warehouseReck}
          ${p.templeName}
        `.toLowerCase();

        return rowString.includes(s);
      });
    }

    /* SORTING */

    if (sortField) {
      lowStockProducts.sort((a, b) => {
        let valA = a[sortField];
        let valB = b[sortField];

        if (valA === undefined || valA === null) valA = "";
        if (valB === undefined || valB === null) valB = "";

        if (!isNaN(valA) && !isNaN(valB)) {
          valA = Number(valA);
          valB = Number(valB);
        }

        if (typeof valA === "string") valA = valA.toLowerCase();
        if (typeof valB === "string") valB = valB.toLowerCase();

        if (valA > valB) return sortOrder === "desc" ? -1 : 1;
        if (valA < valB) return sortOrder === "desc" ? 1 : -1;

        return 0;
      });
    } else {
      lowStockProducts.sort((a, b) =>
        a.productName.localeCompare(b.productName),
      );
    }

    if (!lowStockProducts.length) {
      return res.status(200).json({
        message: "No low stock products found",
        data: [],
      });
    }

    return res.status(200).json({
      message: "Low stock products fetched successfully",
      total: lowStockProducts.length,
      data: lowStockProducts,
    });
  } catch (error) {
    return handleError(error, res);
  }
};
/* =====================================================
   SLOW MOVING STOCK
===================================================== */
exports.getSlowMovingStock = async (req, res) => {
  try {
    const {
      days,
      search,
      productName,
      category,
      warehouseReck,
      minQty,
      currentStock,
      templeName,
      sortField,
      sortOrder
    } = req.body || {};

    if (!days || isNaN(days)) {
      return res.status(400).json({
        message: "Valid days value is required (30 / 60 / 90)"
      });
    }

    const dateLimit = new Date();
    dateLimit.setDate(dateLimit.getDate() - Number(days));

    const products = await Product.find({
      templeId: req.user.templeId
    }).populate("templeId", "templeName");

    if (!products.length) {
      return res.status(404).json({
        message: "No products found"
      });
    }

    const productIds = products.map(p => p._id);

    const recentOutward = await OutwardItem.find({
      productId: { $in: productIds },
      createdAt: { $gte: dateLimit }
    }).select("productId");

    const outwardProductIds = new Set(
      recentOutward.map(o => o.productId.toString())
    );

    let slowProducts = products
      .filter(p => !outwardProductIds.has(p._id.toString()))
      .map(p => ({
        status: p.status,
        productName: p.productName,
        category: p.category,
        uom: p.uom,
        minQty: p.minQty,
        currentStock: p.currentStock,
        warehouseReck: p.warehouseReck,
        templeName: p.templeId?.templeName || ""
      }));


    /* COLUMN SEARCH */

    if (productName) {
      slowProducts = slowProducts.filter(p =>
        p.productName.toLowerCase().includes(productName.toLowerCase())
      );
    }

    if (category) {
      slowProducts = slowProducts.filter(p =>
        p.category.toLowerCase().includes(category.toLowerCase())
      );
    }

    if (warehouseReck) {
      slowProducts = slowProducts.filter(p =>
        p.warehouseReck.toLowerCase().includes(warehouseReck.toLowerCase())
      );
    }

    if (minQty) {
      const s = minQty.toLowerCase();
      slowProducts = slowProducts.filter(p =>
        `${p.minQty} ${p.uom}`.toLowerCase().includes(s)
      );
    }

    if (currentStock) {
      const s = currentStock.toLowerCase();
      slowProducts = slowProducts.filter(p =>
        `${p.currentStock} ${p.uom}`.toLowerCase().includes(s)
      );
    }

    if (templeName) {
      slowProducts = slowProducts.filter(p =>
        p.templeName.toLowerCase().includes(templeName.toLowerCase())
      );
    }


    /* GLOBAL SEARCH */

    if (search) {
      const s = search.toLowerCase().trim();

      slowProducts = slowProducts.filter(p => {
        const rowString = `
          ${p.status}
          ${p.productName}
          ${p.category}
          ${p.uom}
          ${p.minQty}
          ${p.currentStock}
          ${p.warehouseReck}
          ${p.templeName}
        `.toLowerCase();

        return rowString.includes(s);
      });
    }


    /* SORTING */

    if (sortField) {
      slowProducts.sort((a, b) => {
        let valA = a[sortField];
        let valB = b[sortField];

        if (valA === undefined || valA === null) valA = "";
        if (valB === undefined || valB === null) valB = "";

        if (!isNaN(valA) && !isNaN(valB)) {
          valA = Number(valA);
          valB = Number(valB);
        }

        if (typeof valA === "string") valA = valA.toLowerCase();
        if (typeof valB === "string") valB = valB.toLowerCase();

        if (valA > valB) return sortOrder === "desc" ? -1 : 1;
        if (valA < valB) return sortOrder === "desc" ? 1 : -1;

        return 0;
      });
    } else {
      slowProducts.sort((a, b) =>
        a.productName.localeCompare(b.productName)
      );
    }


    if (!slowProducts.length) {
      return res.status(200).json({
        message: `No slow moving products found in last ${days} days`,
        data: []
      });
    }

    return res.status(200).json({
      message: "Slow moving products fetched successfully",
      total: slowProducts.length,
      data: slowProducts
    });

  } catch (error) {
    return handleError(error, res);
  }
};

/* =====================================================
   FAST MOVING STOCK
===================================================== */

exports.getFastMovingStock = async (req, res) => {
  try {

    const {
      search,
      status,
      productName,
      category,
      warehouseReck,
      minQty,
      currentStock,
      templeName,
      outwardQty,
      transactionCount,
      sortField,
      sortOrder
    } = req.body || {};


    const products = await Product.find({
      templeId: req.user.templeId
    }).populate("templeId", "templeName");


    if (!products.length) {
      return res.status(404).json({
        message: "No products found"
      });
    }


    const productIds = products.map(p => p._id);


    const outwardData = await OutwardItem.aggregate([
      {
        $match: {
          productId: { $in: productIds }
        }
      },
      {
        $group: {
          _id: "$productId",
          totalOutwardQty: { $sum: "$qty" },
          transactionCount: { $sum: 1 }
        }
      }
    ]);


    const movementMap = {};

    outwardData.forEach(o => {
      movementMap[o._id.toString()] = {
        outwardQty: o.totalOutwardQty,
        transactionCount: o.transactionCount
      };
    });


    let fastProducts = products
      .map(p => {

        const movement = movementMap[p._id.toString()] || {
          outwardQty: 0,
          transactionCount: 0
        };

        return {
          status: p.status,
          productName: p.productName,
          category: p.category,
          uom: p.uom,
          minQty: p.minQty,
          currentStock: p.currentStock,
          warehouseReck: p.warehouseReck,
          templeName: p.templeId?.templeName || "",
          outwardQty: movement.outwardQty,
          transactionCount: movement.transactionCount,
          movementScore:
            movement.outwardQty + movement.transactionCount
        };

      })
      .filter(p => p.outwardQty > 0);



    /* COLUMN SEARCH */


    if (status) {
      fastProducts = fastProducts.filter(p =>
        p.status.toLowerCase().includes(status.toLowerCase())
      );
    }


    if (productName) {
      fastProducts = fastProducts.filter(p =>
        p.productName.toLowerCase().includes(productName.toLowerCase())
      );
    }


    if (category) {
      fastProducts = fastProducts.filter(p =>
        p.category.toLowerCase().includes(category.toLowerCase())
      );
    }


    if (warehouseReck) {
      fastProducts = fastProducts.filter(p =>
        p.warehouseReck.toLowerCase().includes(warehouseReck.toLowerCase())
      );
    }


    if (minQty) {
      const s = minQty.toLowerCase();
      fastProducts = fastProducts.filter(p =>
        `${p.minQty} ${p.uom}`.toLowerCase().includes(s)
      );
    }


    if (currentStock) {
      const s = currentStock.toLowerCase();
      fastProducts = fastProducts.filter(p =>
        `${p.currentStock} ${p.uom}`.toLowerCase().includes(s)
      );
    }


    if (templeName) {
      fastProducts = fastProducts.filter(p =>
        p.templeName.toLowerCase().includes(templeName.toLowerCase())
      );
    }


    if (outwardQty) {
      fastProducts = fastProducts.filter(p =>
        String(p.outwardQty).includes(outwardQty)
      );
    }


    if (transactionCount) {
      fastProducts = fastProducts.filter(p =>
        String(p.transactionCount).includes(transactionCount)
      );
    }



    /* GLOBAL SEARCH */


    if (search) {

      const s = search.toLowerCase().trim();

      fastProducts = fastProducts.filter(p => {

        const rowString = `
          ${p.status}
          ${p.productName}
          ${p.category}
          ${p.uom}
          ${p.minQty}
          ${p.currentStock}
          ${p.warehouseReck}
          ${p.templeName}
          ${String(p.outwardQty)}
          ${String(p.transactionCount)}
        `.toLowerCase();

        return rowString.includes(s);

      });

    }



    /* SORTING */


    if (sortField) {

      fastProducts.sort((a, b) => {

        let valA = a[sortField];
        let valB = b[sortField];

        if (!isNaN(valA) && !isNaN(valB)) {
          valA = Number(valA);
          valB = Number(valB);
        }

        if (typeof valA === "string") valA = valA.toLowerCase();
        if (typeof valB === "string") valB = valB.toLowerCase();

        if (valA > valB) return sortOrder === "desc" ? -1 : 1;
        if (valA < valB) return sortOrder === "desc" ? 1 : -1;

        return 0;

      });

    } else {

      fastProducts.sort((a, b) =>
        b.movementScore - a.movementScore
      );

    }



    if (!fastProducts.length) {
      return res.status(200).json({
        message: "No fast moving products found",
        data: []
      });
    }


    return res.status(200).json({
      message: "Fast moving products fetched successfully",
      total: fastProducts.length,
      data: fastProducts
    });

  } catch (error) {
    return handleError(error, res);
  }
};

/* =====================================================
   DAILY STOCK REPORT
===================================================== */
exports.getDailyStockReport = async (req, res) => {
  try {
    const {
      startDate,
      endDate,
      search,
      type,
      transactionNo,
      name,
      productName,
      qty,
      sortField,
      sortOrder,
    } = req.body || {};

    /* ===== DATE RANGE ===== */

    const today = new Date().toISOString().split("T")[0];

    const start = new Date(startDate || today);
    start.setHours(0, 0, 0, 0);

    const end = new Date(endDate || today);
    end.setHours(23, 59, 59, 999);

    if (start > end) {
      return res.status(400).json({
        message: "Start date cannot be greater than end date",
      });
    }

    /* ===== FETCH INWARD ===== */

    const inward = await InwardItem.find()
      .populate("inwardId")
      .populate("productId", "productName uom");

    const inwardData = inward
      .filter((i) => {
        const d = new Date(i.createdAt);
        return d >= start && d <= end;
      })
      .map((i) => ({
        type: "INWARD",
        transactionNo: i.inwardId?.challanNo || "",
        name: i.inwardId?.vendorName || "",
        productName: i.productId?.productName || "",
        uom: i.productId?.uom || "",
        qty: i.qty,
        remarks: i.remarks || "",
        date: i.createdAt,
      }));

    /* ===== FETCH OUTWARD ===== */

    const outward = await OutwardItem.find()
      .populate("outwardId")
      .populate("productId", "productName uom");

    const outwardData = outward
      .filter((o) => {
        const d = new Date(o.createdAt);
        return d >= start && d <= end;
      })
      .map((o) => ({
        type: "OUTWARD",
        transactionNo: o.outwardId?.outwardNo || "",
        name: o.outwardId?.outwardName || "",
        productName: o.productId?.productName || "",
        uom: o.productId?.uom || "",
        qty: o.qty,
        remarks: o.remarks || "",
        date: o.createdAt,
      }));

    /* ===== MERGE DATA ===== */

    let report = [...inwardData, ...outwardData];

    /* ===== COLUMN SEARCH ===== */

    if (type) {
      report = report.filter((r) =>
        r.type.toLowerCase().includes(type.toLowerCase())
      );
    }

    if (transactionNo) {
      report = report.filter((r) =>
        r.transactionNo.toLowerCase().includes(transactionNo.toLowerCase())
      );
    }

    if (name) {
      report = report.filter((r) =>
        r.name.toLowerCase().includes(name.toLowerCase())
      );
    }

    if (productName) {
      report = report.filter((r) =>
        r.productName.toLowerCase().includes(productName.toLowerCase())
      );
    }

    if (qty) {
      const s = qty.toLowerCase();
      report = report.filter((r) =>
        `${r.qty} ${r.uom}`.toLowerCase().includes(s)
      );
    }

    /* ===== GLOBAL SEARCH ===== */

    if (search) {
      const s = search.toLowerCase().trim();

      report = report.filter((r) => {
        const rowString = `
          ${r.type}
          ${r.transactionNo}
          ${r.name}
          ${r.productName}
          ${r.qty}
          ${r.uom}
          ${r.remarks}
        `.toLowerCase();

        return rowString.includes(s);
      });
    }

    /* ===== SORTING ===== */

    if (sortField) {
      report.sort((a, b) => {
        let valA = a[sortField];
        let valB = b[sortField];

        if (valA === undefined || valA === null) valA = "";
        if (valB === undefined || valB === null) valB = "";

        if (!isNaN(valA) && !isNaN(valB)) {
          valA = Number(valA);
          valB = Number(valB);
        }

        if (typeof valA === "string") valA = valA.toLowerCase();
        if (typeof valB === "string") valB = valB.toLowerCase();

        if (valA > valB) return sortOrder === "desc" ? -1 : 1;
        if (valA < valB) return sortOrder === "desc" ? 1 : -1;

        return 0;
      });
    } else {
      report.sort((a, b) => new Date(b.date) - new Date(a.date));
    }

    /* ===== EMPTY RESULT ===== */

    if (!report.length) {
      return res.status(200).json({
        message: "No transactions found",
        data: [],
      });
    }

    return res.status(200).json({
      message: "Daily stock report fetched successfully",
      total: report.length,
      data: report,
    });

  } catch (error) {
    return handleError(error, res);
  }
};