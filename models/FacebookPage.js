const mongoose = require("mongoose");

const FacebookPageSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true,
      index: true,
    },

    page_id: {
      type: String,
      required: true,
      index: true,
    },

    instagram_id: {
      type: String,
      default: null,
    },

    name: {
      type: String,
      default: null,
    },

    category: {
      type: String,
      default: null,
    },

    category_list: {
      type: [mongoose.Schema.Types.Mixed],
      default: [],
    },

    tasks: {
      type: [mongoose.Schema.Types.Mixed],
      default: [],
    },

    access_token: {
      type: String,
      default: null,
    },
  },

  {
    timestamps: true, // created_at & updated_at
  },
);

// Optional compound index like SQL style

FacebookPageSchema.index({ userId: 1, page_id: 1 }, { unique: true });

module.exports =  mongoose.model("FacebookPage", FacebookPageSchema);
