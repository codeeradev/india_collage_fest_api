const mongoose = require("mongoose");

const OauthTokenSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      index: true,
      required: true,
    },

    provider: {
      type: String,
      required: true,
      index: true,
      maxlength: 50,
    },

    accessToken: {
      type: String,
      required: true,
    },

    refreshToken: {
      type: String,
      default: null,
    },

    expiresAt: {
      type: Date,
      default: null,
    },
  },

  {
    timestamps: true, // creates created_at & updated_at
  },
);

module.exports = mongoose.model("OauthToken", OauthTokenSchema);
