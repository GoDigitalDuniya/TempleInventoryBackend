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
      .populate("inwardId")
      .populate("productId", "productName uom");

    let result = data.map((item) => ({
      challanNo: item.inwardId?.challanNo || "",
      vendorName: item.inwardId?.vendorName || "",
      productName: item.productId?.productName || "",
      uom: item.productId?.uom || "",
      qty: item.qty,
      batchNo: item.batchNo || "",
      expDate: item.expDate,
      remarks: item.remarks || "",
      inwardDate: item.inwardId?.inwardDate,
    }));

    if (search) {
      const s = search.toLowerCase().trim();

      result = result.filter((r) => {
        const rowString = `
        ${r.challanNo}
        ${r.vendorName}
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

    const inwardSortMap = {
      challanNo: "challanNo",
      vendorName: "vendorName",
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
      .populate("outwardId")
      .populate("productId", "productName uom");

    let result = data.map((item) => ({
      outwardNo: item.outwardId?.outwardNo || "",
      outwardName: item.outwardId?.outwardName || "",
      productName: item.productId?.productName || "",
      uom: item.productId?.uom || "",
      qty: item.qty,
      remarks: item.remarks || "",
      outwardDate: item.outwardId?.outwardDate,
    }));

    if (search) {
      const s = search.toLowerCase().trim();

      result = result.filter((r) => {
        const rowString = `
        ${r.outwardNo}
        ${r.outwardName}
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

    const outwardSortMap = {
      outwardNo: "outwardNo",
      outwardName: "outwardName",
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

    result = result.map((r) => ({
      ...r,
      outwardDate: formatDate(r.outwardDate),
    }));

    return res.json(result);

  } catch (error) {
    return handleError(error, res);
  }
};