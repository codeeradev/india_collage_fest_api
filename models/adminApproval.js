const mongoose = require("mongoose");

const adminApprovalSchema = new mongoose.Schema(
  {
    user_id: { type: mongoose.Types.ObjectId, ref: "user" },
    type: {
      type: String,
      enum: ["ORGANIZER"],
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "admin",
      default: null,
    },

    approvedAt: {
      type: Date,
      default: null,
    },

    rejectedAt: {
      type: Date,
      default: null,
    },

    reason: {
      type: String,
      default: null,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("admin_approval", adminApprovalSchema);
