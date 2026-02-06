const mongoose = require("mongoose");

const mouSchema = new mongoose.Schema({
  organizationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "user",
    required: true,
  },

  mouNumber: {
    type: String,
    unique: true,
  },

  finalVersionId:
  {
    type:mongoose.Schema.Types.ObjectId,
    ref: "mou_version",
  },
  
  currentStatus: {
    type: String,
    enum: [
      "draft",
      "sent_to_admin",
      "sent_to_organiser",
      "final_agreed",
      "signed",
      "expired"
    ],
    default: "draft",
  },

  finalPdfUrl: String,

  signedAt: Date,

  signedBy: {
    userId: mongoose.Schema.Types.ObjectId,
    name: String,
    email: String,
  }

}, { timestamps: true });

module.exports = mongoose.model("mou", mouSchema);
