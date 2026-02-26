const express = require("express");
const router = express.Router();

const auth = require("../middlewares/authMiddleware");

const {
  createOutward,
  getOutwardList,
  updateOutward,
  deleteOutward,
} = require("../controllers/outwardController");

router.post("/create", auth, createOutward);
router.post("/list", auth, getOutwardList);
router.post("/update", auth, updateOutward);
router.post("/delete", auth, deleteOutward);

module.exports = router;