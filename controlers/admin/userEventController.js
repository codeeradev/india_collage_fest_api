const Event = require("../../models/event");
const message = require("../../constants/messages.json");

const getUserId = (req) => req.user?._id || req.user;

exports.getUserEvents = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const { status, search } = req.query;

    const filter = { user_id: userId };
    if (status) {
      filter.approvalStatus = status;
    }
    if (search) {
      filter.title = { $regex: search, $options: "i" };
    }

    const totalEvents = await Event.countDocuments(filter);
    const events = await Event.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    return res.status(200).json({
      message: message.fetchSuccess.replace("{value}", "Events"),
      pagination: {
        page,
        limit,
        totalRecords: totalEvents,
        totalPages: Math.ceil(totalEvents / limit),
      },
      events,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: message.server_error });
  }
};

exports.editUserEvent = async (req, res) => {
  try {
    const userId = getUserId(req);
    const { eventId } = req.params;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const existingEvent = await Event.findOne({
      _id: eventId,
      user_id: userId,
    });

    if (!existingEvent) {
      return res.status(404).json({ message: "Event not found" });
    }

    const allowedFields = [
      "title",
      "description",
      "location",
      "ticket_price",
      "start_date",
      "end_date",
      "start_time",
      "end_time",
      "address",
      "category",
      "eventMode",
      "visibility",
    ];

    const updateData = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
      }
    }

    if (req.body.subCategory !== undefined) {
      updateData.sub_category = req.body.subCategory;
    }
    if (req.body.sub_category !== undefined) {
      updateData.sub_category = req.body.sub_category;
    }

    if (req.files?.image?.length) {
      updateData.image = `/assets/uploads/${req.files.image[0].filename}`;
    }

    // Any user edit should resubmit for approval
    updateData.approvalStatus = "pending";

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        message: "No valid fields provided for update",
      });
    }

    const updatedEvent = await Event.findByIdAndUpdate(
      eventId,
      { $set: updateData },
      { new: true },
    );

    return res.status(200).json({
      message: "Event updated successfully",
      event: updatedEvent,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: message.server_error });
  }
};
