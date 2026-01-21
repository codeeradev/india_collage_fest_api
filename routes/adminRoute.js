const express = require("express");
const router = express.Router();
const verifyToken = require("../middleware/verifyAuth");

const { addCategory, getCategory, addSubCategory, getSubCategoriesByCategory, editEvents, getEvent } = require('../controlers/admin/adminControler');

const { addCity, getCity, editCity } = require('../controlers/admin/areaControler');

const upload = require("../middleware/upload");

router.post("/add-category", upload, addCategory)
router.post("/add-sub-category", upload, addSubCategory)
router.post("/add-city", addCity)
router.post("/edit-city/:cityId", editCity)
router.post("/editEvents/:eventId", verifyToken, editEvents)

router.get("/get-category", getCategory)
router.get("/get-city", getCity)
router.get("/get-event", getEvent)

router.get("/get-sub-category/:categoryId", getSubCategoriesByCategory)

module.exports = router;
