const mongoose = require("mongoose");

const mouVersionSchema = new mongoose.Schema(
  {
    mouId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "mou",
      required: true,
      index: true,
    },

    version: {
      type: Number,
      required: true,
    },

    createdBy: {
      type: String,
      enum: ["organiser", "admin"],
      required: true,
    },

    htmlContent: {
      type: String,
      required: true,
    },

    remarks: {
      type: String,
      default: null,
    },

    pdfUrl: {
      type: String,
      default: null,
    },

    isFinal: {
      type: Boolean,
      default: false,
    },

    acceptedClauses: [String],
    allClauses: [String],
    isBaseTemplate: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  { timestamps: true },
);

mouVersionSchema.index({ mouId: 1, version: 1 }, { unique: true });

module.exports = mongoose.model("mou_version", mouVersionSchema);
