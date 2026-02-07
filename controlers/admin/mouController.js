const crypto = require("crypto");
const mongoose = require("mongoose");

const MOU = require("../../models/mou");
const MouVersion = require("../../models/mouVersion");
const User = require("../../models/user");
const Otp = require("../../models/otp");

const { sendVerificationEmail } = require("../../config/nodeMailer");
const { otpTemplate } = require("../../utils/emailTemplates");
const generateSignedPdf = require("../../utils/generateSignedMouPdf");

const { fillTemplate } = require("../../utils/emailTemplates");

/* =====================================================
   BASE TEMPLATE (ADMIN)
===================================================== */

exports.upsertBaseTemplate = async (req, res) => {
  const { htmlContent } = req.body;

  if (!htmlContent?.trim())
    return res.status(400).json({ message: "Template required" });

  const template = await MouVersion.findOneAndUpdate(
    { isBaseTemplate: true },
    { htmlContent, createdBy: "admin", isBaseTemplate: true },
    { new: true, upsert: true },
  );

  res.json({ data: template });
};

exports.getFilledBaseTemplate = async (req, res) => {
  const mou = await MOU.findOne({ organizationId: req.user });
  if (!mou) return res.status(404).json({ message: "MOU missing" });

  const template = await MouVersion.findOne({ isBaseTemplate: true });
  if (!template) return res.status(500).json({ message: "Base template missing" });

  const filledHtml = fillTemplate(template.htmlContent, {
    mouNumber: mou.mouNumber,
    createdAt: mou.createdAt,
    name: req.user.name,
    email: req.user.email
  });

  res.json({
    data: {
      htmlContent: filledHtml
    }
  });
};

exports.getBaseTemplate = async (req, res) => {
  const template = await MouVersion.findOne({ isBaseTemplate: true });
  if (!template) return res.status(404).json({ message: "No template found" });
  res.json({ data: template });
};

/* =====================================================
   START MOU
===================================================== */

exports.startMou = async (req, res) => {
  let mou = await MOU.findOne({ organizationId: req.user });

  if (mou) return res.json({ data: mou });

  const template = await MouVersion.findOne({ isBaseTemplate: true });
  if (!template)
    return res.status(500).json({ message: "Base template missing" });

  const count = await MOU.countDocuments();

  mou = await MOU.create({
    organizationId: req.user,
    mouNumber: `MOU-${new Date().getFullYear()}-${String(count + 1).padStart(5, "0")}`,
  });

  await MouVersion.create({
    mouId: mou._id,
    version: 1,
    createdBy: "organiser",
    htmlContent: template.htmlContent,
  });

  res.json({ data: mou });
};

/* =====================================================
   ORGANISER SUBMIT
===================================================== */

exports.organiserSubmitMou = async (req, res) => {
  const { htmlContent, remarks, acceptedClauses, allClauses } = req.body;

  const mou = await MOU.findOne({ organizationId: req.user });
  if (!mou) return res.status(404).json({ message: "MOU missing" });

  if (!["draft", "sent_to_organiser"].includes(mou.currentStatus))
    return res.status(400).json({ message: "Invalid state" });

  const last = await MouVersion.findOne({ mouId: mou._id }).sort({
    version: -1,
  });

  await MouVersion.create({
    mouId: mou._id,
    version: last.version + 1,
    createdBy: "organiser",
    htmlContent,
    acceptedClauses,
    allClauses,
    remarks,
  });

  mou.currentStatus = "sent_to_admin";
  await mou.save();

  res.json({ message: "Submitted" });
};

/* =====================================================
   ADMIN REPLY
===================================================== */

exports.adminReplyMou = async (req, res) => {
  const { mouId, htmlContent, remarks } = req.body;

  const mou = await MOU.findById(mouId);
  if (!mou) return res.status(404).json({ message: "MOU missing" });

  if (mou.currentStatus !== "sent_to_admin")
    return res.status(400).json({ message: "Not in review state" });

  const last = await MouVersion.findOne({ mouId }).sort({ version: -1 });

  await MouVersion.create({
    mouId,
    version: last.version + 1,
    createdBy: "admin",
    htmlContent,
    remarks,
  });

  mou.currentStatus = "sent_to_organiser";
  await mou.save();

  res.json({ message: "Returned to organiser" });
};

/* =====================================================
   VERSION HISTORY
===================================================== */

exports.getMouVersions = async (req, res) => {
  const versions = await MouVersion.find({ mouId: req.params.mouId }).sort({
    version: 1,
  });

  res.json({ data: versions });
};

