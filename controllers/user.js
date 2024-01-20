const User = require("../models/user");

exports.updateMe = async (req, res, next) => {
  const { user } = req;
  const filteredBody = filterObj(
    req.body,
    "firstName",
    "lastName",
    "about",
    "avatar"
  );
  const updatedUser = await User.findByIdAndUpdate(user._id, filteredBody, {
    new: true,
    validateModifiedOnly: true,
  });
  res.status(200).json({
    status: "success",
    data: updatedUser,
    message: "User updated successfully",
  });
};
