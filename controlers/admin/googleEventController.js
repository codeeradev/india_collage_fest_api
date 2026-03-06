const message = require("../../constants/messages.json");

const ALLOWED_ROLES = [1];
const DATE_PRESET_OPTIONS = new Set([
  "today",
  "tomorrow",
  "thisWeek",
  "thisWeekend",
  "nextWeek",
  "nextMonth",
]);

const formatDateInZone = (date, timeZone) => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone,
  }).formatToParts(date);

  const year = parts.find((p) => p.type === "year")?.value;
  const month = parts.find((p) => p.type === "month")?.value;
  const day = parts.find((p) => p.type === "day")?.value;

  if (!year || !month || !day) return null;
  return `${year}-${month}-${day}`;
};

const formatTimeInZone = (date, timeZone) =>
  new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone,
  }).format(date);

const getDatePartsFromUnix = (unixSeconds, timeZone) => {
  const value = Number(unixSeconds);
  if (!Number.isFinite(value) || value <= 0) {
    return { date: null, time: null };
  }

  const dateObj = new Date(value * 1000);
  if (Number.isNaN(dateObj.getTime())) {
    return { date: null, time: null };
  }

  return {
    date: formatDateInZone(dateObj, timeZone),
    time: formatTimeInZone(dateObj, timeZone),
  };
};

const toSlug = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

const normalizeScrapedEvent = (item, index, timeZone) => {
  const start = getDatePartsFromUnix(item?.date?.start, timeZone);
  const end = getDatePartsFromUnix(item?.date?.end, timeZone);

  const title = String(item?.name || "Untitled Event").trim();
  const slugBase = toSlug(title) || "google-event";
  const startUnix = Number(item?.date?.start) || 0;
  const googleEventId = `${slugBase}-${startUnix || index + 1}`;

  const links = Array.isArray(item?.links) ? item.links : [];
  const primaryLink = links.find((lnk) => lnk?.url)?.url || "";

  return {
    source: "google",
    googleEventId,
    title,
    description: String(item?.description || "").trim(),
    image: String(item?.imageUrl || "").trim(),
    address: String(item?.location?.address || item?.location?.name || "").trim(),
    start_date: start.date,
    end_date: end.date || start.date,
    start_time: start.time,
    end_time: end.time,
    htmlLink: primaryLink || String(item?.location?.mapUrl || "").trim(),
    timezone: String(item?.date?.timezone || "").trim(),
    when: String(item?.date?.when || "").trim(),
  };
};

const getScraper = async () => {
  if (!process.env.CRAWLEE_LOG_LEVEL) {
    process.env.CRAWLEE_LOG_LEVEL = "WARNING";
  }
  const mod = await import("google-events-scraper");
  return mod.default;
};

exports.fetchGoogleEventsPreview = async (req, res) => {
  try {
    const roleId = Number(req.user?.roleId);
    if (!ALLOWED_ROLES.includes(roleId)) {
      return res.status(403).json({ message: "Access denied" });
    }

    const query = String(req.body?.query || "").trim();
    if (!query) {
      return res.status(400).json({ message: "query is required" });
    }

    const datePreset = String(req.body?.datePreset || "").trim();
    if (datePreset && !DATE_PRESET_OPTIONS.has(datePreset)) {
      return res.status(400).json({
        message:
          "Invalid datePreset. Allowed: today, tomorrow, thisWeek, thisWeekend, nextWeek, nextMonth",
      });
    }

    const parsedLimit = Number(req.body?.limit ?? req.body?.maxResults);
    const limit =
      Number.isFinite(parsedLimit) && parsedLimit > 0
        ? Math.min(Math.floor(parsedLimit), 200)
        : 50;

    const timeZone = String(req.body?.timeZone || "Asia/Kolkata").trim();

    const options = {};
    if (datePreset) {
      options[datePreset] = true;
    }

    const Scraper = await getScraper();
    const scraper = new Scraper();

    console.log(`Fetching Google events with query="${query}", datePreset="${datePreset}", timeZone="${timeZone}", limit=${limit}`);
    const results = await scraper.Scrape(query, options);

console.log(results);
    const rawEvents = Array.isArray(results) ? results : [];
    console.log(rawEvents);

    const previewEvents = rawEvents
      .slice(0, limit)
      .map((item, index) => normalizeScrapedEvent(item, index, timeZone));

    return res.status(200).json({
      message: "Google events fetched successfully",
      meta: {
        query,
        datePreset: datePreset || null,
        timeZone,
        count: previewEvents.length,
        totalScraped: rawEvents.length,
      },
      events: previewEvents,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message:
        "Failed to fetch Google events. Verify Playwright browser install with: npx playwright install chromium",
      error: message.server_error,
    });
  }
};
