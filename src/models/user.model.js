const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    unique: true
  },

  templeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Temple",
    required: true
  },

  role: {
    type: String,
    enum: ["Admin", "User"],
    required: true
  },

  userName: {
    type: String,
    required: true
  },

  mobile: {
    type: String,
    required: true
  },

  loginId: {
    type: String,
    required: true,
    unique: true,
    lowercase: true
  },

  password: {
    type: String,
    required: true  
  },

  status: {
    type: String,
    enum: ["Active", "Deactive"],
    default: "Active"
  },

  lastLogin: Date

}, { timestamps: true });

module.exports = mongoose.model("User", userSchema);
