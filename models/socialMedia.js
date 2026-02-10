const mongoose = require("mongoose");

const socialMediaSchema = new mongoose.Schema(
  {
    platform: { type: String, required: true },
    handle: { type: String, required: true },
    url: { type: String, required: true },
    poster: { type: String, default: null },
    isActive: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true },
);

module.exports = mongoose.model("socialMedia", socialMediaSchema);
