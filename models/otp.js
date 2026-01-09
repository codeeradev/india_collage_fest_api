// modals/otp.js
const mongoose = require('mongoose');
const otpSchema = new mongoose.Schema({
  email:String,
  otp: String,
  expiresAt: Date,
});
otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
module.exports = mongoose.model('Otp', otpSchema);