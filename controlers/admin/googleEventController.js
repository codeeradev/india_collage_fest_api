const os = require("os");
const path = require("path");
const message = require("../../constants/messages.json");
const GoogleEventsScraper = require("../../utils/googleEventsScraper");

const ALLOWED_ROLES = [1];
const DATE_PRESET_OPTIONS = new Set([
  "today",
  "tomorrow",
  "thisWeek",
  "thisWeekend",
  "nextWeek",
  "thisMonth",
  "nextMonth",
  "next6months",
]);

const DATE_PRESET_TEXT = {
  today: "today",
  tomorrow: "tomorrow",
  thisWeek: "this week",
  thisWeekend: "this weekend",
  nextWeek: "next week",
  thisMonth: "this month",
  nextMonth: "next month",
  next6months: "next 6 months",
};
const SCRAPER_SUPPORTED_PRESETS = new Set([
  "today",
  "tomorrow",
  "thisWeek",
  "thisWeekend",
  "nextWeek",
  "nextMonth",
]);
const MONTH_NAMES = [
  "january",
  "february",
  "march",
  "april",
  "may",
  "june",
  "july",
  "august",
  "september",
  "october",
  "november",
  "december",
];

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

const parseDateOnly = (value) => {
  if (!value) return null;
  const [yy, mm, dd] = String(value).split("-").map(Number);
  if (!yy || !mm || !dd) return null;
  const date = new Date(yy, mm - 1, dd);
  if (Number.isNaN(date.getTime())) return null;
  date.setHours(0, 0, 0, 0);
  return date;
};

const addDays = (value, days) => {
  const date = new Date(value);
  date.setDate(date.getDate() + days);
  return date;
};

const getWeekBounds = (baseDate) => {
  const current = new Date(baseDate);
  current.setHours(0, 0, 0, 0);
  const day = current.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const weekStart = addDays(current, mondayOffset);
  const weekEnd = addDays(weekStart, 6);
  return { weekStart, weekEnd };
};

const getNextWeekBounds = (baseDate) => {
  const { weekStart } = getWeekBounds(baseDate);
  const nextWeekStart = addDays(weekStart, 7);
  const nextWeekEnd = addDays(nextWeekStart, 6);
  return { nextWeekStart, nextWeekEnd };
};

const getWeekendBounds = (baseDate) => {
  const today = new Date(baseDate);
  today.setHours(0, 0, 0, 0);
  const day = today.getDay();
  const daysUntilSaturday = (6 - day + 7) % 7;
  const saturday = addDays(today, daysUntilSaturday);
  const sunday = addDays(saturday, 1);
  return { saturday, sunday };
};

const getThisMonthBounds = (baseDate) => {
  const year = baseDate.getFullYear();
  const month = baseDate.getMonth();
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  first.setHours(0, 0, 0, 0);
  last.setHours(23, 59, 59, 999);
  return { first, last };
};

const get6MonthBounds = (baseDate) => {
  const year = baseDate.getFullYear();
  const month = baseDate.getMonth();
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 6, 0);
  first.setHours(0, 0, 0, 0);
  last.setHours(23, 59, 59, 999);
  return { first, last };
};

const getNextMonthBounds = (baseDate) => {
  const year = baseDate.getFullYear();
  const month = baseDate.getMonth();
  const first = new Date(year, month + 1, 1);
  const last = new Date(year, month + 2, 0);
  first.setHours(0, 0, 0, 0);
  last.setHours(0, 0, 0, 0);
  return { first, last };
};

