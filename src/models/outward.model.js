const mongoose = require("mongoose");

const outwardSchema = new mongoose.Schema(
  {
    templeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Temple",
      required: true,
    },

    customerName: {
      type: String,
      required: [true, "Customer name is required"],
      trim: true,
    },

    customerMobile: {
      type: String, // ✅ optional only (no validation)
    },

    outwardNo: {
      type: String,
      required: [true, "Outward number is required"],
      trim: true,
    },

    outwardDate: {
      type: Date,
      required: [true, "Outward date is required"],
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

module.exports = mongoose.model("Outward", outwardSchema);