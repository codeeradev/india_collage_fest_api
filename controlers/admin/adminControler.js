const Category = require("../../models/category");
const SubCategory = require("../../models/subCategory");
const message = require("../../constants/messages.json");

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
    const { eventId } = req.params; // assuming eventId comes from params

    const updateData = { ...req.body };

    // If image is uploaded, save path
    if (req.files?.image?.length) {
      updateData.image = `/assets/uploads/${req.files.image[0].filename}`;
    }

    // Remove undefined values (important)
    Object.keys(updateData).forEach(
      (key) => updateData[key] === undefined && delete updateData[key]
    );

    const updatedEvent = await Event.findByIdAndUpdate(
      eventId,
      { $set: updateData },
      { new: true }
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
