exports.handleError = (error, res) => {

  // Mongo duplicate key
  if (error.code === 11000) {
    const field = Object.keys(error.keyValue)[0];

    return res.status(400).json({
      message: `${field} already exists`,
    });
  }

  // Invalid Mongo ObjectId
  if (error.name === "CastError") {
    return res.status(400).json({
      message: "Invalid ID format",
    });
  }

  return res.status(500).json({
    message: "Something went wrong",
  });
};