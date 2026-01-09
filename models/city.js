const mongoose = require("mongoose");

const citySchema = new mongoose.Schema(
  {
    city: String,
    latitude:String,
    longitude:String,
    description: String,
    is_active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("city", citySchema);
