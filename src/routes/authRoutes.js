const express = require("express");
const { loginUser, logoutUser } = require("../controllers/authcontroller");
const auth = require("../middlewares/authMiddleware"); // ⭐ import middleware
const versionCheck = require("../middlewares/versionCheck");
const router = express.Router();

router.post("/login", versionCheck ,loginUser);
router.post("/logout", auth,  logoutUser);

module.exports = router;