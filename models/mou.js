const mongoose = require("mongoose");

const mouSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    mouNumber: {
      type: String,
      unique: true,
    },

    status: {
      type: String,
      enum: ["draft", "otp_sent", "signed", "expired"],
      default: "draft",
    },

    signedPdfUrl: {
      type: String,
      default: null,
    },

    signedAt: Date,

    signedBy: {
      userId: mongoose.Schema.Types.ObjectId,
      name: String,
      email: String,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("mou", mouSchema);
