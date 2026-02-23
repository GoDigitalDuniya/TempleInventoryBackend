const User = require("../models/user.model");

/* ================= CREATE USER ================= */

exports.createUser = async (req, res) => {
  try {
    if (req.user.role !== "Admin") {
      return res.status(403).json({ message: "Only Admin can create users" });
    }

    const {
      userId,
      templeId,
      role,
      userName,
      mobile,
      loginId,
      password,
      status,
    } = req.body;

    if (!userId || !templeId || !role || !userName || !loginId || !password) {
      return res.status(400).json({ message: "Required fields missing" });
    }

    const existingUser = await User.findOne({ loginId });
    if (existingUser) {
      return res.status(400).json({ message: "Login ID already exists" });
    }

    const user = await User.create({
      userId,
      templeId,
      role,
      userName,
      mobile,
      loginId,
      password,
      status: status || "Active",
    });

    return res.status(201).json({
      message: "User created successfully",
      user,
    });

  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};


/* ================= LIST USERS (UI PERFECT FILTER MATCH) ================= */

exports.listUsers = async (req, res) => {
  try {
    const {
      search,
      role,
      status,
      userName,
      loginId,
      mobile,
      templeId, // optional filter
    } = req.body || {};

    const filter = {};

    /* ===== Temple Logic ===== */
    if (req.user.role === "Admin") {
      // Admin can see all OR filter by temple
      if (templeId) {
        filter.templeId = templeId;
      }
    } else {
      // Normal users only see their own temple
      filter.templeId = req.user.templeId;
    }

    /* ===== Global Search ===== */
    if (search) {
      filter.$or = [
        { userName: { $regex: search, $options: "i" } },
        { loginId: { $regex: search, $options: "i" } },
        { mobile: { $regex: search, $options: "i" } },
        { role: { $regex: search, $options: "i" } },
      ];
    }

    /* ===== Header Filters ===== */
    if (role && role !== "Role") {
      filter.role = role;
    }

    if (status && status !== "All") {
      filter.status = status;
    }

    /* ===== Column Filters ===== */
    if (userName) {
      filter.userName = { $regex: userName, $options: "i" };
    }

    if (loginId) {
      filter.loginId = { $regex: loginId, $options: "i" };
    }

    if (mobile) {
      filter.mobile = { $regex: mobile, $options: "i" };
    }

    const users = await User.find(filter) 
      .sort({ createdAt: -1 });

    return res.json(users);

  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};


/* ================= UPDATE USER ================= */

exports.updateUser = async (req, res) => {
  try {
    const { id, ...updateData } = req.body || {};

    if (!id) {
      return res.status(400).json({ message: "User ID required" });
    }

    let filter = { _id: id };

    // Non-admin users only update their temple users
    if (req.user.role !== "Admin") {
      filter.templeId = req.user.templeId;
    }

    const user = await User.findOneAndUpdate(
      filter,
      updateData,
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.json({
      message: "User updated successfully",
      user,
    });

  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};