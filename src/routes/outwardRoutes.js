const express = require("express");
const router = express.Router();

const auth = require("../middlewares/authMiddleware");

const {
  createOutward,
  getOutwardList,
  updateOutward
} = require("../controllers/outwardController");

router.post("/create", auth, createOutward);
router.post("/list", auth, getOutwardList);
router.post("/update", auth, updateOutward);

module.exports = router;
