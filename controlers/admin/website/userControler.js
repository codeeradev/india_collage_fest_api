const User = require("../../../models/user");
const OtpModel = require("../../../models/otp");
const AdminApproval = require("../../../models/adminApproval");
const { sendVerificationEmail } = require("../../../config/nodeMailer");
const { otpTemplate } = require("../../../utils/emailTemplates");
const crypto = require("crypto");
const message = require("../../../constants/messages.json");
const jwt = require("jsonwebtoken");

const type = "User";

exports.loginUser = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email, roleId: 4 });
    if (!user) {
      await User.create({ email, isVerified: false, roleId: 4 });
    }

    let otp = crypto.randomInt(100000, 999999).toString();

    await OtpModel.create({
      email,
      otp,
      expiresAt: Date.now() + 5 * 60 * 1000,
    });
    await sendVerificationEmail(
      email,
      "🔐 OTP Verification – India College Fest",
      otpTemplate(otp),
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
      user.isVerified = true;
    }

    // (Optional) Phone verification
    if (!user.phone_verified_at && otpRecord.mobileNumber) {
      updates.phone_verified_at = new Date();
    }

    if (user.roleId === 4) {
      // Activate user
      updates.status = true;
    }

    if (user.roleId === 3) {
      await AdminApproval.create({
        user_id: user._id,
        type: "ORGANIZER",
      });
    }
    // 4️⃣ Update user
    await User.updateOne({ _id: user._id }, { $set: updates });

    // 5️⃣ Delete OTP (one-time use)
    await OtpModel.deleteOne({ _id: otpRecord._id });

    // 6️⃣ Generate JWT
    const jwttoken = jwt.sign({ _id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "1d",
    });

    return res.status(200).json({
      message:
        user.roleId === 3
          ? "OTP verified. Waiting for admin approval."
          : "Login successful",

      user_id: user._id,
      user: user,
      token: jwttoken,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: message.server_error });
  }
};

exports.becomeAOrganiser = async (req, res) => {
  try {
    const { name, location, phone, email } = req.body;

    const user = await User.findOne({
      $or: [{ email }, { phone }],
      email_verified_at: { $ne: null },
    });

    if (user) {
      return res.status(409).json({
        message: "User already exists",
      });
    }

    const image = req.files?.image?.[0]?.filename
      ? `/assets/uploads/${req.files.image[0].filename}`
      : null;
      
    const otp = crypto.randomInt(100000, 999999).toString();

    await OtpModel.create({
      email,
      otp,
      expiresAt: Date.now() + 5 * 60 * 1000, // 5 minutes
    });

    await sendVerificationEmail(
      email,
      "🔐 OTP Verification – India College Fest",
      otpTemplate(otp),
    );

    await User.create({
      name,
      roleId: 3,
      location,
      phone,
      status: false,
      email,
      image,
      events: 0,
    });

    return res.status(201).json({
      message: "OTP sent successfully",
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: message.server_error,
    });
  }
};
