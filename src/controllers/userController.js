const User = require("../models/user.model");

/* ================= DATE FORMATTER ================= */

const formatDate = (date) => {
  if (!date) return null;
  return new Date(date).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

/* ================= CREATE USER ================= */

exports.createUser = async (req, res) => {
  try {
    if (req.user.role !== "Admin") {
      return res.status(403).json({
        message: "Only Admin can create users",
      });
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

    /* ========= PROFESSIONAL VALIDATION ========= */

    if (!userId || !userId.trim()) {
      return res.status(400).json({ message: "User ID is required" });
    }

    if (!templeId) {
      return res.status(400).json({ message: "Temple ID is required" });
    }

    if (!role) {
      return res.status(400).json({ message: "User role is required" });
    }

    if (!userName || !userName.trim()) {
      return res.status(400).json({ message: "User name is required" });
    }

    if (!mobile || !mobile.trim()) {
      return res.status(400).json({ message: "Mobile number is required" });
    }

    if (!loginId || !loginId.trim()) {
      return res.status(400).json({ message: "Login ID is required" });
    }

    if (!password || password.length < 6) {
      return res.status(400).json({
        message: "Password must be at least 6 characters long",
      });
    }

    if (status && !["Active", "Inactive"].includes(status)) {
      return res.status(400).json({
        message: "Invalid user status",
      });
    }

    /* ========= DUPLICATE LOGIN CHECK ========= */

    const existingUser = await User.findOne({
      loginId: loginId.trim(),
    });

    if (existingUser) {
      return res.status(400).json({
        message: "Login ID already exists",
      });
    }

    /* ========= CREATE USER ========= */

    const user = await User.create({
      userId: userId.trim(),
      templeId,
      role,
      userName: userName.trim(),
      mobile: mobile.trim(),
      loginId: loginId.trim(),
      password,
      status: status || "Active",
    });

    return res.status(201).json({
      message: "User created successfully",
      user,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

/* ================= LIST USERS ================= */

exports.listUsers = async (req, res) => {
  try {
    const {
      search,
      role,
      status,
      userName,
      loginId,
      mobile,
      templeId,
      sortField,
      sortOrder,
    } = req.body || {};

    const filter = {};

    /* ========= VALIDATION ========= */

    if (
      status &&
      status !== "All" &&
      !["Active", "Inactive"].includes(status)
    ) {
      return res.status(400).json({
        message: "Invalid status filter",
      });
    }

    /* ================= TEMPLE SECURITY ================= */

    if (req.user.role === "Admin") {
      if (templeId) filter.templeId = templeId;
    } else {
      filter.templeId = req.user.templeId;
    }

    /* ================= COLUMN FILTERS ================= */

    if (role && role !== "Role") filter.role = role;
    if (status && status !== "All") filter.status = status;
    if (userName) filter.userName = { $regex: userName, $options: "i" };
    if (loginId) filter.loginId = { $regex: loginId, $options: "i" };
    if (mobile) filter.mobile = { $regex: mobile, $options: "i" };

    /* ================= GLOBAL SEARCH ================= */

    if (search) {
      filter.$or = [
        { userName: { $regex: search, $options: "i" } },
        { loginId: { $regex: search, $options: "i" } },
        { mobile: { $regex: search, $options: "i" } },
        { role: { $regex: search, $options: "i" } },
        { status: { $regex: search, $options: "i" } },
      ];
    }

    /* ================= SORT ================= */

    let sortOptions = { createdAt: -1 };
    if (sortField) {
      sortOptions = {
        [sortField]: sortOrder === "asc" ? 1 : -1,
      };
    }

    const users = await User.find(filter).sort(sortOptions);

    const formattedUsers = users.map((u) => ({
      ...u.toObject(),
      createdAt: formatDate(u.createdAt),
      updatedAt: formatDate(u.updatedAt),
    }));

    return res.json(formattedUsers);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

/* ================= UPDATE USER ================= */

exports.updateUser = async (req, res) => {
  try {
    const { id, ...updateData } = req.body || {};

    if (!id) {
      return res.status(400).json({
        message: "User ID is required",
      });
    }

    if (updateData.userName !== undefined && !updateData.userName.trim()) {
      return res.status(400).json({
        message: "User name cannot be empty",
      });
    }

    if (updateData.mobile !== undefined && !updateData.mobile.trim()) {
      return res.status(400).json({
        message: "Mobile number cannot be empty",
      });
    }

    if (
      updateData.status &&
      !["Active", "Inactive"].includes(updateData.status)
    ) {
      return res.status(400).json({
        message: "Invalid user status",
      });
    }

    let filter = { _id: id };

    if (req.user.role !== "Admin") {
      filter.templeId = req.user.templeId;
    }

    const user = await User.findOneAndUpdate(filter, updateData, {
      returnDocument: "after",
    });

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    return res.json({
      message: "User updated successfully",
      user,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};
