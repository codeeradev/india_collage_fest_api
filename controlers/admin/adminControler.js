const Category = require("../../models/category");
const SubCategory = require("../../models/subCategory");
const message = require("../../constants/messages.json");
const Event = require("../../models/event");
const User = require("../../models/user");
const AdminApproval = require("../../models/adminApproval");
const generateRandomPassword = require("../../utils/istConverter");
const { sendVerificationEmail } = require("../../config/nodeMailer");
const { organiserCredentialsTemplate } = require("../../utils/emailTemplates");
const jwt = require("jsonwebtoken");

const type = "category";

exports.addCategory = async (req, res) => {
  try {
    const { name, description, isActive, isFeatured } = req.body;

    const icon = req.files?.image?.[0]?.filename
      ? `/assets/uploads/${req.files.image[0].filename}`
      : null;

    await Category.create({
      name,
      icon,
      description,
      isActive,
      isFeatured,
    });

    return res
      .status(200)
      .json({ message: message.success.replace("{value}", type) });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: message.server_error });
  }
};

exports.getCategory = async (req, res) => {
  try {
    const categories = await Category.aggregate([
      {
        $lookup: {
          from: "sub_categories", // 👈 collection name (plural, lowercase)
          localField: "_id",
          foreignField: "categoryId",
          as: "subCategories",
        },
      },
      {
        $addFields: {
          subCategoryCount: { $size: "$subCategories" },
        },
      },
      {
        $project: {
          subCategories: 0, // ❌ do NOT send list
        },
      },
      {
        $sort: { createdAt: -1 },
      },
    ]);

    return res.status(200).json({
      message: "Categories fetched successfully",
      category: categories,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: message.server_error });
  }
};

exports.addSubCategory = async (req, res) => {
  try {
    const { name, description, categoryId, isActive, isFeatured } = req.body;

    const icon = req.files?.image?.[0]?.filename
      ? `/assets/uploads/${req.files.image[0].filename}`
      : null;

    await SubCategory.create({
      name,
      icon,
      description,
      categoryId,
      isActive,
      isFeatured,
    });

    return res
      .status(200)
      .json({ message: message.success.replace("{value}", type) });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: message.server_error });
  }
};

exports.getSubCategoriesByCategory = async (req, res) => {
  try {
    const { categoryId } = req.params;

    const subCategories = await SubCategory.find({
      categoryId,
      isActive: true,
    }).sort({ createdAt: -1 });

    return res.status(200).json({
      message: "Sub-categories fetched successfully",
      subCategories,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: message.server_error });
  }
};

exports.editEvents = async (req, res) => {
  try {
    const { eventId } = req.params;

    const userId = req.user;

    const user = await User.findById(userId);

    if (!user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // ❌ normal user not allowed
    if (![1, 3].includes(user.roleId)) {
      return res.status(403).json({
        message: "Access denied",
      });
    }

    const updateData = { ...req.body };

    // If image is uploaded, save path
    if (req.files?.image?.length) {
      updateData.image = `/assets/uploads/${req.files.image[0].filename}`;
    }

    // Remove undefined values (important)
    Object.keys(updateData).forEach(
      (key) => updateData[key] === undefined && delete updateData[key],
    );

    const updatedEvent = await Event.findByIdAndUpdate(
      eventId,
      { $set: updateData },
      { new: true },
    );

    if (!updatedEvent) {
      return res.status(404).json({ message: "Event not found" });
    }

    return res.status(200).json({
      message: message.updateSuccess.replace("{value}", type),
      updatedEvent,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: message.server_error });
  }
};

exports.getEvent = async (req, res) => {
  try {
    const { cityId, category, search, eventId } = req.query;

    // pagination params
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    let filter = {};

    if (eventId) {
      filter._id = eventId;
    }

    if (search) {
      filter.title = { $regex: search, $options: "i" };
    }

    if (cityId) {
      filter.location = cityId;
    }

    if (category) {
      filter.category = category;
    }

    // total count
    const totalEvents = await Event.countDocuments(filter);

    // fetch paginated data
    const events = await Event.find(filter)
      .populate({
        path: "location",
        select: "_id city",
      })
      .populate({
        path: "category",
        select: "_id name icon",
      })
      .populate({
        path: "sub_category",
        select: "_id name icon",
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const totalPages = Math.ceil(totalEvents / limit);

    return res.status(200).json({
      message: message.fetchSuccess.replace("{value}", type),

      pagination: {
        totalRecords: totalEvents,
        totalPages,
        currentPage: page,
        limit,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },

      events,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: message.server_error,
    });
  }
};

exports.loginPanel = async (req, res) => {
  try {
    const ALLOWED_ROLES = [1, 2, 3];

    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: "Email and password are required",
      });
    }

    const user = await User.findOne({
      email,
      roleId: { $in: ALLOWED_ROLES },
    });

    if (!user) {
      return res.status(403).json({
        message: "Access denied",
      });
    }

    if (!user.status) {
      return res.status(403).json({
        message: "Account is disabled by admin",
      });
    }

    // ✅ plain password match
    if (user.password !== password) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    // ✅ generate jwt token
    const token = jwt.sign(
      {
        _id: user._id,
        roleId: user.roleId,
        email: user.email,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "7d",
      },
    );

    // hide password in response
    user.password = undefined;

    return res.status(200).json({
      message: "Login successful",
      token,
      user,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Server error",
    });
  }
};

exports.getApprovalsRequest = async (req, res) => {
  try {
    const { organiser } = req.query;

    // query params are strings
    if (organiser === "true") {
      const organiserRequests = await AdminApproval.find({
        type: "ORGANIZER",
        status: "pending",
      })
        .populate(
          "user_id",
          "name email phone image status roleId location createdAt",
        )
        .sort({ createdAt: -1 });

      return res.status(200).json({
        message: "Organiser approval requests fetched successfully",
        organiserRequests,
      });
    }

    return res.status(400).json({
      message: "Invalid request",
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Server error",
    });
  }
};

exports.approvalAction = async (req, res) => {
  try {
    const { approvalId, action, reason } = req.body;

    if (!approvalId || !action) {
      return res.status(400).json({
        message: "approvalId and action are required",
      });
    }

    if (!["approved", "rejected"].includes(action)) {
      return res.status(400).json({
        message: "Action must be approved or rejected",
      });
    }

    const approval = await AdminApproval.findById(approvalId);

    if (!approval) {
      return res.status(404).json({
        message: "Approval request not found",
      });
    }

    if (approval.status !== "pending") {
      return res.status(400).json({
        message: "Request already processed",
      });
    }

    // ======================
    // APPROVE
    // ======================
    if (action === "approved") {
      const plainPassword = generateRandomPassword(10);

      approval.status = "approved";
      approval.reason = null;
      approval.approvedAt = new Date();
      approval.approvedBy = req.admin?._id || null;

      await approval.save();

      const user = await User.findByIdAndUpdate(
        approval.user_id,
        {
          roleId: 3,
          status: true,
          password: plainPassword,
        },
        { new: true },
      );

      await sendVerificationEmail(
        user.email,
        "Organizer Account Approved – India College Fest",
        organiserCredentialsTemplate(user.email, user.name, plainPassword),
      );

      return res.status(200).json({
        message: "Organizer approved successfully",
      });
    }

    // ======================
    // REJECT
    // ======================
    if (action === "rejected") {
      approval.status = "rejected";
      approval.reason = reason || "Rejected by admin";
      approval.rejectedAt = new Date();

      await approval.save();

      return res.status(200).json({
        message: "Organizer request rejected",
      });
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Server error",
    });
  }
};
