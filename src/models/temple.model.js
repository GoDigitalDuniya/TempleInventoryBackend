const mongoose = require("mongoose");

const templeSchema = new mongoose.Schema(
  {
    templeName: {
      type: String,
      required: true,
      trim: true
    },

    templeCode: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true
    },

    address: {
      type: String,
      required: true,
      trim: true
    },

    status: {
      type: String,
      enum: ["Active", "Inactive"],
      default: "Active"
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Temple", templeSchema);
