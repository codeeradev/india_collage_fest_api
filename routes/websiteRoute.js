const express = require("express");
const router = express.Router();

// const { addCategory, getCategory, addSubCategory, getSubCategoriesByCategory } = require('../controlers/admin/website/userControler');

const { getCategory, getSubCategoriesByCategory } = require('../controlers/admin/website/categoryControler');
const { addEvent, getEvent, getCitiesWebsite } = require('../controlers/admin/website/websiteControler');

const upload = require("../middleware/upload");

router.post("/add-event", upload, addEvent)

router.get("/get-event", getEvent)
router.get("/get-city-website", getCitiesWebsite)
router.get("/get-category", getCategory), 
router.get("/get-sub-category/:categoryId", getSubCategoriesByCategory), 


module.exports = router;
