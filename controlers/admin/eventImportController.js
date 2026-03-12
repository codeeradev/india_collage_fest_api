const fs = require("fs");
const mongoose = require("mongoose");

const Event = require("../../models/event");
const City = require("../../models/city");
const User = require("../../models/user");
const Category = require("../../models/category");
const SubCategory = require("../../models/subCategory");

const ALLOWED_ROLES = [1];
const EVENT_SOURCES = new Set(["organiser", "user", "google"]);
const APPROVAL_STATUSES = new Set([
  "approved",
  "rejected",
  "pending",
  "resubmitted",
]);

const escapeRegex = (value) =>
  String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const normalizeHeader = (value) =>
  String(value || "")
    .replace(/^\uFEFF/, "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");

const getValueByHeader = (headers, row, keys) => {
  for (const key of keys) {
    const idx = headers.indexOf(key);
    if (idx !== -1) {
      return row[idx] ?? "";
    }
  }
  return "";
};

const parseCsv = (content) => {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < content.length; i += 1) {
    const char = content[i];

    if (inQuotes) {
      if (char === '"') {
        if (content[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (char === "\r") {
      if (content[i + 1] === "\n") {
        i += 1;
      }
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += char;
    }
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows.filter((item) => item.some((value) => String(value).trim() !== ""));
};

const parseBoolean = (value) => {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (!normalized) return null;

  if (["true", "1", "yes", "y", "active"].includes(normalized)) return true;
  if (["false", "0", "no", "n", "inactive"].includes(normalized)) return false;

  return null;
};

const parseDateValue = (value) => {
  if (!value) return null;
  const date = new Date(String(value).trim());
  if (Number.isNaN(date.getTime())) return null;
  return date;
};

const isObjectId = (value) =>
  typeof value === "string" && mongoose.Types.ObjectId.isValid(value);

const readArrayPayload = (value) => {
  if (Array.isArray(value)) return value;
  if (typeof value !== "string") return [];

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return [];
  }
};

const getLookupValue = (rawValue) => String(rawValue || "").trim();

const resolveCityId = async (rawValue, cache) => {
  const lookup = getLookupValue(rawValue);
  if (!lookup) return null;

  if (isObjectId(lookup)) return lookup;

  const key = lookup.toLowerCase();
  if (cache.has(key)) return cache.get(key);

  const city = await City.findOne({
    city: { $regex: new RegExp(`^${escapeRegex(lookup)}$`, "i") },
  })
    .select("_id")
    .lean();

  const resolved = city?._id ? String(city._id) : null;
  cache.set(key, resolved);
  return resolved;
};

const resolveCategoryId = async (rawValue, cache) => {
  const lookup = getLookupValue(rawValue);
  if (!lookup) return null;

  if (isObjectId(lookup)) return lookup;

  const key = lookup.toLowerCase();
  if (cache.has(key)) return cache.get(key);

  const category = await Category.findOne({
    name: { $regex: new RegExp(`^${escapeRegex(lookup)}$`, "i") },
  })
    .select("_id")
    .lean();

  const resolved = category?._id ? String(category._id) : null;
  cache.set(key, resolved);
  return resolved;
};

const resolveSubCategoryId = async (rawValue, categoryId, cache) => {
  const lookup = getLookupValue(rawValue);
  if (!lookup) return null;

  if (isObjectId(lookup)) return lookup;

  const key = `${lookup.toLowerCase()}|${categoryId || ""}`;
  if (cache.has(key)) return cache.get(key);

  const filter = {
    name: { $regex: new RegExp(`^${escapeRegex(lookup)}$`, "i") },
  };

  if (categoryId && isObjectId(categoryId)) {
    filter.categoryId = categoryId;
  }

  const subCategory = await SubCategory.findOne(filter)
    .select("_id")
    .lean();

  const resolved = subCategory?._id ? String(subCategory._id) : null;
  cache.set(key, resolved);
  return resolved;
};

const getNormalizedEvent = async (raw, options) => {
  const cityCache = options.cityCache;
  const categoryCache = options.categoryCache;
  const subCategoryCache = options.subCategoryCache;

  const title = String(raw?.title || raw?.name || raw?.event_title || "").trim();
  if (!title) return null;

  const startDate =
    parseDateValue(raw?.start_date || raw?.startDate || raw?.date) || null;
  const endDate =
    parseDateValue(raw?.end_date || raw?.endDate) || startDate || null;

  const location = await resolveCityId(
    raw?.location || raw?.city || raw?.cityId || raw?.city_id,
    cityCache,
  );
  const category = await resolveCategoryId(
    raw?.category || raw?.categoryId || raw?.category_id,
    categoryCache,
  );
  const subCategory = await resolveSubCategoryId(
    raw?.sub_category ||
      raw?.subCategory ||
      raw?.sub_category_id ||
      raw?.subCategoryId,
    category,
    subCategoryCache,
  );

  const sourceRaw = String(raw?.source || options.defaultSource || "user")
    .trim()
    .toLowerCase();
  const source = EVENT_SOURCES.has(sourceRaw) ? sourceRaw : options.defaultSource;

  const approvalRaw = String(
    raw?.approvalStatus || raw?.approval_status || "approved",
  )
    .trim()
    .toLowerCase();
  const approvalStatus = APPROVAL_STATUSES.has(approvalRaw)
    ? approvalRaw
    : "approved";

  const visibilityRaw = parseBoolean(
    raw?.visibility ?? raw?.is_visible ?? raw?.visible,
  );
  const featuredRaw = parseBoolean(
    raw?.isFeatured ?? raw?.is_featured ?? raw?.featured,
  );

  const googleEventId = String(
    raw?.googleEventId || raw?.google_event_id || "",
  ).trim();

  const eventPayload = {
    title,
    description: String(raw?.description || "").trim(),
    address: String(raw?.address || "").trim(),
    ticket_price: String(raw?.ticket_price || raw?.ticketPrice || "").trim(),
    start_time: String(raw?.start_time || raw?.startTime || "").trim(),
    end_time: String(raw?.end_time || raw?.endTime || "").trim(),
    eventMode: String(raw?.eventMode || raw?.event_mode || "offline").trim(),
    visibility: visibilityRaw ?? true,
    isFeatured: featuredRaw ?? false,
    approvalStatus,
    source,
    user_id: options.userId,
  };

  if (startDate) eventPayload.start_date = startDate;
  if (endDate) eventPayload.end_date = endDate;
  if (location) eventPayload.location = location;
  if (category) eventPayload.category = category;
  if (subCategory) eventPayload.sub_category = subCategory;

  const image = String(raw?.image || "").trim();
  if (image) eventPayload.image = image;

  if (source === "google" && googleEventId) {
    eventPayload.googleEventId = googleEventId;
  }

  return eventPayload;
};

const getPayloadDuplicateKey = (eventPayload) => {
  if (eventPayload.googleEventId) {
    return `google:${eventPayload.googleEventId.toLowerCase()}`;
  }

  const title = String(eventPayload.title || "").toLowerCase();
  const address = String(eventPayload.address || "").toLowerCase();
  const source = String(eventPayload.source || "").toLowerCase();
  const datePart = eventPayload.start_date
    ? new Date(eventPayload.start_date).toISOString().slice(0, 10)
    : "";

  return `${title}|${address}|${datePart}|${source}`;
};

const getExistingEventFilter = (eventPayload) => {
  if (eventPayload.googleEventId) {
    return {
      googleEventId: eventPayload.googleEventId,
      source: "google",
    };
  }

  const filter = {
    title: eventPayload.title,
    address: eventPayload.address || "",
    source: eventPayload.source || "user",
  };

  if (eventPayload.start_date) {
    const start = new Date(eventPayload.start_date);
    start.setHours(0, 0, 0, 0);

    const end = new Date(start);
    end.setHours(23, 59, 59, 999);

    filter.start_date = { $gte: start, $lte: end };
  }

  return filter;
};

const importEvents = async (rawEvents, options) => {
  const cityCache = new Map();
  const categoryCache = new Map();
  const subCategoryCache = new Map();

  const createdEvents = [];
  const seenInPayload = new Set();

  let skippedInvalid = 0;
  let skippedExisting = 0;
  let skippedDuplicateInPayload = 0;

  for (const raw of rawEvents) {
    const payload = await getNormalizedEvent(raw, {
      defaultSource: options.defaultSource,
      userId: options.userId,
      cityCache,
      categoryCache,
      subCategoryCache,
    });

    if (!payload) {
      skippedInvalid += 1;
      continue;
    }

    const duplicateKey = getPayloadDuplicateKey(payload);
    if (seenInPayload.has(duplicateKey)) {
      skippedDuplicateInPayload += 1;
      continue;
    }
    seenInPayload.add(duplicateKey);

    const existing = await Event.findOne(getExistingEventFilter(payload))
      .select("_id")
      .lean();
    if (existing) {
      skippedExisting += 1;
      continue;
    }

    const created = await Event.create(payload);
    createdEvents.push(created);
  }

  return {
    createdCount: createdEvents.length,
    skippedExisting,
    skippedInvalid,
    skippedDuplicateInPayload,
  };
};

const ensureAdminAccess = async (req, res) => {
  const roleId = Number(req.user?.roleId);
  if (!ALLOWED_ROLES.includes(roleId)) {
    res.status(403).json({ message: "Access denied" });
    return null;
  }

  const adminUser = await User.findById(req.user?._id).select("roleId");
  if (!adminUser || Number(adminUser.roleId) !== 1) {
    res.status(403).json({ message: "Access denied" });
    return null;
  }

  return adminUser;
};

exports.importGoogleEvents = async (req, res) => {
  try {
    const adminUser = await ensureAdminAccess(req, res);
    if (!adminUser) return;

    const bodyEvents = readArrayPayload(req.body?.events);
    const bodyEvent =
      req.body?.event && typeof req.body.event === "object" ? [req.body.event] : [];
    const eventsToImport = bodyEvents.length ? bodyEvents : bodyEvent;

    if (!eventsToImport.length) {
      return res.status(400).json({ message: "events payload is required" });
    }

    const summary = await importEvents(eventsToImport, {
      defaultSource: "google",
      userId: req.user._id,
    });

    return res.status(200).json({
      message: "Google events imported successfully",
      data: summary,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Failed to import Google events",
    });
  }
};

exports.addEventCsv = async (req, res) => {
  const csvFile = req.files?.csv?.[0];
  if (!csvFile) {
    return res.status(400).json({ message: "CSV file is required" });
  }

  try {
    const adminUser = await ensureAdminAccess(req, res);
    if (!adminUser) return;

    const csvContent = fs.readFileSync(csvFile.path, "utf8");
    const rows = parseCsv(csvContent);

    if (rows.length < 2) {
      return res.status(400).json({ message: "CSV file has no data rows" });
    }

    const headers = rows[0].map(normalizeHeader);
    if (!headers.includes("title") && !headers.includes("name")) {
      return res
        .status(400)
        .json({ message: "CSV must include title/name column" });
    }

    const dataRows = rows.slice(1);
    const normalizedRows = dataRows.map((row) => ({
      title: getValueByHeader(headers, row, ["title", "name", "event_title"]),
      description: getValueByHeader(headers, row, ["description", "desc"]),
      address: getValueByHeader(headers, row, ["address", "location"]),
      start_date: getValueByHeader(headers, row, [
        "start_date",
        "startdate",
        "date",
      ]),
      end_date: getValueByHeader(headers, row, ["end_date", "enddate"]),
      start_time: getValueByHeader(headers, row, ["start_time", "starttime"]),
      end_time: getValueByHeader(headers, row, ["end_time", "endtime"]),
      ticket_price: getValueByHeader(headers, row, [
        "ticket_price",
        "ticket",
        "price",
      ]),
      city: getValueByHeader(headers, row, [
        "city",
        "location_city",
        "city_name",
        "city_id",
      ]),
      category: getValueByHeader(headers, row, [
        "category",
        "category_name",
        "category_id",
      ]),
      sub_category: getValueByHeader(headers, row, [
        "sub_category",
        "subcategory",
        "sub_category_name",
        "sub_category_id",
      ]),
      event_mode: getValueByHeader(headers, row, ["event_mode", "eventmode"]),
      visibility: getValueByHeader(headers, row, ["visibility", "is_visible"]),
      is_featured: getValueByHeader(headers, row, ["is_featured", "featured"]),
      source: getValueByHeader(headers, row, ["source"]),
      image: getValueByHeader(headers, row, ["image", "image_url"]),
    }));

    const summary = await importEvents(normalizedRows, {
      defaultSource: "user",
      userId: req.user._id,
    });

    return res.status(200).json({
      message: "Event CSV processed successfully",
      data: summary,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Failed to import events from CSV",
    });
  } finally {
    try {
      fs.unlinkSync(csvFile.path);
    } catch (error) {
      // ignore cleanup failures
    }
  }
};
