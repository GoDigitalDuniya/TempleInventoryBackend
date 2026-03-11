const User = require("../models/user.model");

/* ================= DATE FORMATTER ================= */
const formatDate = (date) => {
  if (!date) return null;

  return new Date(date)
    .toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
      timeZone: "Asia/Kolkata",
    })
    .replace(",", "");
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

    if (!userId?.trim())
      return res.status(400).json({ message: "User ID is required" });

    if (!templeId)
      return res.status(400).json({ message: "Temple ID is required" });

    if (!role)
      return res.status(400).json({ message: "User role is required" });

    if (!userName?.trim())
      return res.status(400).json({ message: "User name is required" });

    if (!mobile?.trim())
      return res.status(400).json({ message: "Mobile number is required" });

    if (!loginId?.trim())
      return res.status(400).json({ message: "Login ID is required" });

    if (!password || password.length < 6) {
      return res.status(400).json({
        message: "Password must be at least 6 characters",
      });
    }

    const existingUser = await User.findOne({
      loginId: loginId.trim(),
    });

    if (existingUser) {
      return res.status(400).json({
        message: "Login ID already exists",
      });
    }

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
      message: error.message,
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
      templeName,
      templeId,
      sortField,
      sortOrder,
    } = req.body || {};

    const match = {};

    /* ===== TEMPLE SECURITY ===== */

    if (req.user.role === "Admin") {
      if (templeId) match.templeId = templeId;
    } else {
      match.templeId = req.user.templeId;
    }

    /* ===== COLUMN FILTERS ===== */

    if (role && role !== "Role") {
      match.role = { $regex: role, $options: "i" };
    }

    if (status && status !== "All") {
      match.status = status;
    }

    if (userName) {
      match.userName = { $regex: userName, $options: "i" };
    }

    if (loginId) {
      match.loginId = { $regex: loginId, $options: "i" };
    }

    if (mobile) {
      match.mobile = { $regex: mobile, $options: "i" };
    }

    const pipeline = [
      { $match: match },

      /* ===== JOIN TEMPLE ===== */

      {
        $lookup: {
          from: "temples",
          localField: "templeId",
          foreignField: "_id",
          as: "temple",
        },
      },

      {
        $unwind: {
          path: "$temple",
          preserveNullAndEmptyArrays: true,
        },
      },

      {
        $addFields: {
          templeName: "$temple.templeName",

          /* lowercase fields for ABC sorting */

          userNameLower: { $toLower: "$userName" },
          loginIdLower: { $toLower: "$loginId" },
          mobileLower: { $toLower: "$mobile" },
          roleLower: { $toLower: "$role" },
          statusLower: { $toLower: "$status" },
          templeNameLower: { $toLower: "$temple.templeName" },
        },
      },
    ];

    /* ===== TEMPLE NAME FILTER ===== */

    if (templeName) {
      pipeline.push({
        $match: {
          templeName: { $regex: templeName, $options: "i" },
        },
      });
    }

    /* ===== GLOBAL SEARCH ===== */

    if (search) {
      pipeline.push({
        $match: {
          $or: [
            { userName: { $regex: search, $options: "i" } },
            { loginId: { $regex: search, $options: "i" } },
            { mobile: { $regex: search, $options: "i" } },
            { role: { $regex: search, $options: "i" } },
            { status: { $regex: search, $options: "i" } },
            { templeName: { $regex: search, $options: "i" } },
          ],
        },
      });
    }

    /* ===== SORT ===== */

    let sort = { createdAt: -1 };

    if (sortField) {

      const order = sortOrder === "asc" ? 1 : -1;

      const sortFields = {
        userName: "userNameLower",
        loginId: "loginIdLower",
        mobile: "mobileLower",
        role: "roleLower",
        status: "statusLower",
        templeId: "templeNameLower",
        templeName: "templeNameLower",
      };

      if (sortFields[sortField]) {
        sort = { [sortFields[sortField]]: order };
      } else {
        sort = { [sortField]: order };
      }
    }

    pipeline.push({ $sort: sort });

    /* ===== REMOVE TEMP FIELDS ===== */

    pipeline.push({
      $project: {
        temple: 0,
        userNameLower: 0,
        loginIdLower: 0,
        mobileLower: 0,
        roleLower: 0,
        statusLower: 0,
        templeNameLower: 0,
      },
    });

    const users = await User.aggregate(pipeline);

    /* ===== FORMAT ===== */

    const formattedUsers = users.map((u) => ({
      ...u,
      createdAt: formatDate(u.createdAt),
      updatedAt: formatDate(u.updatedAt),
      templeName: u.templeName || "---",
    }));

    return res.json(formattedUsers);

  } catch (error) {

    console.log(error);

    return res.status(500).json({
      message: error.message,
    });

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

    // ⭐ Duplicate loginId error
    if (error.code === 11000) {
      const field = Object.keys(error.keyValue)[0];

      return res.status(400).json({
        message: `${field} already exists`,
      });
    }

    return res.status(500).json({
      message: "Something went wrong",
    });
  }
};