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
      required: true,
    },

    vendorMobile: {
      type: String,
      required: true,
    },

    vendorAddress: {
      type: String,
      required: true,
    },

    challanNo: {
      type: String,
      required: true,
    },

    inwardDate: {
      type: Date,
      required: true,
    },

    description: String,

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
