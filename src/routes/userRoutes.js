const express = require("express");
const router = express.Router();

const auth = require("../middlewares/authMiddleware");

const {
  createUser,
  listUsers,
  updateUser,
} = require("../controllers/userController");

router.post("/create", auth, createUser);
router.post("/list", auth, listUsers);
router.post("/update", auth, updateUser);

module.exports = router;