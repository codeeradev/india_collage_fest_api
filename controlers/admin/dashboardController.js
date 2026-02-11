const Category = require("../../models/category");
const City = require("../../models/city");
const Event = require("../../models/event");
const User = require("../../models/user");
const AdminApproval = require("../../models/adminApproval");
const message = require("../../constants/messages.json");

const getUserId = (req) => req.user?._id || req.user;

exports.getDashboardStats = async (req, res) => {
  try {
    const [
      totalUsers,
      totalOrganisers,
      totalEvents,
      totalCategories,
      totalCities,
      pendingEventApprovals,
      pendingOrganizerApprovals,
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ roleId: 3 }),
      Event.countDocuments(),
      Category.countDocuments(),
      City.countDocuments(),
      Event.countDocuments({ approvalStatus: "pending" }),
      AdminApproval.countDocuments({ type: "ORGANIZER", status: "pending" }),
    ]);

    return res.status(200).json({
      message: "Dashboard stats fetched successfully",
      data: {
        totalUsers,
        totalOrganisers,
        totalEvents,
        totalCategories,
        totalCities,
        pendingEventApprovals,
        pendingOrganizerApprovals,
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Server error",
    });
  }
};

exports.getUserDashboard = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const [total, approved, pending, rejected, resubmitted] =
      await Promise.all([
        Event.countDocuments({ user_id: userId }),
        Event.countDocuments({ user_id: userId, approvalStatus: "approved" }),
        Event.countDocuments({ user_id: userId, approvalStatus: "pending" }),
        Event.countDocuments({ user_id: userId, approvalStatus: "rejected" }),
        Event.countDocuments({ user_id: userId, approvalStatus: "resubmitted" }),
      ]);

    const upcoming = await Event.countDocuments({
      user_id: userId,
      start_date: { $gte: new Date() },
    });

    const latestEvents = await Event.find({ user_id: userId })
      .sort({ createdAt: -1 })
      .limit(5)
      .select("_id title approvalStatus start_date end_date image visibility");

    return res.status(200).json({
      message: "Dashboard fetched successfully",
      stats: {
        total,
        approved,
        pending,
        rejected,
        resubmitted,
        upcoming,
      },
      latestEvents,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: message.server_error });
  }
};
