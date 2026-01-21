const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: String,
    roleId: Number,
    location: {type:mongoose.Types.ObjectId, ref:'city'},
    phone: Number, // it is without +91 or u can say country code
    status: Boolean,
    email: String,
    email_verified_at: { type: Date, default: null },
    phone_verified_at: { type: Date, default: null },
    image:String,
    events:Number,
  },
  { timestamps: true }
);

module.exports = mongoose.model("user", userSchema);
