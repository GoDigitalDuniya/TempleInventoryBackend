const express = require("express");
const router = express.Router();

const auth = require("../middlewares/authMiddleware");

const {
  createTemple,
  getTempleList,
  updateTemple,
} = require("../controllers/templeController");

router.post("/create", auth, createTemple);
router.post("/list", auth, getTempleList);
router.post("/update", auth, updateTemple);

module.exports = router;
