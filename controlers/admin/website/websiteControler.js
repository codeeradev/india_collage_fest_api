const Event = require("../../../models/event");
const toIST = require("../../../utils/istConverter");
const type = "Event";
const message = require("../../../constants/messages.json");
const City = require("../../../models/city");

const cityType = "Cities"
exports.addEvent = async (req, res) => {
  try {
    const { userId } = req.user;
    const {
      title,
      description,
      location,
      ticket_link,
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
      userId,
      location,
      ticket_link,
      category,
      subCategory,
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
    const { cityId } = req.query;

    let events;

    if (cityId) {
      // Fetch events based on city
      events = await Event.find({ cityId }).sort({ createdAt: -1 });
    } else {
      // Fetch latest 10 events
      events = await Event.find().sort({ createdAt: -1 }).limit(10);
    }

    return res.status(200).json({
      message: message.fetchSuccess.replace("{value}", type),
      events,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: message.server_error });
  }
};

exports.getCitiesWebsite = async (req, res) => {
  try {
    const cities = await City.find({is_active:true}).sort({ createdAt: -1 });

    return res.status(200).json({
      message: message.fetchSuccess.replace("{value}", cityType),
      data: cities,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: message.server_error });
  }
};

