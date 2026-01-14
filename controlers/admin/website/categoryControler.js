const Category = require("../../../models/category");
const SubCategory = require("../../../models/subCategory");
const message = require("../../../constants/messages.json");

const type = "category";

exports.getCategory = async (req, res) => {
    try {
        const categories = await Category.aggregate([
            {
                $match: {
                    isActive: true,
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