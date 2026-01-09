const User = require("../../../models/user");
const OtpModel = require("../modals/otp");
const { sendVerificationEmail } = require("../config/nodeMailer");
const { otpTemplate } = require("../utils/emailTemplates");

const type = "User";
exports.registerUser = async (req, res) => {
  try {
    const { name, roleId, location, phone, status, email } = req.body;

    await User.create({ name, roleId, location, phone, status, email });
    return res.status(200).json({
      message: message.success.replace("{value}", type),
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: message.server_error });
  }
};

exports.loginUser = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });

    let otp = crypto.randomInt(100000, 999999).toString();

    await OtpModel.create({
      email,
      otp,
      expiresAt: Date.now() + 2 * 60 * 1000,
    });
    await sendVerificationEmail(
      email,
      "🔐 OTP Verification – India College Fest",
      otpTemplate(otp)
    );

    return res.status(200).json({ message: "OTP sent via to Email" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: message.server_error });
  }
};

exports.verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;

    // 1️⃣ Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // 2️⃣ Find OTP record
    const otpRecord = await OtpModel.findOne({
      email,
      otp,
    });

    if (!otpRecord) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    // 3️⃣ Prepare update object
    const updates = {};

    // Email verification
    if (!user.email_verified_at) {
      updates.email_verified_at = new Date(); // stored in UTC
    }

    // (Optional) Phone verification
    if (!user.phone_verified_at && otpRecord.mobileNumber) {
      updates.phone_verified_at = new Date();
    }

    // Activate user
    updates.status = true;

    // 4️⃣ Update user
    await User.updateOne({ _id: user._id }, { $set: updates });

    // 5️⃣ Delete OTP (one-time use)
    await OtpModel.deleteOne({ _id: otpRecord._id });

    // 6️⃣ Generate JWT
    const jwttoken = jwt.sign({ _id: user._id }, process.env.jwtSecretKey, {
      expiresIn: "1d",
    });

    return res.status(200).json({
      message: "Login successful",
      user_id: user._id,
      token: jwttoken,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server error" });
  }
};
