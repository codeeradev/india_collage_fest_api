const mongoose = require("mongoose");

const eventSchema = new mongoose.Schema(
  {
    title: String,
    description: String,
    image: String,
    location: { type: mongoose.Types.ObjectId, ref: "city" },
    ticket_price: String,
    user_id: { type: mongoose.Types.ObjectId, ref: "user" },
    category: { type: mongoose.Types.ObjectId, ref: "category" },
    sub_category: { type: mongoose.Types.ObjectId, ref: "sub_category" },
    start_date: {
      type: Date,
    },

    end_date: {
      type: Date,
    },

    start_time: {
      type: String, // "10:30 AM"
    },

    end_time: {
      type: String, // "06:00 PM"
    },
    address: String,
    eventMode: String,
    visibility: Boolean,
    isFeatured: { type: Boolean, default: false },
  },
  { timestamps: true },
);

module.exports = mongoose.model("event", eventSchema);
