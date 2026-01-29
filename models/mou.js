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

    pdfUrl: {
      type: String,
      default: null,
    },

    signedPdfUrl: {
      type: String,
      default: null,
    },

    contentHtml: String, // frozen HTML
    contentText: String,

    signedAt: Date,

    signedBy: {
      userId: mongoose.Schema.Types.ObjectId,
      name: String,
      email: String,
      ipAddress: String,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("mou", mouSchema);
