const Category = require("../../models/category");
const City = require("../../models/city");
const Event = require("../../models/event");
const User = require("../../models/user");
const AdminApproval = require("../../models/adminApproval");
const WebsiteVisit = require("../../models/websiteVisit");
const message = require("../../constants/messages.json");

const getUserId = (req) => req.user?._id || req.user;

const getDateKey = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const getVisitSeries = async (days) => {
  const keys = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = days - 1; i >= 0; i -= 1) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    keys.push(getDateKey(d));
  }

  const docs = await WebsiteVisit.find({ dateKey: { $in: keys } }).lean();
  const map = docs.reduce((acc, doc) => {
    acc[doc.dateKey] = doc.count || 0;
    return acc;
  }, {});

  const series = keys.map((key) => ({ dateKey: key, count: map[key] || 0 }));
  const todayKey = keys[keys.length - 1];
  const todayVisits = map[todayKey] || 0;

  return { series, todayVisits };
};

exports.getDashboardStats = async (req, res) => {
  try {
    if (req.user?.roleId === 3) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const visitDays = 7;

    const [
      totalUsers,
      totalOrganisers,
      totalEvents,
      totalCategories,
      totalCities,
      pendingEventApprovals,
      pendingOrganizerApprovals,
      totalVisitsAgg,
      visitSeriesData,
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ roleId: 3 }),
      Event.countDocuments(),
      Category.countDocuments(),
      City.countDocuments(),
      Event.countDocuments({ approvalStatus: "pending" }),
      AdminApproval.countDocuments({ type: "ORGANIZER", status: "pending" }),
      WebsiteVisit.aggregate([
        { $group: { _id: null, total: { $sum: "$count" } } },
      ]),
      getVisitSeries(visitDays),
    ]);

    const totalVisits = totalVisitsAgg?.[0]?.total || 0;

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
        totalVisits,
        todayVisits: visitSeriesData.todayVisits,
        visitSeries: visitSeriesData.series,
        visitDays,
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
