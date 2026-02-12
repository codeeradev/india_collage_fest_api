const mongoose = require("mongoose");

const websiteVisitSchema = new mongoose.Schema(
  {
    dateKey: { type: String, required: true, unique: true },
    count: { type: Number, default: 0 },
  },
  { timestamps: true },
);

module.exports = mongoose.model("website_visit_stat", websiteVisitSchema);
