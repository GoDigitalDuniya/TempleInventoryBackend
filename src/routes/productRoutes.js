const express = require("express");
const router = express.Router();

const auth = require("../middlewares/authMiddleware");

const {
  createProduct,
  listProducts,
  updateProduct,
  getCategoryList  
} = require("../controllers/productController");

router.post("/create", auth, createProduct);
router.post("/list", auth, listProducts);
router.post("/update", auth, updateProduct);
router.post("/categories", auth, getCategoryList); 

module.exports = router;