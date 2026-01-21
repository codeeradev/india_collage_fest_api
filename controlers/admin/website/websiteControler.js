const Event = require("../../../models/event");
const toIST = require("../../../utils/istConverter");
const type = "Event";
const message = require("../../../constants/messages.json");
const City = require("../../../models/city");

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
    const { eventId } = req.query;

    // pagination params
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // filter object
    let filter = { visibility: true };

    if (eventId) {
      filter._id = eventId;
    }

    // total count
    const totalEvents = await Event.countDocuments(filter);

    // fetch paginated data
    const events = await Event.find(filter)
      .populate({
        path: "location",
        select: "_id city",
      })
      .populate({
        path: "category",
        select: "_id name icon",
      })
      .populate({
        path: "sub_category",
        select: "_id name icon",
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const totalPages = Math.ceil(totalEvents / limit);

    return res.status(200).json({
      message: message.fetchSuccess.replace("{value}", type),

      pagination: {
        totalRecords: totalEvents,
        totalPages,
        currentPage: page,
        limit,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },

      events,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: message.server_error,
    });
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
