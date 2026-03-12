const Event = require("../../../models/event");
const toIST = require("../../../utils/istConverter");
const type = "Event";
const message = require("../../../constants/messages.json");
const City = require("../../../models/city");
const User = require("../../../models/user");

const cityType = "Cities";
const getEventSourceByRole = (roleId) =>
  [1, 2, 3].includes(Number(roleId)) ? "organiser" : "user";
const getLimitValue = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 0;
};
const escapeRegex = (value) =>
  String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

exports.addEvent = async (req, res) => {
  try {
    const authUser = req.user;
    const userId = authUser?._id || authUser;
    const {
      title,
      description,
      location,
      ticket_price,
      start_date,
      end_date,
      eventMode,
      start_time,
      end_time,
      address,
      category,
      subCategory,
      visibility,
    } = req.body;

    const image = req.files?.image?.[0]?.filename
      ? `/assets/uploads/${req.files.image[0].filename}`
      : null;

    const user = authUser?.roleId ? authUser : await User.findById(userId);
    if (!user) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    if (Number(user.roleId) === 3) {
      const eventUploadLimit = getLimitValue(user.eventUploadLimit);
      if (eventUploadLimit > 0) {
        const existingEvents = await Event.countDocuments({ user_id: userId });
        if (existingEvents >= eventUploadLimit) {
          return res.status(403).json({
            message: `Event upload limit reached (${eventUploadLimit}). Please contact admin.`,
          });
        }
      }
    }

    const approvalStatus = user.roleId === 1 ? "approved" : "pending";
    const source = getEventSourceByRole(user.roleId);

    const newEvent = await Event.create({
      title,
      description,
      image,
      user_id: userId,
      location,
      ticket_price,
      eventMode,
      start_date,
      end_date,
      start_time,
      end_time,
      approvalStatus,
      address,
      category,
      sub_category: subCategory,
      isFeatured: false,
      visibility,
      source,
    });

    if ([1, 2, 3].includes(user.roleId)) {
      await User.findByIdAndUpdate(userId, {
        $inc: { events: 1 },
      });
    }

    return res.status(200).json({
      message: message.fetchSuccess.replace("{value}", type),
      newEvent,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: message.server_error });
  }
};

