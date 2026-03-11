const express = require("express");
const router = express.Router();
const versionCheck = require("../middlewares/versionCheck");
const auth = require("../middlewares/authMiddleware");

const {
  createProduct,
  listProducts,
  updateProduct,
  getCategoryList  
} = require("../controllers/productController");

router.post("/create", auth,versionCheck, createProduct);
router.post("/list", auth,versionCheck, listProducts);
router.post("/update", auth,versionCheck, updateProduct);
router.post("/categories", auth,versionCheck, getCategoryList); 

module.exports = router;