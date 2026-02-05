const Category = require("../../../models/category");
const SubCategory = require("../../../models/subCategory");
const message = require("../../../constants/messages.json");

const type = "category";

exports.getCategory = async (req, res) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 100;

    const skip = (page - 1) * limit;

    const categories = await Category.aggregate([
      {
        $match: {
          isActive: true,
        },
      },

      // 🔗 JOIN SUB CATEGORIES
      {
        $sort: {
          isFeatured: -1, // featured on top
          createdAt: -1, // fallback
        },
      },
      {
        $lookup: {
          from: "sub_categories",
          localField: "_id",
          foreignField: "categoryId",
          as: "subCategories",
        },
      },

      // 🔗 JOIN EVENTS
      {
        $lookup: {
          from: "events",
          let: { categoryId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $eq: ["$category", "$$categoryId"],
                },
                visibility: true,
              },
            },
          ],
          as: "events",
        },
      },

      // 📊 COUNTS
      {
        $addFields: {
          subCategoryCount: { $size: "$subCategories" },
          eventCount: { $size: "$events" },
        },
      },

      // 🚫 REMOVE ARRAYS
      {
        $project: {
          subCategories: 0,
          events: 0,
        },
      },
      { $skip: skip },
      { $limit: limit },
    ]);

    return res.status(200).json({
      message: "Categories fetched successfully",
      category: categories,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: message.server_error,
    });
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