exports.getEvent = async (req, res) => {
  try {
    const {
      eventId,
      search,
      isFeatured,
      categoryId,
      cityId,
      free,
      paid,
      date,
      week,
      month,
    } = req.query;

    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 12;
    const skip = (page - 1) * limit;

    const filter = { visibility: true, approvalStatus: "approved" };

    /* ================= FEATURED ================= */
    if (isFeatured === "true") {
      filter.isFeatured = true;
    }

    /* ================= CITY ================= */
    if (cityId) {
      filter.location = cityId;
    }

    /* ================= CATEGORY ================= */
    if (categoryId) {
      filter.category = categoryId;
    }

    /* ================= PRICE ================= */
    if (free === "true") {
      filter.$or = [
        { ticket_price: "free" },
        { ticket_price: { $exists: false } },
        { ticket_price: null },
        { ticket_price: "" },
      ];
    }

    if (paid === "true") {
      filter.ticket_price = {
        $exists: true,
        $nin: ["free", "", null],
      };
    }

    /* ================= SEARCH ================= */
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }

    /* ================= DATE ================= */
    const now = new Date();

    if (date === "today") {
      const s = new Date(now.setHours(0, 0, 0, 0));
      const e = new Date(now.setHours(23, 59, 59, 999));
      filter.start_date = { $gte: s, $lte: e };
    }

    if (date === "tomorrow") {
      const s = new Date();
      s.setDate(s.getDate() + 1);
      s.setHours(0, 0, 0, 0);

      const e = new Date(s);
      e.setHours(23, 59, 59, 999);

      filter.start_date = { $gte: s, $lte: e };
    }

    if (date === "weekend") {
      const saturday = new Date();
      saturday.setDate(saturday.getDate() + (6 - saturday.getDay()));
      saturday.setHours(0, 0, 0, 0);

      const sunday = new Date(saturday);
      sunday.setDate(saturday.getDate() + 1);
      sunday.setHours(23, 59, 59, 999);

      filter.$and = [
        { start_date: { $lte: sunday } },
        {
          $or: [
            { end_date: { $gte: saturday } },
            { end_date: { $exists: false } },
            { end_date: null },
          ],
        },
      ];
    }

    if (week === "true") {
      const s = new Date();
      const e = new Date();
      e.setDate(e.getDate() + 7);
      filter.start_date = { $gte: s, $lte: e };
    }

    if (month === "true") {
      const s = new Date(now.getFullYear(), now.getMonth(), 1);
      const e = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
      filter.start_date = { $gte: s, $lte: e };
    }

    if (eventId) {
      filter._id = eventId;
    }

    const totalEvents = await Event.countDocuments(filter);

    const events = await Event.find(filter)
      .populate("location", "_id city")
      .populate("category", "_id name icon")
      .populate("sub_category", "_id name icon")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    return res.json({
      pagination: {
        page,
        limit,
        totalRecords: totalEvents,
        totalPages: Math.ceil(totalEvents / limit),
      },
      events,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.getCitiesWebsite = async (req, res) => {
  try {
    const { cityId, page, limit, search } = req.query;
    const pageNum = Number(page) || 1;
    const limitNum = Number(limit);
    const safeLimit = Number.isFinite(limitNum) && limitNum > 0 ? limitNum : 0;
    const skip = safeLimit ? (pageNum - 1) * safeLimit : 0;
    const normalizedSearch = String(search || "").trim();
    const searchRegex = normalizedSearch
      ? new RegExp(escapeRegex(normalizedSearch), "i")
      : null;

    // ==========================
    // IF CITY SELECTED → ONLY THAT CITY
    // ==========================
    if (cityId) {
      const city = await City.findOne({
        _id: cityId,
        is_active: true,
      }).lean();

      const events = await Event.find({ location: cityId })
        .sort({ createdAt: -1 })
        .lean();

      const approvedCount = await Event.countDocuments({
        location: cityId,
        approvalStatus: "approved",
        visibility: true,
      });

      return res.status(200).json({
        message: message.fetchSuccess.replace("{value}", cityType),
        data: city
          ? [
              {
                ...city,
                events,
                eventCount: approvedCount,
                popular: approvedCount > 0,
              },
            ]
          : [],   // 👈 SAME KEY (data)
      });
    }

    // ==========================
    // NORMAL CITY LIST (PAGINATED + POPULAR FIRST + SEARCH)
    // ==========================
    const cityMatch = { is_active: true };
    if (searchRegex) {
      cityMatch.$or = [{ city: searchRegex }, { description: searchRegex }];
    }

    const pipeline = [
      { $match: cityMatch },
      {
        $lookup: {
          from: "events",
          let: { cityId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ["$location", "$$cityId"] },
                approvalStatus: "approved",
                visibility: true,
              },
            },
            { $count: "count" },
          ],
          as: "eventStats",
        },
      },
      {
        $addFields: {
          eventCount: {
            $ifNull: [{ $arrayElemAt: ["$eventStats.count", 0] }, 0],
          },
        },
      },
      {
        $addFields: {
          popular: { $gt: ["$eventCount", 0] },
        },
      },
      { $project: { eventStats: 0 } },
      { $sort: { eventCount: -1, createdAt: -1 } },
    ];

    if (skip) {
      pipeline.push({ $skip: skip });
    }

    if (safeLimit) {
      pipeline.push({ $limit: safeLimit });
    }

    const cities = await City.aggregate(pipeline);

    return res.status(200).json({
      message: message.fetchSuccess.replace("{value}", cityType),
      data: cities,
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: message.server_error });
  }
};
