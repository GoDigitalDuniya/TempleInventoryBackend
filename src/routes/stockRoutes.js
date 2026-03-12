const router = require("express").Router();
const stockController = require("../controllers/stockController");
const auth = require("../middlewares/authMiddleware");
const versionCheck = require("../middlewares/versionCheck");

router.post("/list", auth,versionCheck, stockController.getStockList);

router.post("/transactions", auth,versionCheck, stockController.getTransactionHistory);

router.post("/inward-history", auth,versionCheck, stockController.getProductInwardHistory);

router.post("/outward-history", auth,versionCheck, stockController.getProductOutwardHistory);

router.post("/low-stock-alert", auth, versionCheck, stockController.getLowStockAlert);

router.post("/slow-moving", auth, versionCheck, stockController.getSlowMovingStock);

router.post("/fast-moving", auth, versionCheck, stockController.getFastMovingStock);

router.post("/daily-stock-report", auth, versionCheck, stockController.getDailyStockReport);

module.exports = router;