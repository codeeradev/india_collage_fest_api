const crypto = require("crypto");

const MOU = require("../../models/mou")
const User = require("../../models/user");

const {sendVerificationEmail} = require("../../config/nodeMailer");
const {otpTemplate} = require("../../utils/emailTemplates");
const generateSignedPdf = require("../../utils/generateSignedMouPdf");
const Otp = require("../../models/otp");

exports.getMyMou = async (req, res) => {
  const mou = await MOU.findOne({
    organizationId: req.user
  });

  if (!mou) {
    return res.status(404).json({
      message: "MOU not found"
    });
  }

  res.json({ data: mou });
};

exports.sendMouOtp = async (req, res) => {
  const mou = await MOU.findOne({
    organizationId: req.user,
  });

  if (!mou)
    return res.status(404).json({ message: "MOU not found" });

  if (mou.status === "signed")
    return res.status(400).json({ message: "MOU already signed" });

  // remove old otp
  await Otp.deleteMany({ email: req.user.email });

  const otp = crypto.randomInt(100000, 999999).toString();

  await Otp.create({
    email: req.user.email,
    otp,
    expiresAt: new Date(Date.now() + 5 * 60 * 1000),
  });

  mou.status = "otp_sent";
  await mou.save();

  await sendVerificationEmail(
    req.user.email,
    "MOU Signing OTP",
    otpTemplate(otp)
  );

  res.json({ message: "OTP sent successfully" });
};


exports.verifyMouOtp = async (req, res) => {
  const { otp } = req.body;

  const otpRecord = await Otp.findOne({
    email: req.user.email,
    otp,
  });

  if (!otpRecord)
    return res.status(400).json({
      message: "Invalid or expired OTP",
    });

  const mou = await MOU.findOne({
    organizationId: req.user,
  });

  if (!mou)
    return res.status(404).json({
      message: "MOU not found",
    });

  const signedPdf = await generateSignedPdf({
    name: req.user.name,
    email: req.user.email,
    mouNumber: mou.mouNumber,
  });

  mou.status = "signed";
  mou.signedAt = new Date();
  mou.signedPdfUrl = '/' + signedPdf.replace(/^\/+/, '');

  await mou.save();

  await User.updateOne(
    { _id: req.user },
    { mouSigned: true }
  );

  // delete OTP (one-time)
  await Otp.deleteOne({ _id: otpRecord._id });

  // email signed copy
  await sendVerificationEmail(
    req.user.email,
    "Signed MOU Copy",
    "Attached is your signed MOU.",
    signedPdf
  );

  res.json({
    message: "MOU signed successfully",
  });
};
