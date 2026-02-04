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

exports.getUsers = async (req, res) => {
  try {
    const { roleId } = req.query;
    const filter = {};
    if (roleId) {
      filter.roleId = Number(roleId);
    }

    const users = await User.find(filter);

    return res
      .status(200)
      .json({ message: "Users fetched successfuly", users });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Server error",
    });
  }
};

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

exports.editCategory = async (req, res) => {
  try {
    const { id } = req.params; // category id
    const { name, description, isActive, isFeatured } = req.body;

    if (!id) {
      return res.status(400).json({ message: "Category id is required" });
    }

    const category = await Category.findById(id);
    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }

    // image optional
    if (req.files?.image?.[0]?.filename) {
      category.icon = `/assets/uploads/${req.files.image[0].filename}`;
    }

    // update fields only if provided
    if (name !== undefined) category.name = name;
    if (description !== undefined) category.description = description;
    if (isActive !== undefined) category.isActive = isActive;
    if (isFeatured !== undefined) category.isFeatured = isFeatured;

    await category.save();

    return res.status(200).json({
      message: "Category updated successfully",
      data: category,
    });
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

exports.editSubCategory = async (req, res) => {
  try {
    const { id } = req.params; // sub category id
    const { name, description, categoryId, isActive, isFeatured } = req.body;

    if (!id) {
      return res.status(400).json({ message: "SubCategory id is required" });
    }

    const subCategory = await SubCategory.findById(id);
    if (!subCategory) {
      return res.status(404).json({ message: "SubCategory not found" });
    }

    // image optional
    if (req.files?.image?.[0]?.filename) {
      subCategory.icon = `/assets/uploads/${req.files.image[0].filename}`;
    }

    // update fields only if provided
    if (name !== undefined) subCategory.name = name;
    if (description !== undefined) subCategory.description = description;
    if (categoryId !== undefined) subCategory.categoryId = categoryId;
    if (isActive !== undefined) subCategory.isActive = isActive;
    if (isFeatured !== undefined) subCategory.isFeatured = isFeatured;

    await subCategory.save();

    return res.status(200).json({
      message: "SubCategory updated successfully",
      data: subCategory,
    });
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
    const { organiser, event } = req.query;

    if (event === "true") {
      const eventRequests = await Event.find({
        approvalStatus: "pending",
      })
        .populate("location", "_id city")
        .populate("category", "_id name icon")
        .populate("sub_category", "_id name icon")
        .populate("user_id", "_id name email")
        .sort({ createdAt: -1 });

      return res.status(200).json({
        message: "Event approval requests fetched successfully",
        eventRequests,
      });
    }
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
    const { approvalId, action, reason, type } = req.body;

    if (!approvalId || !action || !type) {
      return res.status(400).json({
        message: "approvalId, action and type are required",
      });
    }

    if (!["approved", "rejected"].includes(action)) {
      return res.status(400).json({
        message: "Action must be approved or rejected",
      });
    }

    /* ================= ORGANIZER ================= */
    if (type === "organizer") {
      const approval = await AdminApproval.findById(approvalId);

      if (!approval) {
        return res.status(404).json({ message: "Approval request not found" });
      }

      if (approval.status !== "pending") {
        return res.status(400).json({ message: "Request already processed" });
      }

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
          { new: true }
        );

        await sendVerificationEmail(
          user.email,
          "Organizer Account Approved – India College Fest",
          organiserCredentialsTemplate(user.email, user.name, plainPassword)
        );

        return res.status(200).json({ message: "Organizer approved successfully" });
      }

      if (action === "rejected") {
        approval.status = "rejected";
        approval.reason = reason || "Rejected by admin";
        approval.rejectedAt = new Date();
        await approval.save();

        return res.status(200).json({ message: "Organizer request rejected" });
      }
    }

    /* ================= EVENT ================= */
    if (type === "event") {
      const event = await Event.findById(approvalId);

      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }

      if (event.approvalStatus !== "pending") {
        return res.status(400).json({ message: "Event already processed" });
      }

      if (action === "approved") {
        event.approvalStatus = "approved";
        await event.save();

        return res.status(200).json({ message: "Event approved successfully" });
      }

      if (action === "rejected") {
        event.approvalStatus = "rejected";
        event.rejectionReason = reason || "Rejected by admin";
        await event.save();

        return res.status(200).json({ message: "Event rejected successfully" });
      }
    }

  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server error" });
  }
};

exports.editProfile = async (req, res) => {
  try {
    const userId = req.user;

    const { name, phone, location, password } = req.body;
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        status: false,
        message: "User not found",
      });
    }

    if (!user.phone_verified_at && phone) {
      user.phone = phone;
    }

    if (name) user.name = name;
    if (location) user.location = location;
    if (password) user.password = password;

    /** image upload */
    if (req.files?.image) {
      user.image = `/assets/uploads/${req.files.image[0].filename}`;
    }

    if (req.files?.bannerImage) {
      user.bannerImage = `/assets/uploads/${req.files.bannerImage[0].filename}`;
    }

    await user.save();

    res.status(200).json({
      status: true,
      message: "Profile updated successfully",
      data: user,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      status: false,
      message: "Server error",
    });
  }
};

exports.getProfile = async (req, res) => {
  try {
    const { userId } = req.params;

    const profile = await User.findOne({
      _id: userId,
      roleId: { $nin: [4, 5] },
      status: true,
    })
      .select("-otp -__v")
      .populate({
        path: "location",
        select: "_id city",
      });
    if (!profile) {
      return res.status(404).json({
        message: "Profile not found",
      });
    }

    return res.status(200).json({
      message: "Profile fetched successfully",
      profile,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Server error",
    });
  }
};
