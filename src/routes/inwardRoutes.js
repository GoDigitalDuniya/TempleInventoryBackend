const express = require("express");
const router = express.Router();
const versionCheck = require("../middlewares/versionCheck");
const auth = require("../middlewares/authMiddleware");
const {
  createInward,
  getInwardList,
  updateInward,
  deleteInward,   
} = require("../controllers/inwardController");

router.post("/create", auth,versionCheck, createInward);
router.post("/list", auth, versionCheck,getInwardList);
router.post("/update", auth,versionCheck, updateInward);
router.post("/delete", auth, versionCheck, deleteInward);   

module.exports = router;