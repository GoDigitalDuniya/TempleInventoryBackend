const mongoose = require("mongoose");

const inwardItemSchema = new mongoose.Schema({
  inwardId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Inward",
    required: true
  },

  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
    required: true
  },

  remarks: String,

  qty: {
    type: Number,
    required: true
  },

  batchNo: String,

  expDate: String,

}, { timestamps: true });

module.exports = mongoose.model("InwardItem", inwardItemSchema);
