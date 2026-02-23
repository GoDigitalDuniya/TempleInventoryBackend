const express = require("express");
const router = express.Router();

const auth = require("../middlewares/authMiddleware");

const {
  createInward,
  getInwardList,
  updateInward,
  
} = require("../controllers/inwardController");

router.post("/create", auth, createInward);
router.post("/list", auth, getInwardList);
router.post("/update", auth, updateInward);


module.exports = router;