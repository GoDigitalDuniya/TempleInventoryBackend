const User = require("../models/user.model");
const jwt = require("jsonwebtoken");

exports.loginUser = async (req, res) => {
  try {
    const { loginId, password } = req.body;

    if (!loginId || !password) {
      return res.status(400).json({ message: "All fields required" });
    }

    const user = await User.findOne({ loginId });

    if (!user || user.password !== password) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    if (user.status !== "Active") {
      return res.status(403).json({ message: "User inactive" });
    }

    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    // Update database with the latest token to invalidate previous sessions
    user.token = token;
    user.lastLogin = new Date();

    await user.save();

    res.json({
      message: "Login successful",
      token,
      user: {
        id: user._id,
        userName: user.userName,
        role: user.role,
        templeId: user.templeId
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.logoutUser = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (user) {
      user.token = null;
      await user.save();
    }
    res.json({ message: "Logout successful" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