/* =====================================================
   FINALIZE
===================================================== */

exports.finalizeMou = async (req, res) => {
  const { mouId, versionId } = req.body;

  const mou = await MOU.findById(mouId);
  if (!mou) return res.status(404).json({ message: "MOU missing" });

  if (mou.currentStatus !== "sent_to_admin")
    return res.status(400).json({ message: "Wrong state" });

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // clear previous finals
    await MouVersion.updateMany({ mouId }, { isFinal: false }, { session });

    // mark selected version final
    const finalVersion = await MouVersion.findOneAndUpdate(
      { _id: versionId, mouId },
      { isFinal: true },
      { session, new: true },
    );

    if (!finalVersion) throw new Error("Version missing");

    // 🔥 store final version on MOU
    mou.currentStatus = "final_agreed";
    mou.finalVersionId = finalVersion._id;

    await mou.save({ session });

    await session.commitTransaction();

    res.json({
      message: "Finalized successfully",
      finalVersionId: finalVersion._id,
    });
  } catch (e) {
    await session.abortTransaction();
    res.status(500).json({ message: e.message });
  } finally {
    session.endSession();
  }
};

/* =====================================================
   GET MY MOU
===================================================== */

exports.getMyMou = async (req, res) => {
  const mou = await MOU.findOne({ organizationId: req.user });
  if (!mou) return res.status(404).json({ message: "No MOU" });

  const latestVersion = await MouVersion.findOne({
    mouId: mou._id,
    isBaseTemplate: { $ne: true },
  })
    .sort({ version: -1 })
    .lean();

  res.json({
    data: {
      mou,
      latestVersion,
    },
  });
};

/* =====================================================
   OTP SIGNING
===================================================== */

exports.sendMouOtp = async (req, res) => {
  const mou = await MOU.findOne({ organizationId: req.user });

  if (!mou || mou.currentStatus !== "final_agreed")
    return res.status(400).json({ message: "Not ready to sign" });

  await Otp.deleteMany({ email: req.user.email });

  const otp = crypto.randomInt(100000, 999999).toString();

  await Otp.create({
    email: req.user.email,
    otp,
    expiresAt: Date.now() + 300000,
  });

  await sendVerificationEmail(req.user.email, "MOU OTP", otpTemplate(otp));

  res.json({ message: "OTP sent" });
};

exports.verifyMouOtp = async (req, res) => {
  const { otp } = req.body;

  const record = await Otp.findOne({ email: req.user.email, otp });
  if (!record) return res.status(400).json({ message: "Invalid OTP" });

  const mou = await MOU.findOne({ organizationId: req.user });
  if (!mou) return res.status(404).json({ message: "MOU missing" });

  const pdf = await generateSignedPdf({
    mou,
    user: req.user,
  });

  mou.currentStatus = "signed";
  mou.signedAt = new Date();
  mou.signedBy = {
    userId: req.user._id,
    name: req.user.name,
    email: req.user.email,
  };
  mou.finalPdfUrl = "/" + pdf.replace(/^\/+/, "");

  await mou.save();
  await User.updateOne({ _id: req.user }, { mouSigned: true });
  await Otp.deleteOne({ _id: record._id });

  res.json({ message: "Signed successfully" });
};

/* =====================================================
   ADMIN LIST
===================================================== */

exports.getAllMousForAdmin = async (req, res) => {
  const mous = await MOU.find()
    .populate("organizationId", "name email")
    .sort({ updatedAt: -1 });

  const data = await Promise.all(
    mous.map(async (m) => {
      const latest = await MouVersion.findOne({
        mouId: m._id,
        isBaseTemplate: { $ne: true },
      })
        .sort({ version: -1 })
        .select(
          "_id version htmlContent createdBy isFinal remarks acceptedClauses allClauses",
        );

      return {
        _id: m._id,
        mouNumber: m.mouNumber,
        organization: m.organizationId,
        currentStatus: m.currentStatus,
        latestVersionId: latest?._id,
        latestVersion: latest?.version,
        latestBy: latest?.createdBy,
        isFinal: latest?.isFinal,
        htmlContent: latest?.htmlContent,
        acceptedClauses: latest?.acceptedClauses || [],
        allClauses: latest?.allClauses || [],
        remarks: latest?.remarks || "",

        signedPdfUrl: m.finalPdfUrl,
        signedAt: m.signedAt,
        createdAt: m.createdAt,
      };
    }),
  );

  res.json({ data });
};
