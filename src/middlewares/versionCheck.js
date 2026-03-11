const Version = require("../models/version.model");

const versionCheck = async (req, res, next) => {

  try {

    const clientVersion = parseFloat(req.headers["version-code"]);

    const latestVersion = await Version
      .findOne()
      .sort({ releaseDate: -1 });

    const dbVersion = parseFloat(latestVersion.version);

    if (clientVersion < dbVersion) {
      return res.json({
        status: 0,
        message: `New version ${latestVersion.version} available. Please refresh browser (Ctrl+Shift+R)`
      });
    }

    next();

  } catch (error) {
    res.status(500).json({ message: error.message });
  }

};

module.exports = versionCheck;