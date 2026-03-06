const router = require("express").Router();
const stockController = require("../controllers/stockController");
const auth = require("../middlewares/authMiddleware");

router.post("/list", auth, stockController.getStockList);


router.post("/transactions", auth, stockController.getTransactionHistory);

router.post("/inward-history", auth, stockController.getProductInwardHistory);

router.post("/outward-history", auth, stockController.getProductOutwardHistory);

module.exports = router;