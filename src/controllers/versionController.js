const Version = require("../models/version.model");

/* ===== CREATE VERSION ===== */

exports.createVersion = async (req, res) => {
  try {

    const { version, description } = req.body;

    const newVersion = new Version({
      version,
      description
    });

    await newVersion.save();

    res.json({
      message: "Version created",
      data: newVersion
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/* ===== GET LATEST VERSION ===== */

exports.getLatestVersion = async (req, res) => {
  try {

    const version = await Version
      .findOne()
      .sort({ createdAt: -1 });

    res.json(version);

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};