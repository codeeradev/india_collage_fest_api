const crypto = require("crypto");

const MOU = require("../../models/mou");
const User = require("../../models/user");

const { sendVerificationEmail } = require("../../config/nodeMailer");
const { otpTemplate } = require("../../utils/emailTemplates");
const generateSignedPdf = require("../../utils/generateSignedMouPdf");
const Otp = require("../../models/otp");
const MouVersion = require("../../models/mouVersion");

exports.startMou = async (req, res) => {
  const exists = await MOU.findOne({ organizationId: req.user }).lean();

  if (exists) return res.json({ data: exists });

  const count = await MOU.countDocuments();

  const mou = await MOU.create({
    organizationId: req.user,
    mouNumber: `MOU-${new Date().getFullYear()}-${String(count + 1).padStart(5, "0")}`,
  });

  res.json({ data: mou });
};

exports.organiserSubmitMou = async (req, res) => {
  const { htmlContent } = req.body;

  const mou = await MOU.findOne({ organizationId: req.user });
  if (!mou) return res.status(404).json({ message: "MOU not found" });

  const last = await MouVersion.findOne({ mouId: mou._id }).sort({
    version: -1,
  });

  const version = (last?.version || 0) + 1;

  await MouVersion.create({
    mouId: mou._id,
    version,
    createdBy: "organiser",
    htmlContent,
  });

  mou.currentStatus = "sent_to_admin";
  await mou.save();

  res.json({ message: "Sent to admin for review" });
};

exports.adminReplyMou = async (req, res) => {
  const { mouId, htmlContent, remarks } = req.body;

  const last = await MouVersion.findOne({ mouId }).sort({ version: -1 });

  await MouVersion.create({
    mouId,
    version: last.version + 1,
    createdBy: "admin",
    htmlContent,
    remarks,
  });

  await MOU.updateOne({ _id: mouId }, { currentStatus: "sent_to_organiser" });

  res.json({ message: "Sent back to organiser" });
};

exports.getMouVersions = async (req, res) => {
  const { mouId } = req.params;

  const versions = await MouVersion.find({ mouId }).sort({ version: 1 });

  res.json({ data: versions });
};

exports.finalizeMou = async (req, res) => {
  const { mouId, versionId } = req.body;

  const mou = await MOU.findById(mouId);
  if (!mou) return res.status(404).json({ message: "MOU not found" });

  if (mou.currentStatus === "signed")
    return res.status(400).json({ message: "MOU already signed" });

  const version = await MouVersion.findOne({
    _id: versionId,
    mouId,
  });

  if (!version) return res.status(404).json({ message: "Version not found" });

  // 🔒 remove any previous final
  await MouVersion.updateMany({ mouId }, { $set: { isFinal: false } });

  // ✅ lock this one as final
  version.isFinal = true;
  await version.save();

  // 📌 move MOU to final agreed
  mou.currentStatus = "final_agreed";
  await mou.save();

  res.json({
    message: "MOU finalized successfully. Ready for signing.",
  });
};

exports.getMyMou = async (req, res) => {
  const mou = await MOU.findOne({
    organizationId: req.user,
  });

  if (!mou) {
    return res.status(404).json({
      message: "MOU not found",
    });
  }

  res.json({ data: mou });
};

exports.sendMouOtp = async (req, res) => {
  const mou = await MOU.findOne({
    organizationId: req.user,
  });

  if (!mou) return res.status(404).json({ message: "MOU not found" });

  if (mou.currentStatus === "signed")
    return res.status(400).json({ message: "MOU already signed" });

  // remove old otp
  await Otp.deleteMany({ email: req.user.email });

  const otp = crypto.randomInt(100000, 999999).toString();

  await Otp.create({
    email: req.user.email,
    otp,
    expiresAt: new Date(Date.now() + 5 * 60 * 1000),
  });

  mou.currentStatus = "otp_sent";
  await mou.save();

  await sendVerificationEmail(
    req.user.email,
    "MOU Signing OTP",
    otpTemplate(otp),
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

  const finalVersion = await MouVersion.findOne({
    mouId: mou._id,
    isFinal: true,
  });

  if (!finalVersion) {
    return res.status(400).json({
      message: "Final agreement not approved yet",
    });
  }

  const signedPdf = await generateSignedPdf({
    name: req.user.name,
    email: req.user.email,
    mouNumber: mou.mouNumber,
  });

  mou.currentStatus = "signed";
  mou.signedAt = new Date();
  mou.signedPdfUrl = "/" + signedPdf.replace(/^\/+/, "");

  await mou.save();

  await User.updateOne({ _id: req.user }, { mouSigned: true });

  // delete OTP (one-time)
  await Otp.deleteOne({ _id: otpRecord._id });

  // email signed copy
  await sendVerificationEmail(
    req.user.email,
    "Signed MOU Copy",
    "Attached is your signed MOU.",
    signedPdf,
  );

  res.json({
    message: "MOU signed successfully",
  });
};
