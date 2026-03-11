const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");

const authRoutes = require("./routes/authRoutes");
const templeRoutes = require("./routes/templeRoutes");
const productRoutes = require("./routes/productRoutes");
const inwardRoutes = require("./routes/inwardRoutes");
const outwardRoutes = require("./routes/outwardRoutes");
const userRoutes = require("./routes/userRoutes");
const stockRoutes = require("./routes/stockRoutes");
const versionRoutes = require("./routes/versionRoutes");



const app = express();

/* ========== MIDDLEWARE ========== */

app.use(
  cors({
    origin: "*",
    credentials: true,
  }),
);

app.use(express.json());
app.use(cookieParser());

/* ========== ROUTES ========== */

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/temples", templeRoutes);
app.use("/api/products", productRoutes);
app.use("/api/inward", inwardRoutes);
app.use("/api/outward", outwardRoutes);
app.use("/api/stock", stockRoutes);
app.use("/api/version", versionRoutes);

/* ========== TEST ROUTE ========== */

app.get("/", (req, res) => {
  res.send("Temple Inventory API Running 🚀");
});

module.exports = app;
