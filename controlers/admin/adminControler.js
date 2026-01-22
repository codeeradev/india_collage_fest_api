const Category = require("../../models/category");
const SubCategory = require("../../models/subCategory");
const message = require("../../constants/messages.json");
const Event = require("../../models/event");
const User = require("../../models/user");

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

exports.loginUser = async (req, res) => {
  try {
    const ALLOWED_ROLES = [1, 2, 3];
    const { email } = req.body;

    const user = await User.findOne({ email, $roleId: { $in: ALLOWED_ROLES } });
    if (!user) {
      return res.status(403).json({
        message: "Access denied. Admin or Organizer only.",
      });
    }

    return res.status(200).json({ message: "Login Successfull", user });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: message.server_error });
  }
};
