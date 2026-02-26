const mongoose = require("mongoose");

const inwardSchema = new mongoose.Schema(
  {
    templeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Temple",
      required: true,
    },

    vendorName: {
      type: String,
      required: [true, "Vendor name is required"],
      trim: true,
    },

    vendorMobile: {
      type: String,
    },

    vendorAddress: {
      type: String,
      required: [true, "Vendor address is required"],
      trim: true,
    },

    challanNo: {
      type: String,
      required: [true, "Challan number is required"],
      trim: true,
    },

    inwardDate: {
      type: Date,
      required: [true, "Inward date is required"],
    },

    description: {
      type: String,
      trim: true,
    },

    status: {
      type: String,
      enum: ["Active", "Inactive"],
      default: "Active",
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Inward", inwardSchema);
