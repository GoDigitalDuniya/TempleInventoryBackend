const express = require("express");
const router = express.Router();

const auth = require("../middlewares/authMiddleware");

const {
  createProduct,
  listProducts,
  updateProduct,
} = require("../controllers/productController");

router.post("/create", auth, createProduct);
router.post("/list", auth, listProducts);
router.post("/update", auth, updateProduct);

module.exports = router;
