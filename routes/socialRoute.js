const express = require("express");
const router = express.Router();
const verifyToken = require("../middleware/verifyAuth");
const { requirePermission } = require("../middleware/mouVerification");
const upload = require("../middleware/upload");

const {
  redirectToMeta,
  metaSaveToken,
  getBusinessAccounts,
  getFacebookInsights,
  getInstagramAccount,
  getInstagramInsights,
  getPagePosts,
  getInstagramMedia,
  fetchLeads,
  getMetaLoginUrl,
  setActivePage,
  getActivePage,
  createPosterRequest,
  getPosterRequests,
  getMyPosters,
  approvePoster,
  rejectPoster,
  getPosterDashboard,
} = require("../controlers/social/metaControler");

router.get("/meta/login", verifyToken, redirectToMeta);
router.get("/meta/login-url", verifyToken, getMetaLoginUrl);
router.get("/meta/callback", verifyToken, metaSaveToken);
router.get("/meta/pages", verifyToken, getBusinessAccounts);
router.get("/meta/active-page", verifyToken, getActivePage);
router.post("/meta/active-page", verifyToken, setActivePage);
router.post("/meta/fb/insights", verifyToken, getFacebookInsights);
router.post("/meta/ig/account", verifyToken, getInstagramAccount);
router.post("/meta/ig/insights", verifyToken, getInstagramInsights);
router.post("/meta/posts", verifyToken, getPagePosts);
router.post("/meta/ig/media", verifyToken, getInstagramMedia);
router.post("/meta/leads", verifyToken, fetchLeads);
router.post(
  "/meta/poster/submit",
  verifyToken,
  upload,
  requirePermission("POSTER_UPLOAD"),
  createPosterRequest,
);
router.get("/meta/poster/requests", verifyToken, getPosterRequests);
router.get("/meta/poster/my", verifyToken, getMyPosters);
router.post("/meta/poster/approve", verifyToken, approvePoster);
router.post("/meta/poster/reject", verifyToken, rejectPoster);
router.get("/meta/poster/dashboard", verifyToken, getPosterDashboard);

module.exports = router;
