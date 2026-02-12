const mongoose = require("mongoose");

const blogSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    excerpt: String,
    content: String,
    image: String,
    author: String,
    tags: [String],
    isPublished: { type: Boolean, default: true },
    publishedAt: Date,
    metaTitle: String,
    metaDescription: String,
    metaKeywords: String,
  },
  { timestamps: true },
);

module.exports = mongoose.model("blog", blogSchema);
