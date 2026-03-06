const Event = require("../../../models/event");
const City = require("../../../models/city");
const User = require("../../../models/user");
const WebsiteVisit = require("../../../models/websiteVisit");
const HeroContent = require("../../../models/heroContent");

const HOME_HERO_KEY = "home";
const DEFAULT_AUTO_ROTATE_MS = 6500;

const DEFAULT_HERO_VIDEOS = [
  {
    title: "Sports",
    src: "https://storage.googleapis.com/ticket9-prod.appspot.com/videos/1765955266059_sport.mp4",
    order: 0,
    isActive: true,
  },
  {
    title: "Concerts",
    src: "https://storage.googleapis.com/ticket9-prod.appspot.com/videos/1765955219308_concert.mp4",
    order: 1,
    isActive: true,
  },
  {
    title: "Music",
    src: "https://storage.googleapis.com/ticket9-prod.appspot.com/videos/1765955295343_music.mp4",
    order: 2,
    isActive: true,
  },
];

const clampAutoRotateMs = (value) => {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return DEFAULT_AUTO_ROTATE_MS;
  }

  return Math.min(Math.max(Math.round(parsed), 2000), 30000);
};

const parseBooleanInput = (value, fallback) => {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") {
    if (value === 1) return true;
    if (value === 0) return false;
  }

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["true", "1", "yes", "on"].includes(normalized)) return true;
    if (["false", "0", "no", "off"].includes(normalized)) return false;
  }

  return fallback;
};

const sanitizeVideos = (videos = []) => {
  if (!Array.isArray(videos)) return [];

  return videos
    .map((item, index) => {
      const src = typeof item?.src === "string" ? item.src.trim() : "";
      const title = typeof item?.title === "string" ? item.title.trim() : "";

      if (!src) return null;

      return {
        title: title || `Video ${index + 1}`,
        src,
        order: Number.isFinite(Number(item?.order)) ? Number(item.order) : index,
        isActive: item?.isActive !== false,
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.order - b.order);
};

const sanitizeStats = (stats = []) => {
  if (!Array.isArray(stats)) return [];

  return stats
    .map((item, index) => {
      const label = typeof item?.label === "string" ? item.label.trim() : "";
      const value = Number(item?.value);

      if (!label || !Number.isFinite(value)) return null;

      return {
        key:
          typeof item?.key === "string" && item.key.trim()
            ? item.key.trim()
            : `metric_${index + 1}`,
        label,
        value,
        order: Number.isFinite(Number(item?.order)) ? Number(item.order) : index,
        isActive: item?.isActive !== false,
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.order - b.order);
};

const getFallbackMetrics = async () => {
  const [approvedEvents, activeOrganisers, activeCities, visits] = await Promise.all([
    Event.countDocuments({ visibility: true, approvalStatus: "approved" }),
    User.countDocuments({ roleId: 3, status: true }),
    City.countDocuments({ is_active: true }),
    WebsiteVisit.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: "$count" },
        },
      },
    ]),
  ]);

  const websiteVisits = visits?.[0]?.total || 0;

  return [
    {
      key: "approved_events",
      label: "Approved Events",
      value: approvedEvents,
      order: 0,
      isActive: true,
    },
    {
      key: "active_organisers",
      label: "Active Organisers",
      value: activeOrganisers,
      order: 1,
      isActive: true,
    },
    {
      key: "active_cities",
      label: "Active Cities",
      value: activeCities,
      order: 2,
      isActive: true,
    },
    {
      key: "website_visits",
      label: "Website Visits",
      value: websiteVisits,
      order: 3,
      isActive: true,
    },
  ];
};

const resolveHeroContent = async () => {
  const heroConfig = await HeroContent.findOne({ key: HOME_HERO_KEY }).lean();
  const useStaticStats = heroConfig?.useStaticStats === true;
  const useStaticVideos = heroConfig?.useStaticVideos !== false;

  const configuredVideos = sanitizeVideos(heroConfig?.videos).filter((item) => item.isActive);
  const configuredStats = sanitizeStats(heroConfig?.stats).filter((item) => item.isActive);

  const videos = useStaticVideos && configuredVideos.length
    ? configuredVideos
    : sanitizeVideos(DEFAULT_HERO_VIDEOS);

  const stats = useStaticStats && configuredStats.length
    ? configuredStats
    : await getFallbackMetrics();

  return {
    videos,
    stats,
    autoRotateMs: clampAutoRotateMs(heroConfig?.autoRotateMs),
    useStaticStats,
    useStaticVideos,
  };
};

