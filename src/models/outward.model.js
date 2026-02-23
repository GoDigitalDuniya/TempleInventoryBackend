const mongoose = require("mongoose");

const outwardSchema = new mongoose.Schema({
  templeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Temple",
    required: true
  },

  customerName: {
    type: String,
    required: true
  },

  customerMobile: {
    type: String,
    required: true
  },

  outwardNo: {
    type: String,
    required: true
  },

  outwardDate: {
    type: Date,
    required: true
  },

  description: String,

  status: {
    type: String,
    enum: ["Active", "Inactive"],
    default: "Active"
  },

  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  }

}, { timestamps: true });

module.exports = mongoose.model("Outward", outwardSchema);