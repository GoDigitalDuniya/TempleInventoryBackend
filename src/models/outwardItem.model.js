const mongoose = require("mongoose");

const outwardItemSchema = new mongoose.Schema({
  outwardId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Outward",
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
  }

}, { timestamps: true });

module.exports = mongoose.model("OutwardItem", outwardItemSchema);
