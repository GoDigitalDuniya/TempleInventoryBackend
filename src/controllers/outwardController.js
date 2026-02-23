const Outward = require("../models/outward.model");
const OutwardItem = require("../models/outwardItem.model");
const Product = require("../models/product.model");

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

    if (!items || items.length === 0) {
      return res.status(400).json({ message: "Items required" });
    }

    const outward = await Outward.create({
      templeId: req.user.templeId,
      customerName,
      customerMobile,
      outwardNo,
      outwardDate,
      description,
      status: "Active",
      createdBy: req.user._id,
    });

    for (const item of items) {
      const product = await Product.findById(item.productId);

      if (!product || product.currentStock < Number(item.qty)) {
        return res.status(400).json({
          message: `Insufficient stock for product`,
        });
      }

      await OutwardItem.create({
        outwardId: outward._id,
        productId: item.productId,
        remarks: item.remarks,
        qty: item.qty,
      });

      await Product.findByIdAndUpdate(
        item.productId,
        { $inc: { currentStock: -Number(item.qty) } }
      );
    }

    return res.status(201).json({
      message: "Outward created successfully",
    });

  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};


/* ================= LIST OUTWARD (WITH FILTER) ================= */

exports.getOutwardList = async (req, res) => {
  try {
    const {
      customerName,
      customerMobile,
      outwardNo,
      outwardBy,
      status,
      startDate,
      endDate,
    } = req.body || {};

    const filter = {
      templeId: req.user.templeId,
    };

    if (customerName) {
      filter.customerName = { $regex: customerName, $options: "i" };
    }

    if (customerMobile) {
      filter.customerMobile = { $regex: customerMobile, $options: "i" };
    }

    if (outwardNo) {
      filter.outwardNo = { $regex: outwardNo, $options: "i" };
    }

    if (status && status !== "All") {
      filter.status = status;
    }

    if (startDate && endDate) {
      filter.outwardDate = {
        $gte: new Date(startDate + "T00:00:00"),
        $lte: new Date(endDate + "T23:59:59"),
      };
    }

    const outwards = await Outward.find(filter)
      .populate("createdBy", "userName role")
      .sort({ createdAt: -1 });

    const result = await Promise.all(
      outwards.map(async (outward) => {
        const items = await OutwardItem.find({
          outwardId: outward._id,
        }).populate("productId", "productName");

        // 🔍 Outward By filter applied after populate
        if (
          outwardBy &&
          !outward.createdBy?.userName
            ?.toLowerCase()
            .includes(outwardBy.toLowerCase())
        ) {
          return null;
        }

        return {
          ...outward.toObject(),
          outwardBy: outward.createdBy?.userName || "",
          items,
        };
      })
    );

    return res.json(result.filter(Boolean));

  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

/* ================= UPDATE OUTWARD ================= */

exports.updateOutward = async (req, res) => {
  try {
    const {
      outwardId,
      customerName,
      customerMobile,
      description,
      status,
    } = req.body;

    if (!outwardId) {
      return res.status(400).json({ message: "Outward ID required" });
    }

    const outward = await Outward.findOneAndUpdate(
      { _id: outwardId, templeId: req.user.templeId },
      {
        customerName,
        customerMobile,
        description,
        status,
      },
      { new: true }
    );

    if (!outward) {
      return res.status(404).json({ message: "Outward not found" });
    }

    return res.json({
      message: "Outward updated successfully",
      outward,
    });

  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};