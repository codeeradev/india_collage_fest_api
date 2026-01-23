const mongoose = require("mongoose");

const adminApprovalSchema = new mongoose.Schema(
  {
    user_id: { type: mongoose.Types.ObjectId, ref: "user" },
    type: String,
    status: { type:String, enum:["pending", "approved", "rejected" ], default:"pending"},
  },
  { timestamps: true },
);

module.exports = mongoose.model("admin_approval", adminApprovalSchema);
