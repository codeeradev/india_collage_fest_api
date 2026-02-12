const express = require("express");
const router = express.Router();
const verifyToken = require("../middleware/verifyAuth");

const { loginUser, verifyOtp, becomeAOrganiser, getOrganiser, getOrganiserEvents, getUserProfile, updateUserProfile } = require('../controlers/admin/website/userControler');

const { getCategory, getSubCategoriesByCategory } = require('../controlers/admin/website/categoryControler');
const { addEvent, getEvent, getCitiesWebsite } = require('../controlers/admin/website/websiteControler');
const { trackVisit } = require('../controlers/admin/website/visitController');
const { getPublishedBlogs, getBlogBySlug } = require('../controlers/admin/website/blogController');

const {
  getUserEvents,
  editUserEvent,
} = require("../controlers/admin/userEventController");

const upload = require("../middleware/upload");

router.post("/add-event", verifyToken, upload, addEvent)
router.post("/login", loginUser),
router.post("/verify-otp", verifyOtp),
router.post("/track-visit", trackVisit),

router.post("/become-a-organiser", upload, becomeAOrganiser),

router.get("/blogs", getPublishedBlogs),
router.get("/blogs/:slug", getBlogBySlug),

router.get("/get-organiser", getOrganiser)
router.get("/get-organiser-event", getOrganiserEvents)
router.get("/get-event", getEvent)
router.get("/get-city-website", getCitiesWebsite)
router.get("/get-category", getCategory), 
router.get("/get-sub-category/:categoryId", getSubCategoriesByCategory), 
router.get("/get-user-profile", verifyToken, getUserProfile),
router.post("/update-user-profile", upload, verifyToken, updateUserProfile),

router.get("/user/events", verifyToken, getUserEvents);
router.post("/user/edit-event/:eventId", verifyToken, upload, editUserEvent);

module.exports = router;
