const mongoose = require("mongoose");

const subCategorySchema = new mongoose.Schema(
  {
    name: String,
    categoryId: { type: mongoose.Types.ObjectId, ref: "category" },
    slug: String,
    icon: String,
    description: String,
    isActive: { type: Boolean, default: true },
    isFeatured: { type: Boolean, default: false },
  },
  { timestamps: true }
);
subCategorySchema.pre("save", function (next) {
  if (this.isModified("name")) {
    this.slug = this.name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, "") // remove special chars
      .replace(/\s+/g, "-") // spaces to hyphen
      .replace(/-+/g, "-"); // multiple hyphens
  }
  next();
});

module.exports = mongoose.model("sub_category", subCategorySchema);
