const express = require("express");
const router = express.Router();
const verifyToken = require("../middleware/verifyAuth");

const { loginUser, verifyOtp, becomeAOrganiser } = require('../controlers/admin/website/userControler');

const { getCategory, getSubCategoriesByCategory } = require('../controlers/admin/website/categoryControler');
const { addEvent, getEvent, getCitiesWebsite } = require('../controlers/admin/website/websiteControler');

const upload = require("../middleware/upload");

router.post("/add-event", verifyToken, upload, addEvent)
router.post("/login", loginUser),
router.post("/verify-otp", verifyOtp),

router.post("/become-a-organiser", becomeAOrganiser),

router.get("/get-event", getEvent)
router.get("/get-city-website", getCitiesWebsite)
router.get("/get-category", getCategory), 
router.get("/get-sub-category/:categoryId", getSubCategoriesByCategory), 


module.exports = router;
