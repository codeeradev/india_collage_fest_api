const Event = require("../../../models/event");
const toIST = require("../../../utils/istConverter");
const type = "Event";
const message = require("../../../constants/messages.json");
const City = require("../../../models/city");
const User = require("../../../models/user");

const cityType = "Cities";
exports.addEvent = async (req, res) => {
  try {
    const userId = req.user;
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

    const user = await User.findById(userId);

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
      address,
      category,
      sub_category: subCategory,
      isFeatured: false,
      visibility,
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

    const filter = { visibility: true };

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
    const cities = await City.find({ is_active: true }).sort({ createdAt: -1 });

    return res.status(200).json({
      message: message.fetchSuccess.replace("{value}", cityType),
      data: cities,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: message.server_error });
  }
};