exports.getHeroContent = async (req, res) => {
  try {
    const data = await resolveHeroContent();

    return res.status(200).json({
      message: "Hero content fetched successfully",
      data,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server error" });
  }
};

exports.getHeroVideos = async (req, res) => {
  try {
    const data = await resolveHeroContent();

    return res.status(200).json({
      message: "Hero videos fetched successfully",
      videos: data.videos,
      autoRotateMs: data.autoRotateMs,
      useStaticVideos: data.useStaticVideos,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server error" });
  }
};

exports.getHeroMetrics = async (req, res) => {
  try {
    const data = await resolveHeroContent();

    return res.status(200).json({
      message: "Hero metrics fetched successfully",
      stats: data.stats,
      useStaticStats: data.useStaticStats,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server error" });
  }
};

exports.getHeroContentAdmin = async (req, res) => {
  try {
    const heroConfig = await HeroContent.findOne({ key: HOME_HERO_KEY }).lean();

    return res.status(200).json({
      message: "Hero admin config fetched successfully",
      data: {
        key: HOME_HERO_KEY,
        videos: sanitizeVideos(heroConfig?.videos),
        stats: sanitizeStats(heroConfig?.stats),
        autoRotateMs: clampAutoRotateMs(heroConfig?.autoRotateMs),
        useStaticStats: heroConfig?.useStaticStats === true,
        useStaticVideos: heroConfig?.useStaticVideos !== false,
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server error" });
  }
};

exports.upsertHeroContent = async (req, res) => {
  try {
    const hasVideos = Object.prototype.hasOwnProperty.call(req.body, "videos");
    const hasStats = Object.prototype.hasOwnProperty.call(req.body, "stats");
    const hasAutoRotate = Object.prototype.hasOwnProperty.call(req.body, "autoRotateMs");
    const hasUseStaticStats = Object.prototype.hasOwnProperty.call(req.body, "useStaticStats");
    const hasUseStaticVideos = Object.prototype.hasOwnProperty.call(req.body, "useStaticVideos");

    if (!hasVideos && !hasStats && !hasAutoRotate && !hasUseStaticStats && !hasUseStaticVideos) {
      return res.status(400).json({
        message:
          "At least one field is required: videos, stats, autoRotateMs, useStaticStats, useStaticVideos",
      });
    }

    const updatePayload = {};

    if (hasVideos) {
      const videos = sanitizeVideos(req.body.videos);

      if (Array.isArray(req.body.videos) && req.body.videos.length && !videos.length) {
        return res.status(400).json({ message: "Please provide valid videos" });
      }

      updatePayload.videos = videos;
    }

    if (hasStats) {
      const stats = sanitizeStats(req.body.stats);

      if (Array.isArray(req.body.stats) && req.body.stats.length && !stats.length) {
        return res.status(400).json({ message: "Please provide valid stats" });
      }

      updatePayload.stats = stats;
    }

    if (hasAutoRotate) {
      updatePayload.autoRotateMs = clampAutoRotateMs(req.body.autoRotateMs);
    }

    if (hasUseStaticStats) {
      updatePayload.useStaticStats = parseBooleanInput(req.body.useStaticStats, false);
    }

    if (hasUseStaticVideos) {
      updatePayload.useStaticVideos = parseBooleanInput(req.body.useStaticVideos, true);
    }

    if (req.user?._id) {
      updatePayload.updatedBy = req.user._id;
    }

    await HeroContent.findOneAndUpdate(
      { key: HOME_HERO_KEY },
      {
        $set: updatePayload,
        $setOnInsert: { key: HOME_HERO_KEY },
      },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    );

    const data = await resolveHeroContent();

    return res.status(200).json({
      message: "Hero content updated successfully",
      data,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server error" });
  }
};
