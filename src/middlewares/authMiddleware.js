const jwt = require("jsonwebtoken");
const User = require("../models/user.model");

module.exports = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(" ")[1];

    if (!token) {
      return res.status(401).json({ message: "No token provided" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);

    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    if (user.status !== "Active") {
      return res.status(403).json({ message: "User inactive" });
    }

    // Verify if the token in request matches the one stored in DB
    if (user.token !== token) {
      return res.status(401).json({
        message: "Logged out: Account is active on another device"
      });
    }

    req.user = {
      _id: user._id,
      templeId: user.templeId,
      role: user.role
    };

    next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};