const isDateInPreset = (eventDate, datePreset) => {
  if (!datePreset) return true;
  if (!eventDate) return true;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (datePreset === "today") {
    return eventDate.getTime() === today.getTime();
  }

  if (datePreset === "tomorrow") {
    const tomorrow = addDays(today, 1);
    return eventDate.getTime() === tomorrow.getTime();
  }

  if (datePreset === "thisWeek") {
    const { weekStart, weekEnd } = getWeekBounds(today);
    return eventDate >= weekStart && eventDate <= weekEnd;
  }

  if (datePreset === "thisWeekend") {
    const { saturday, sunday } = getWeekendBounds(today);
    return (
      eventDate.getTime() === saturday.getTime() ||
      eventDate.getTime() === sunday.getTime()
    );
  }

  if (datePreset === "thisMonth") {
    const { first, last } = getThisMonthBounds(today);
    return eventDate >= first && eventDate <= last;
  }

  if (datePreset === "next6months") {
    const { first, last } = get6MonthBounds(today);
    return eventDate >= first && eventDate <= last;
  }

  if (datePreset === "nextWeek") {
    const { nextWeekStart, nextWeekEnd } = getNextWeekBounds(today);
    return eventDate >= nextWeekStart && eventDate <= nextWeekEnd;
  }

  if (datePreset === "nextMonth") {
    const { first, last } = getNextMonthBounds(today);
    return eventDate >= first && eventDate <= last;
  }

  return true;
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
    address: String(
      item?.location?.address || item?.location?.name || "",
    ).trim(),
    start_date: start.date,
    end_date: end.date || start.date,
    start_time: start.time,
    end_time: end.time,
    htmlLink: primaryLink || String(item?.location?.mapUrl || "").trim(),
    timezone: String(item?.date?.timezone || "").trim(),
    when: String(item?.date?.when || "").trim(),
  };
};

