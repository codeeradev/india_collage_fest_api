const mongoose = require("mongoose");

const heroVideoSchema = new mongoose.Schema(
  {
    title: { type: String, trim: true, required: true },
    src: { type: String, trim: true, required: true },
    order: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { _id: false },
);

const heroStatSchema = new mongoose.Schema(
  {
    key: { type: String, trim: true, default: "" },
    label: { type: String, trim: true, required: true },
    value: { type: Number, required: true },
    order: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { _id: false },
);

const heroContentSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      trim: true,
      default: "home",
      unique: true,
      index: true,
    },
    videos: {
      type: [heroVideoSchema],
      default: [],
    },
    stats: {
      type: [heroStatSchema],
      default: [],
    },
    autoRotateMs: {
      type: Number,
      default: 6500,
      min: 2000,
      max: 30000,
    },
    useStaticStats: {
      type: Boolean,
      default: false,
    },
    useStaticVideos: {
      type: Boolean,
      default: true,
    },
    updatedBy: {
      type: mongoose.Types.ObjectId,
      ref: "user",
      default: null,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("hero_content", heroContentSchema);
