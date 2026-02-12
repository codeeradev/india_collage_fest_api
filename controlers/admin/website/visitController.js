const WebsiteVisit = require("../../../models/websiteVisit");

const getDateKey = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

exports.trackVisit = async (req, res) => {
  try {
    const dateKey = getDateKey(new Date());

    await WebsiteVisit.findOneAndUpdate(
      { dateKey },
      { $inc: { count: 1 } },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );

    return res.status(201).json({ message: "Visit counted" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server error" });
  }
};
