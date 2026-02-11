const axios = require("axios");
const crypto = require("crypto");
const FacebookPage = require("../../models/FacebookPage.js");
const OauthToken = require("../../models/OauthToken.js");
const SocialPost = require("../../models/socialPost.js");
const User = require("../../models/user");

const GRAPH_URL = "https://graph.facebook.com/v20.0";
const OAUTH_URL = "https://www.facebook.com/v20.0/dialog/oauth";

/* ---------------- TOKEN ENCRYPTION ---------------- */

const encrypt = (text) => {
  const cipher = crypto.createCipheriv(
    "aes-256-cbc",
    Buffer.from(process.env.APP_KEY),
    Buffer.from(process.env.APP_IV),
  );
  return cipher.update(text, "utf8", "hex") + cipher.final("hex");
};

const decrypt = (text) => {
  const decipher = crypto.createDecipheriv(
    "aes-256-cbc",
    Buffer.from(process.env.APP_KEY),
    Buffer.from(process.env.APP_IV),
  );
  return decipher.update(text, "hex", "utf8") + decipher.final("utf8");
};

/* ---------------- LOAD TOKEN ---------------- */

exports.loadToken = async (userId) => {
  const token = await OauthToken.findOne({ userId, provider: "meta" }).sort({
    _id: -1,
  });
  return token?.accessToken || "";
};

const loadToken = (...args) => exports.loadToken(...args);

/* ---------------- OAUTH REDIRECT ---------------- */

exports.redirectToMeta = (req, res) => {
  const redirectUri = req.query.redirect_uri || process.env.META_REDIRECT_URI;
  const params = new URLSearchParams({
    client_id: process.env.META_CLIENT_ID,
    redirect_uri: redirectUri,
    scope:
      "pages_show_list,pages_read_engagement,pages_read_user_content,pages_manage_posts,pages_manage_ads,leads_retrieval,instagram_basic,instagram_manage_insights,instagram_content_publish,business_management",
    response_type: "code",
  });

  res.redirect(`${OAUTH_URL}?${params.toString()}`);
};

/* ---------------- SAVE TOKEN ---------------- */

