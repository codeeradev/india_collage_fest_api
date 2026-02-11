const mongoose = require("mongoose");

const socialPostSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true,
      index: true,
    },
    caption: {
      type: String,
      default: "",
    },
    platforms: {
      type: [String],
      default: ["facebook", "instagram"],
    },
    image: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "published", "failed"],
      default: "pending",
      index: true,
    },
    rejectionReason: {
      type: String,
      default: null,
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      default: null,
    },
    approvedAt: {
      type: Date,
      default: null,
    },
    publishedAt: {
      type: Date,
      default: null,
    },
    facebookPostId: {
      type: String,
      default: null,
    },
    instagramMediaId: {
      type: String,
      default: null,
    },
    pageId: {
      type: String,
      default: null,
    },
    error: {
      type: String,
      default: null,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("social_post", socialPostSchema);
