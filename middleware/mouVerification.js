const User = require("../models/user");

exports.requireMouSigned = async (req, res, next) => {
  const user = await User.findById(req.user);

  if (user.roleId === 3 && !user.mouSigned) {
    return res.status(403).json({
      message: "Please sign MOU to continue",
    });
  }

  next();
};
