const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    templeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Temple",
      required: true,
    },

    category: {
      type: String,
      required: true,
    },

    productName: {
      type: String,
      required: true,
    },

    uom: {
      type: String,
      required: true,
    },

    minQty: {
      type: Number,
      required: true,
    },

    currentStock: {
      type: Number,
      default: 0,
    },

    warehouseReck: {   // keeping your original naming
      type: String,
      required: true,
    },

    status: {
      type: String,
      default: "Active",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Product", productSchema);