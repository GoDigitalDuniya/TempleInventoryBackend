const express = require("express");
const router = express.Router();

const auth = require("../middlewares/authMiddleware");
const versionCheck = require("../middlewares/versionCheck");
const {
  createTemple,
  getTempleList,
  updateTemple,
} = require("../controllers/templeController");

router.post("/create", auth,versionCheck, createTemple);
router.post("/list", auth,versionCheck, getTempleList);
router.post("/update", auth,versionCheck, updateTemple);

module.exports = router;
