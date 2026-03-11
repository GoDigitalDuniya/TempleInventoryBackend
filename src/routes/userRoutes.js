const express = require("express");
const router = express.Router();

const auth = require("../middlewares/authMiddleware");
const versionCheck = require("../middlewares/versionCheck");
const {
  createUser,
  listUsers,
  updateUser,
} = require("../controllers/userController");

router.post("/create", auth, versionCheck, createUser);
router.post("/list", auth, versionCheck, listUsers);
router.post("/update", auth, versionCheck, updateUser);

module.exports = router;
