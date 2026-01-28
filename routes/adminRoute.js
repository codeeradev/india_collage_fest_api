const express = require("express");
const router = express.Router();
const verifyToken = require("../middleware/verifyAuth");

const {
  addCategory,
  getCategory,
  addSubCategory,
  getSubCategoriesByCategory,
  editEvents,
  getEvent,
  loginPanel,
  getApprovalsRequest,
  approvalAction,
  editProfile,
  getProfile,
} = require("../controlers/admin/adminControler");

const {
  addCity,
  getCity,
  editCity,
} = require("../controlers/admin/areaControler");

const upload = require("../middleware/upload");

router.post("/login-panel", loginPanel);
router.post("/edit-profile", upload, editProfile);
router.post("/add-category", upload, addCategory);
router.post("/add-sub-category", upload, addSubCategory);
router.post("/add-city", addCity);
router.post("/edit-city/:cityId", editCity);
router.post("/editEvents/:eventId", upload, verifyToken, editEvents);

router.post("/approval-action", approvalAction);

router.get("/get-category", getCategory);
router.get("/get-city", getCity);
router.get("/get-event", getEvent);
router.get("/get-profile/:userId", getProfile);

router.get("/get-event", getEvent);

router.get("/get-approvals-request", getApprovalsRequest);

router.get("/get-sub-category/:categoryId", getSubCategoriesByCategory);

module.exports = router;
