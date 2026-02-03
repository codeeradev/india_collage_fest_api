const User = require("../../../models/user");
const OtpModel = require("../../../models/otp");
const AdminApproval = require("../../../models/adminApproval");
const Event = require("../../../models/event");
const { sendVerificationEmail } = require("../../../config/nodeMailer");
const { otpTemplate } = require("../../../utils/emailTemplates");
const crypto = require("crypto");
const message = require("../../../constants/messages.json");
const MOU = require("../../../models/mou");
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

    if (user.roleId === 3 && !user.mouId) {
      const mouCount = await MOU.countDocuments();

      const mou = await MOU.create({
        organizationId: user._id,
        mouNumber: `MOU-${new Date().getFullYear()}-${String(
          mouCount + 1,
        ).padStart(5, "0")}`,
      });

      user.mouId = mou._id;
      user.mouSigned = false;

      await user.save();
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

exports.getOrganiser = async (req, res) => {
  try {
    const organisers = await User.find({
      roleId: 3,
      status: true,
    })
      .select("-password -otp -__v")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      message: "Organisers fetched successfully",
      total: organisers.length,
      organisers,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Server error",
    });
  }
};

exports.getOrganiserEvents = async (req, res) => {
  try {
    const { organiser } = req.query;

    if (!organiser) {
      return res.status(400).json({
        message: "Organiser id required",
      });
    }

    // 👤 organiser info
    const organiserData = await User.findById(organiser).select(
      "name image bannerImage events",
    );

    if (!organiserData) {
      return res.status(404).json({
        message: "Organiser not found",
      });
    }

    // 🎫 organiser events
    const events = await Event.find({
      user_id: organiser,
      visibility: true,
    })
      .sort({ createdAt: -1 })
      .limit(20);

    res.status(200).json({
      organiser: organiserData,
      events,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.getUserProfile = async (req, res) => {
  try {
    const userId = req.user;

    const profile = await User.findOne({
      _id: userId,
      roleId: { $nin: [1, 2, 3] },
      status: true,
    })
      .select("-otp -__v")
      .populate({
        path: "location",
        select: "_id city",
      });
    if (!profile) {
      return res.status(404).json({
        message: "Profile not found",
      });
    }

    return res.status(200).json({
      message: "Profile fetched successfully",
      profile,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Server error",
    });
  }
};

exports.updateUserProfile = async (req, res) => {
  try {
    const userId = req.user;

    // Allowed fields
    const allowedFields = ["name", "location", "phone", "email", "image"];

    // Build update object dynamically
    const updateDetails = {};
    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        updateDetails[field] = req.body[field];
      }
    });

    if (req.files?.image) {
      updateDetails.image = `/assets/uploads/${req.files.image[0].filename}`;
    }

    // If nothing to update
    if (Object.keys(updateDetails).length === 0) {
      return res.status(400).json({
        message: "No valid fields provided for update",
      });
    }

    const profile = await User.findByIdAndUpdate(
      userId,
      { $set: updateDetails },
      { new: true },
    )
      .select("-otp -__v")
      .populate({
        path: "location",
        select: "_id city",
      });

    if (!profile) {
      return res.status(404).json({
        message: "Profile not found",
      });
    }

    return res.status(200).json({
      message: "Profile updated successfully",
      profile,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Server error",
    });
  }
};