const dedupeEvents = (events) => {
  const seen = new Set();
  return events.filter((event) => {
    const key = `${String(event.title || "").toLowerCase()}|${String(event.address || "").toLowerCase()}|${String(event.start_date || "")}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const applyPresetDateFilter = (events, datePreset) => {
  if (!datePreset) return events;

  return events.filter((event) => {
    const eventDate = parseDateOnly(event.start_date);
    return isDateInPreset(eventDate, datePreset);
  });
};

const getMonthQuerySuffixes = (monthsToCover) => {
  const list = [];
  const baseDate = new Date();
  baseDate.setDate(1);

  for (let offset = 0; offset < monthsToCover; offset += 1) {
    const monthDate = new Date(
      baseDate.getFullYear(),
      baseDate.getMonth() + offset,
      1,
    );
    list.push(
      `${MONTH_NAMES[monthDate.getMonth()]} ${monthDate.getFullYear()}`,
    );
  }

  return list;
};

const buildAttemptPlan = (query, datePreset) => {
  const plan = [];
  const addAttempt = (label, q, options = {}) => {
    const sortedOptions = Object.keys(options)
      .sort()
      .reduce((acc, key) => {
        acc[key] = options[key];
        return acc;
      }, {});
    const key = `${label}|${q}|${JSON.stringify(sortedOptions)}`;
    if (plan.some((item) => item.key === key)) return;
    plan.push({ key, label, query: q, options });
  };

  if (datePreset) {
    if (SCRAPER_SUPPORTED_PRESETS.has(datePreset)) {
      addAttempt("preset_filter", query, { [datePreset]: true });
    }
    addAttempt(
      "query_with_date_text",
      `${query} ${DATE_PRESET_TEXT[datePreset]}`,
      {},
    );

    if (datePreset === "next6months") {
      for (const monthSuffix of getMonthQuerySuffixes(6)) {
        addAttempt("month_query", `${query} ${monthSuffix}`, {});
      }
    }
  }

  addAttempt("plain_query", query, {});

  const hasEventsWord = /\bevents?\b/i.test(query);
  if (hasEventsWord) {
    const withoutEvents = query.replace(/\bevents?\b/i, "").trim();
    if (withoutEvents) {
      addAttempt("reordered_query", `events ${withoutEvents}`, {});
      addAttempt("reordered_query", `${withoutEvents} events`, {});
    }
  } else {
    addAttempt("add_events_prefix", `events ${query}`, {});
  }

  return plan;
};

const toPositiveInt = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
};

const getScraperMode = () => {
  const mode = String(process.env.GOOGLE_EVENTS_SCRAPER_MODE || "")
    .trim()
    .toLowerCase();
  return mode === "patched" ? "patched" : "package";
};

const configureScraperRuntime = () => {
  if (!process.env.CRAWLEE_LOG_LEVEL) {
    process.env.CRAWLEE_LOG_LEVEL = "WARNING";
  }
  if (!process.env.CRAWLEE_PERSIST_STORAGE) {
    process.env.CRAWLEE_PERSIST_STORAGE = "false";
  }
  if (!process.env.CRAWLEE_PURGE_ON_START) {
    process.env.CRAWLEE_PURGE_ON_START = "false";
  }
  if (!process.env.CRAWLEE_STORAGE_DIR) {
    process.env.CRAWLEE_STORAGE_DIR = path.join(os.tmpdir(), "indiafest-crawlee");
  }
};

const getScraper = async () => {
  configureScraperRuntime();
  const mode = getScraperMode();
  if (mode === "patched") {
    return { Scraper: GoogleEventsScraper, mode };
  }
  const mod = await import("google-events-scraper");
  return { Scraper: mod.default, mode };
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
          "Invalid datePreset. Allowed: today, tomorrow, thisWeek, thisWeekend, nextWeek, nextMonth, thisMonth, next6months",
      });
    }

    const timeZone = String(req.body?.timeZone || "Asia/Kolkata").trim();
    const maxAttempts = toPositiveInt(process.env.GOOGLE_EVENTS_MAX_ATTEMPTS, 4);
    const attempts = buildAttemptPlan(query, datePreset).slice(0, maxAttempts);

    const { Scraper, mode: scraperMode } = await getScraper();
    const scraper = new Scraper({
      requestHandlerTimeoutSecs: toPositiveInt(
        process.env.GOOGLE_EVENTS_HANDLER_TIMEOUT_SECS,
        220,
      ),
      navigationTimeoutSecs: toPositiveInt(
        process.env.GOOGLE_EVENTS_NAVIGATION_TIMEOUT_SECS,
        45,
      ),
      maxRequestRetries: Math.max(
        0,
        Number.isFinite(Number(process.env.GOOGLE_EVENTS_MAX_RETRIES))
          ? Math.floor(Number(process.env.GOOGLE_EVENTS_MAX_RETRIES))
          : 1,
      ),
      maxEventsPerQuery: toPositiveInt(process.env.GOOGLE_EVENTS_MAX_EVENTS, 80),
      maxScrollSteps: toPositiveInt(process.env.GOOGLE_EVENTS_SCROLL_STEPS, 36),
      scrollWaitMs: toPositiveInt(process.env.GOOGLE_EVENTS_SCROLL_WAIT_MS, 250),
      scrollMaxDurationMs: toPositiveInt(
        process.env.GOOGLE_EVENTS_SCROLL_TIMEOUT_MS,
        25000,
      ),
      launchOptions: {
        headless: true,
        args: [
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-dev-shm-usage",
          "--disable-gpu",
          "--disable-blink-features=AutomationControlled",
        ],
      },
    });

    let rawEvents = [];
    let totalScraped = 0;
    const successfulAttempts = [];
    const failedAttempts = [];

    for (const attempt of attempts) {
      console.log(
        `Google scrape attempt="${attempt.label}" query="${attempt.query}" options="${JSON.stringify(attempt.options)}"`,
      );

      try {
        const result = await scraper.Scrape(attempt.query, attempt.options);
        const list = Array.isArray(result) ? result : [];
        if (list.length > 0) {
          successfulAttempts.push({
            label: attempt.label,
            query: attempt.query,
            scraped: list.length,
          });
          totalScraped += list.length;
          rawEvents.push(...list);
        }
      } catch (attemptError) {
        const reason = String(attemptError?.message || "Unknown scraper error");
        failedAttempts.push({
          label: attempt.label,
          query: attempt.query,
          error: reason,
        });
        console.error(
          `Google scrape attempt failed label="${attempt.label}" query="${attempt.query}"`,
          attemptError,
        );
      }
    }

    const normalized = rawEvents.map((item, index) =>
      normalizeScrapedEvent(item, index, timeZone),
    );
    const deduped = dedupeEvents(normalized);
    const finalEvents = applyPresetDateFilter(deduped, datePreset);
    const firstSuccessfulAttempt = successfulAttempts[0] || null;
    const strategy = successfulAttempts.length
      ? [...new Set(successfulAttempts.map((item) => item.label))].join(",")
      : "no_results";

    return res.status(200).json({
      message: "Google events fetched successfully",
      meta: {
        query,
        datePreset: datePreset || null,
        timeZone,
        count: finalEvents.length,
        totalScraped,
        uniqueScraped: deduped.length,
        strategy,
        queryUsed: firstSuccessfulAttempt?.query || query,
        fallbackUsed: successfulAttempts.some(
          (item) =>
            item.label !== "preset_filter" && item.label !== "plain_query",
        ),
        attempted: attempts.length,
        scraperMode,
        attempts: successfulAttempts,
        errors: failedAttempts,
      },
      events: finalEvents,
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
