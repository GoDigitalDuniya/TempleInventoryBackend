const express = require("express");
const router = express.Router();
const versionCheck = require("../middlewares/versionCheck");
const auth = require("../middlewares/authMiddleware");

const {
  createOutward,
  getOutwardList,
  updateOutward,
  deleteOutward,
} = require("../controllers/outwardController");

router.post("/create", auth,versionCheck, createOutward);
router.post("/list", auth,versionCheck, getOutwardList);
router.post("/update", auth,versionCheck, updateOutward);
router.post("/delete", auth,versionCheck, deleteOutward);

module.exports = router;