exports.metaSaveToken = async (req, res) => {
  try {
    const { code } = req.query;
    if (!code) return res.status(400).json({ error: "No OAuth code" });

    const redirectUri = req.query.redirect_uri || process.env.META_REDIRECT_URI;

    const tokenRes = await axios.get(`${GRAPH_URL}/oauth/access_token`, {
      params: {
        client_id: process.env.META_CLIENT_ID,
        client_secret: process.env.META_CLIENT_SECRET,
        redirect_uri: redirectUri,
        code,
      },
    });

    const expires = new Date(
      Date.now() + (tokenRes.data.expires_in || 3600) * 1000,
    );

    await OauthToken.findOneAndUpdate(
      { userId: req.user._id, provider: "meta" },
      {
        accessToken: tokenRes.data.access_token,
        expiresAt: expires,
      },
      { upsert: true },
    );

    res.json({ message: "META login completed" });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

/* ---------------- BUSINESS PAGES ---------------- */

exports.getBusinessAccounts = async (req, res) => {
  try {
    const userId = req.user._id;

    if (req.user.roleId !== 1) {
      if (req.user.facebook_page_id) {
        const page = await FacebookPage.findById(req.user.facebook_page_id);
        return res.json({ data: page });
      }
      return res.json({ data: [] });
    }

    const refresh = req.query.refresh;
    const existing = await FacebookPage.find({ userId });

    if (!refresh && existing.length) return res.json({ data: existing });

    const access = await loadToken(userId);
    if (!access)
      return res.status(400).json({ message: "No Meta token found" });

    const metaRes = await axios.get(`${GRAPH_URL}/me/accounts`, {
      params: { access_token: access },
    });

    for (const page of metaRes.data.data) {
      await FacebookPage.findOneAndUpdate(
        { userId, page_id: page.id },
        {
          name: page.name,
          category: page.category,
          tasks: page.tasks,
          category_list: page.category_list,
          access_token: encrypt(page.access_token),
        },
        { upsert: true },
      );
    }

    const saved = await FacebookPage.find({ userId });
    res.json({ data: saved });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

/* ---------------- FB INSIGHTS ---------------- */

exports.getFacebookInsights = async (req, res) => {
  try {
    const { pageId } = req.body;

    const page = await FacebookPage.findOne({
      userId: req.user._id,
      page_id: pageId,
    });

    if (!page) return res.status(404).json({ message: "Page not found" });

    const token = decrypt(page.access_token);

    const metaRes = await axios.get(`${GRAPH_URL}/${pageId}/insights`, {
      params: {
        metric: "page_post_engagements",
        period: "days_28",
        access_token: token,
      },
    });

    res.json(metaRes.data.data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

/* ---------------- INSTAGRAM ACCOUNT ---------------- */

exports.getInstagramAccount = async (req, res) => {
  try {
    const { pageId } = req.body;

    const page = await FacebookPage.findOne({
      userId: req.user._id,
      page_id: pageId,
    });

    if (!page) return res.status(404).json({ message: "Page not found" });

    if (page.instagram_id) return res.json({ data: page.instagram_id });

    const token = decrypt(page.access_token);

    const metaRes = await axios.get(`${GRAPH_URL}/${pageId}`, {
      params: {
        fields: "connected_instagram_account",
        access_token: token,
      },
    });

    const igId = metaRes.data.connected_instagram_account?.id;
    if (!igId) return res.status(404).json({ message: "No IG connected" });

    page.instagram_id = igId;
    await page.save();

    res.json({ data: igId });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

/* ---------------- INSTAGRAM INSIGHTS ---------------- */

exports.getInstagramInsights = async (req, res) => {
  try {
    const { pageId } = req.body;

    const page = await FacebookPage.findOne({
      userId: req.user._id,
      page_id: pageId,
    });

    const token = decrypt(page.access_token);

    const metaRes = await axios.get(
      `${GRAPH_URL}/${page.instagram_id}/insights`,
      {
        params: {
          metric: "reach,profile_views,accounts_engaged,total_interactions",
          period: "day",
          metric_type: "total_value",
          access_token: token,
        },
      },
    );

    res.json(metaRes.data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

/* ---------------- PAGE POSTS ---------------- */

exports.getPagePosts = async (req, res) => {
  try {
    const { pageId } = req.body;

    const page = await FacebookPage.findOne({
      _id: req.user.facebook_page_id,
      page_id: pageId,
    });

    const token = decrypt(page.access_token);

    const metaRes = await axios.get(`${GRAPH_URL}/${pageId}/posts`, {
      params: {
        fields:
          "id,message,created_time,full_picture,likes.summary(true),comments.summary(true)",
        access_token: token,
      },
    });

    res.json(metaRes.data.data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

/* ---------------- INSTAGRAM MEDIA ---------------- */

exports.getInstagramMedia = async (req, res) => {
  try {
    const { pageId } = req.body;

    const page = await FacebookPage.findOne({
      _id: req.user.facebook_page_id,
      page_id: pageId,
    });

    const token = decrypt(page.access_token);

    const metaRes = await axios.get(`${GRAPH_URL}/${page.instagram_id}/media`, {
      params: {
        fields: "id,caption,media_type,media_url,timestamp",
        access_token: token,
      },
    });

    res.json(metaRes.data.data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

/* ---------------- LEADS ---------------- */

exports.fetchLeads = async (req, res) => {
  try {
    const { pageId } = req.body;

    const page = await FacebookPage.findOne({ page_id: pageId });

    const token = decrypt(page.access_token);

    const formsRes = await axios.get(`${GRAPH_URL}/${pageId}/leadgen_forms`, {
      params: { access_token: token },
    });

    let leads = [];

    for (const form of formsRes.data.data) {
      const leadRes = await axios.get(`${GRAPH_URL}/${form.id}/leads`, {
        params: {
          access_token: token,
          fields:
            "created_time,ad_id,ad_name,adset_name,campaign_name,field_data",
        },
      });

      leads.push(...leadRes.data.data);
    }

    res.json(leads);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

/* ---------------- META LOGIN URL ---------------- */

exports.getMetaLoginUrl = (req, res) => {
  if (req.user.roleId !== 1) {
    return res.status(403).json({ message: "Access denied" });
  }

  const redirectUri = req.query.redirect_uri || process.env.META_REDIRECT_URI;

  const params = new URLSearchParams({
    client_id: process.env.META_CLIENT_ID,
    redirect_uri: redirectUri,
    scope:
      "pages_show_list,pages_read_engagement,pages_read_user_content,pages_manage_posts,pages_manage_ads,leads_retrieval,instagram_basic,instagram_manage_insights,instagram_content_publish,business_management",
    response_type: "code",
  });

  return res.json({ url: `${OAUTH_URL}?${params.toString()}` });
};

/* ---------------- ACTIVE PAGE ---------------- */

exports.setActivePage = async (req, res) => {
  try {
    if (req.user.roleId !== 1) {
      return res.status(403).json({ message: "Access denied" });
    }

    const { pageId } = req.body;
    if (!pageId) {
      return res.status(400).json({ message: "pageId is required" });
    }

    const page = await FacebookPage.findOne({
      _id: pageId,
      userId: req.user._id,
    });

    if (!page) {
      return res.status(404).json({ message: "Page not found" });
    }

    req.user.facebook_page_id = page._id;
    await req.user.save();

    return res.json({ message: "Active page set", page });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
};

exports.getActivePage = async (req, res) => {
  try {
    let page = null;

    if (req.user.roleId === 1) {
      if (req.user.facebook_page_id) {
        page = await FacebookPage.findById(req.user.facebook_page_id);
      }
    } else {
      const admin = await User.findOne({
        roleId: 1,
        facebook_page_id: { $ne: null },
      }).sort({ createdAt: 1 });

      if (admin?.facebook_page_id) {
        page = await FacebookPage.findById(admin.facebook_page_id);
      }
    }

    return res.json({ data: page });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
};

/* ---------------- POSTER REQUESTS ---------------- */

const normalizePlatforms = (value) => {
  if (!value) return ["facebook", "instagram"];

  if (Array.isArray(value)) {
    return value.map((v) => String(v).toLowerCase());
  }

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        return parsed.map((v) => String(v).toLowerCase());
      }
    } catch {
      // ignore
    }

    return value
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean)
      .map((v) => v.toLowerCase());
  }

  return ["facebook", "instagram"];
};

const buildImageUrl = (req, imagePath) => {
  if (!imagePath) return "";
  if (imagePath.startsWith("http")) return imagePath;
  const baseUrl = `${req.protocol}://${req.get("host")}`;
  const path = imagePath.startsWith("/") ? imagePath : `/${imagePath}`;
  return `${baseUrl}${path}`;
};

exports.createPosterRequest = async (req, res) => {
  try {
    const image = req.files?.image?.[0]?.filename
      ? `/assets/uploads/${req.files.image[0].filename}`
      : null;

    if (!image) {
      return res.status(400).json({ message: "Poster image is required" });
    }

    const caption = req.body.caption || "";
    const platforms = normalizePlatforms(req.body.platforms || req.body.platform);

    const post = await SocialPost.create({
      userId: req.user._id,
      caption,
      platforms,
      image,
    });

    return res.status(201).json({
      message: "Poster submitted for approval",
      post,
    });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
};

exports.getPosterRequests = async (req, res) => {
  try {
    if (req.user.roleId !== 1) {
      return res.status(403).json({ message: "Access denied" });
    }

    const status = req.query.status || "pending";

    const posts = await SocialPost.find({ status })
      .populate("userId", "name email image")
      .sort({ createdAt: -1 });

    return res.json({ data: posts });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
};

exports.getMyPosters = async (req, res) => {
  try {
    const posts = await SocialPost.find({ userId: req.user._id }).sort({
      createdAt: -1,
    });
    return res.json({ data: posts });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
};

exports.rejectPoster = async (req, res) => {
  try {
    if (req.user.roleId !== 1) {
      return res.status(403).json({ message: "Access denied" });
    }

    const { id, reason } = req.body;
    if (!id) {
      return res.status(400).json({ message: "id is required" });
    }

    const post = await SocialPost.findById(id);
    if (!post) return res.status(404).json({ message: "Post not found" });

    post.status = "rejected";
    post.rejectionReason = reason || "Rejected by admin";
    post.approvedBy = req.user._id;
    post.approvedAt = new Date();

    await post.save();

    return res.json({ message: "Poster rejected", post });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
};

exports.approvePoster = async (req, res) => {
  try {
    if (req.user.roleId !== 1) {
      return res.status(403).json({ message: "Access denied" });
    }

    const { id } = req.body;
    if (!id) {
      return res.status(400).json({ message: "id is required" });
    }

    const post = await SocialPost.findById(id);
    if (!post) return res.status(404).json({ message: "Post not found" });

    if (post.status !== "pending") {
      return res.status(400).json({ message: "Post already processed" });
    }

    if (!req.user.facebook_page_id) {
      return res.status(400).json({ message: "Active page not set" });
    }

    const page = await FacebookPage.findById(req.user.facebook_page_id);
    if (!page) return res.status(404).json({ message: "Page not found" });

    const token = decrypt(page.access_token);
    const imageUrl = buildImageUrl(req, post.image);
    const platforms = normalizePlatforms(post.platforms);

    let facebookPostId = null;
    let instagramMediaId = null;
    const errors = [];

    if (platforms.includes("facebook")) {
      try {
        const fbRes = await axios.post(`${GRAPH_URL}/${page.page_id}/photos`, null, {
          params: {
            url: imageUrl,
            caption: post.caption,
            access_token: token,
          },
        });

        facebookPostId = fbRes.data.post_id || fbRes.data.id || null;
      } catch (err) {
        errors.push(`facebook: ${err?.response?.data?.error?.message || err.message}`);
      }
    }

    if (platforms.includes("instagram")) {
      try {
        let instagramId = page.instagram_id;

        if (!instagramId) {
          const igRes = await axios.get(`${GRAPH_URL}/${page.page_id}`, {
            params: {
              fields: "connected_instagram_account",
              access_token: token,
            },
          });

          instagramId = igRes.data.connected_instagram_account?.id;
          if (instagramId) {
            page.instagram_id = instagramId;
            await page.save();
          }
        }

        if (!instagramId) {
          throw new Error("No IG account connected");
        }

        const createRes = await axios.post(
          `${GRAPH_URL}/${instagramId}/media`,
          null,
          {
            params: {
              image_url: imageUrl,
              caption: post.caption,
              access_token: token,
            },
          },
        );

        const creationId = createRes.data.id;

        const publishRes = await axios.post(
          `${GRAPH_URL}/${instagramId}/media_publish`,
          null,
          {
            params: {
              creation_id: creationId,
              access_token: token,
            },
          },
        );

        instagramMediaId = publishRes.data.id || null;
      } catch (err) {
        errors.push(`instagram: ${err?.response?.data?.error?.message || err.message}`);
      }
    }

    if (!facebookPostId && !instagramMediaId) {
      post.status = "failed";
      post.error = errors.join("; ") || "Publish failed";
      await post.save();
      return res.status(500).json({
        message: "Publish failed",
        error: post.error,
      });
    }

    post.status = "published";
    post.approvedBy = req.user._id;
    post.approvedAt = new Date();
    post.publishedAt = new Date();
    post.facebookPostId = facebookPostId;
    post.instagramMediaId = instagramMediaId;
    post.pageId = page.page_id;
    post.error = errors.length ? errors.join("; ") : null;

    await post.save();

    return res.json({
      message: "Poster published",
      post,
      warnings: errors.length ? errors : null,
    });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
};

exports.getPosterDashboard = async (req, res) => {
  try {
    if (req.user.roleId !== 1) {
      return res.status(403).json({ message: "Access denied" });
    }

    if (!req.user.facebook_page_id) {
      return res.status(400).json({ message: "Active page not set" });
    }

    const page = await FacebookPage.findById(req.user.facebook_page_id);
    if (!page) return res.status(404).json({ message: "Page not found" });

    const token = decrypt(page.access_token);

    const posts = await SocialPost.find({ status: "published" })
      .sort({ createdAt: -1 })
      .limit(10);

    const metrics = await Promise.all(
      posts.map(async (post) => {
        let likes = 0;
        let comments = 0;
        let views = 0;

        if (post.facebookPostId) {
          try {
            const fbRes = await axios.get(
              `${GRAPH_URL}/${post.facebookPostId}`,
              {
                params: {
                  fields:
                    "likes.summary(true),comments.summary(true),insights.metric(post_impressions)",
                  access_token: token,
                },
              },
            );

            likes += fbRes.data.likes?.summary?.total_count || 0;
            comments += fbRes.data.comments?.summary?.total_count || 0;
            views +=
              fbRes.data.insights?.data?.[0]?.values?.[0]?.value || 0;
          } catch {
            // ignore metrics error
          }
        }

        if (post.instagramMediaId) {
          try {
            const igRes = await axios.get(
              `${GRAPH_URL}/${post.instagramMediaId}`,
              {
                params: {
                  fields: "like_count,comments_count",
                  access_token: token,
                },
              },
            );

            likes += igRes.data.like_count || 0;
            comments += igRes.data.comments_count || 0;
          } catch {
            // ignore metrics error
          }

          try {
            const igInsights = await axios.get(
              `${GRAPH_URL}/${post.instagramMediaId}/insights`,
              {
                params: {
                  metric: "impressions",
                  access_token: token,
                },
              },
            );

            views +=
              igInsights.data.data?.[0]?.values?.[0]?.value || 0;
          } catch {
            // ignore metrics error
          }
        }

        return {
          post,
          metrics: { likes, comments, views },
        };
      }),
    );

    const totals = metrics.reduce(
      (acc, item) => ({
        likes: acc.likes + item.metrics.likes,
        comments: acc.comments + item.metrics.comments,
        views: acc.views + item.metrics.views,
      }),
      { likes: 0, comments: 0, views: 0 },
    );

    return res.json({
      totals,
      posts: metrics,
    });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
};
