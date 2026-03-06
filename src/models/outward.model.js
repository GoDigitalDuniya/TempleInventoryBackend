const mongoose = require("mongoose");

const outwardSchema = new mongoose.Schema(
  {
    templeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Temple",
      required: true,
    },

    outwardName: {
      type: String,
      required: [true, "outward name is required"],
      trim: true,
    },

    outwardMobile: {
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