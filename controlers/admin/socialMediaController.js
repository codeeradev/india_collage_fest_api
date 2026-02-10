const SocialMedia = require("../../models/socialMedia");

const parseBoolean = (value, fallback) => {
  if (value === undefined) return fallback;
  if (typeof value === "boolean") return value;
  const normalized = String(value).toLowerCase();
  return normalized === "true" || normalized === "1";
};

const parseNumber = (value, fallback) => {
  if (value === undefined || value === null || value === "") return fallback;
  const num = Number(value);
  return Number.isNaN(num) ? fallback : num;
};

const getPosterPath = (req) =>
  req.files?.image?.[0]?.filename
    ? `/assets/uploads/${req.files.image[0].filename}`
    : null;

exports.createSocialMedia = async (req, res) => {
  try {
    const platform = String(req.body.platform || "")
      .trim()
      .toLowerCase();
    const handle = String(req.body.handle || "").trim();
    const url = String(req.body.url || "").trim();

    if (!platform || !handle || !url) {
      return res.status(400).json({
        message: "platform, handle and url are required",
      });
    }

    const poster = getPosterPath(req);
    const isActive = parseBoolean(req.body.isActive, true);
    const sortOrder = parseNumber(req.body.sortOrder, 0);

    const item = await SocialMedia.create({
      platform,
      handle,
      url,
      poster,
      isActive,
      sortOrder,
    });

    return res.status(200).json({
      message: "Social media handle created",
      data: item,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server error" });
  }
};

exports.updateSocialMedia = async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await SocialMedia.findById(id);

    if (!existing) {
      return res.status(404).json({ message: "Social media handle not found" });
    }

    const updateData = {
      platform:
        req.body.platform !== undefined
          ? String(req.body.platform).trim().toLowerCase()
          : undefined,
      handle:
        req.body.handle !== undefined
          ? String(req.body.handle).trim()
          : undefined,
      url:
        req.body.url !== undefined
          ? String(req.body.url).trim()
          : undefined,
      isActive:
        req.body.isActive !== undefined
          ? parseBoolean(req.body.isActive, existing.isActive)
          : undefined,
      sortOrder:
        req.body.sortOrder !== undefined
          ? parseNumber(req.body.sortOrder, existing.sortOrder)
          : undefined,
    };

    const poster = getPosterPath(req);
    if (poster) updateData.poster = poster;

    Object.keys(updateData).forEach(
      (key) => updateData[key] === undefined && delete updateData[key],
    );

    const updated = await SocialMedia.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true },
    );

    return res.status(200).json({
      message: "Social media handle updated",
      data: updated,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server error" });
  }
};

exports.deleteSocialMedia = async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await SocialMedia.findById(id);

    if (!existing) {
      return res.status(404).json({ message: "Social media handle not found" });
    }

    await SocialMedia.findByIdAndDelete(id);

    return res.status(200).json({ message: "Social media handle deleted" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server error" });
  }
};

exports.getSocialMediaAdmin = async (req, res) => {
  try {
    const data = await SocialMedia.find().sort({ sortOrder: 1, createdAt: -1 });
    return res.status(200).json({ data });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server error" });
  }
};

exports.getSocialMediaPublic = async (req, res) => {
  try {
    const data = await SocialMedia.find({ isActive: true }).sort({
      sortOrder: 1,
      createdAt: -1,
    });
    return res.status(200).json({ data });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server error" });
  }
};
