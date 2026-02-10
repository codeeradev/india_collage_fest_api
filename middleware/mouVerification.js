const User = require("../models/user");

exports.requirePermission = (permission) => {
  return async (req, res, next) => {
    const user = await User.findById(req.user);

    if (!user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // SUPER ADMIN = full access
    if (user.roleId === 1) return next();

    // Only organisers can have special access
    if (user.roleId !== 3) {
      return res.status(403).json({ message: "Access denied" });
    }

    // MOU mandatory
    if (!user.mouSigned) {
      return res.status(403).json({
        message: "Please sign MOU to continue",
      });
    }

    // Permission granted by admin
    if (!user.permissions?.get(permission)) {
      return res.status(403).json({
        message: "Permission denied",
      });
    }

    next();
  };
};
