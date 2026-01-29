const express = require("express");
const router = express.Router();
const verifyToken = require("../middleware/verifyAuth");
const {requireMouSigned} = require("../middleware/mouVerification")
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

const {
  getMyMou,
  sendMouOtp,
  verifyMouOtp,
} = require("../controlers/admin/mouController");
const upload = require("../middleware/upload");

router.post("/login-panel", loginPanel);
router.post("/edit-profile", verifyToken, upload, editProfile);
router.post("/add-category", upload, addCategory);
router.post("/add-sub-category", upload, addSubCategory);
router.post("/add-city", addCity);
router.post("/edit-city/:cityId", editCity);
router.post("/editEvents/:eventId", upload, verifyToken, requireMouSigned, editEvents);

router.post("/approval-action", approvalAction);

router.post("/organizer/mou/send-otp", verifyToken, sendMouOtp);

router.post("/organizer/mou/verify-otp", verifyToken, verifyMouOtp);

router.get("/get-category", getCategory);
router.get("/get-city", getCity);
router.get("/get-event", getEvent);
router.get("/get-profile/:userId", getProfile);

router.get("/get-event", getEvent);

router.get("/get-approvals-request", getApprovalsRequest);

router.get("/get-sub-category/:categoryId", getSubCategoriesByCategory);
router.get("/organizer/mou", verifyToken, getMyMou);

module.exports = router;
