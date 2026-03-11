const express = require("express");
const router = express.Router();
const versionCheck = require("../middlewares/versionCheck");
const {
  createVersion,
  getLatestVersion
} = require("../controllers/versionController");

router.post("/create",versionCheck, createVersion);

router.post("/latest", versionCheck, getLatestVersion);

module.exports = router;