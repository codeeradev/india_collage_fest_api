const City = require("../../models/city");
const message = require("../../constants/messages.json");

const type = "City";

// ADD CITY
exports.addCity = async (req, res) => {
  try {
    const { city, latitude, longitude, description, is_active, popular } = req.body;

    const image = `/assets/uploads/${req.files.image[0].filename}`
    const exists = await City.findOne({ city });
    if (exists) {
      return res.status(400).json({ message: "City already exists" });
    }

    const newCity = await City.create({
      city,
      latitude,
      longitude,
      description,
      image,
      popular,
      is_active: is_active ?? true,
    });

    return res.status(200).json({
      message: message.success.replace("{value}", type),
      data: newCity,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: message.server_error });
  }
};

// GET ALL CITIES
exports.getCity = async (req, res) => {
  try {
    const cities = await City.find().sort({ createdAt: -1 });

    return res.status(200).json({
      message: message.fetchSuccess.replace("{value}", type),
      data: cities,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: message.server_error });
  }
};

exports.editCity = async (req, res) => {
  try {
    const { cityId } = req.params;
    const { city, latitude, longitude, description, is_active, popular } = req.body;

    const updateData = {};

    if (city !== undefined) updateData.city = city;
    if (latitude !== undefined) updateData.latitude = latitude;
    if (longitude !== undefined) updateData.longitude = longitude;
    if (description !== undefined) updateData.description = description;
    if (is_active !== undefined) updateData.is_active = is_active;
    if (req.files?.image) {
      updateData.image = `/assets/uploads/${req.files.image[0].filename}`;
    }
    if (popular !== undefined) updateData.popular = popular;
      
    const updatedCity = await City.findByIdAndUpdate(
      cityId,
      { $set: updateData },
      { new: true }
    );

    return res.status(200).json({
      message: "City updated successfully",
      data: updatedCity,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: message.server_error });
  }
};
