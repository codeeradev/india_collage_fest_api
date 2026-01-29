const mongoose = require("mongoose");
const crypto = require("crypto");

const MOU = require("../../models/mou")
const User = require("../../models/user");

const sendVerificationEmail = require("../../config/nodeMailer");
const otpTemplate = require("../../utils/emailTemplates");

exports.getMyMou = async (req, res) => {
  const mou = await MOU.findOne({
    organizationId: req.user,
  });

  if (!mou) {
    return res.status(404).json({
      message: "MOU not found",
    });
  }

  res.status(200).json({
    status: true,
    data: mou,
  });
};

exports.sendMouOtp = async (req, res) => {
  const mou = await MOU.findOne({
    organizationId: req.user,
  });

  if (!mou) {
    return res.status(404).json({
      message: "MOU not found",
    });
  }

  if (mou.status === "signed") {
    return res.status(400).json({
      message: "MOU already signed",
    });
  }

  const otp = crypto.randomInt(100000, 999999).toString();

  mou.otp = otp;
  mou.otpExpiresAt = Date.now() + 5 * 60 * 1000;
  mou.status = "otp_sent";

  await mou.save();

  // send otp on organizer email
  await sendVerificationEmail(
    req.user.email,
    "MOU Signing OTP",
    otpTemplate(otp)
  );

  return res.json({
    message: "OTP sent for MOU signing",
  });
};

exports.verifyMouOtp = async (req, res) => {
  const { otp } = req.body;

  const mou = await MOU.findOne({
    organizationId: req.user,
    otp,
    otpExpiresAt: { $gt: Date.now() },
  });

  if (!mou) {
    return res.status(400).json({
      message: "Invalid or expired OTP",
    });
  }

  mou.status = "signed";
  mou.signedAt = new Date();
  mou.otp = null;
  mou.otpExpiresAt = null;

  await mou.save();

  await User.updateOne(
    { _id: req.user },
    {
      mouSigned: true,
    }
  );

  return res.json({
    message: "MOU signed successfully",
  });
};
