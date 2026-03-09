const https = require("https");

const DEFAULT_CONFIG = Object.freeze({
  requestTimeoutMs: 20000,
  maxEventsPerQuery: 80,
  maxPages: 3,
  hl: "en",
  gl: "in",
  apiBaseUrl: "https://serpapi.com/search.json",
});

const toPositiveInt = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
};

const buildConfig = (config = {}) => ({
  requestTimeoutMs: toPositiveInt(
    config.requestTimeoutMs,
    DEFAULT_CONFIG.requestTimeoutMs,
  ),
  maxEventsPerQuery: toPositiveInt(
    config.maxEventsPerQuery,
    DEFAULT_CONFIG.maxEventsPerQuery,
  ),
  maxPages: toPositiveInt(config.maxPages, DEFAULT_CONFIG.maxPages),
  hl: String(config.hl || DEFAULT_CONFIG.hl).trim() || DEFAULT_CONFIG.hl,
  gl: String(config.gl || DEFAULT_CONFIG.gl).trim() || DEFAULT_CONFIG.gl,
  apiBaseUrl:
    String(config.apiBaseUrl || DEFAULT_CONFIG.apiBaseUrl).trim() ||
    DEFAULT_CONFIG.apiBaseUrl,
  apiKey: String(config.apiKey || process.env.SERPAPI_API_KEY || "").trim(),
});

const getDateChip = (options = {}) => {
  if (options.today) return "date:today";
  if (options.tomorrow) return "date:tomorrow";
  if (options.thisWeek) return "date:week";
  if (options.thisWeekend) return "date:weekend";
  if (options.nextWeek) return "date:next_week";
  if (options.nextMonth) return "date:next_month";
  return "";
};

const parseTimeValue = (value) => {
  if (!value) return { hour: 0, minute: 0, valid: false };

  const match = String(value)
    .trim()
    .match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?$/i);

  if (!match) return { hour: 0, minute: 0, valid: false };

  let hour = Number(match[1]);
  const minute = Number(match[2] || "0");
  const ampm = (match[3] || "").toUpperCase();

  if (!Number.isFinite(hour) || !Number.isFinite(minute)) {
    return { hour: 0, minute: 0, valid: false };
  }

  if (ampm === "AM" && hour === 12) hour = 0;
  if (ampm === "PM" && hour < 12) hour += 12;

  hour = Math.max(0, Math.min(23, hour));
  const clampedMinute = Math.max(0, Math.min(59, minute));

  return { hour, minute: clampedMinute, valid: true };
};

const parseIsoDateToUnix = (dateValue, timeValue) => {
  const dateMatch = String(dateValue || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!dateMatch) return 0;

  const year = Number(dateMatch[1]);
  const month = Number(dateMatch[2]);
  const day = Number(dateMatch[3]);
  const parsedTime = parseTimeValue(timeValue);

  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
    return 0;
  }

  const unix = Date.UTC(
    year,
    Math.max(0, month - 1),
    Math.max(1, day),
    parsedTime.hour,
    parsedTime.minute,
  );

  return Number.isFinite(unix) ? Math.floor(unix / 1000) : 0;
};

const parseDateToUnix = (dateValue, timeValue, whenValue) => {
  const fromIso = parseIsoDateToUnix(dateValue, timeValue);
  if (fromIso > 0) return fromIso;

  const fullText = [String(dateValue || "").trim(), String(timeValue || "").trim()]
    .filter(Boolean)
    .join(" ")
    .trim();

  if (fullText) {
    const parsed = Date.parse(fullText);
    if (Number.isFinite(parsed)) {
      return Math.floor(parsed / 1000);
    }
  }

  const whenText = String(whenValue || "").trim();
  if (whenText) {
    const parsedWhen = Date.parse(whenText);
    if (Number.isFinite(parsedWhen)) {
      return Math.floor(parsedWhen / 1000);
    }
  }

  return 0;
};

const pushLink = (links, name, url) => {
  const cleanUrl = String(url || "").trim();
  if (!cleanUrl) return;

  links.push({
    name: String(name || "Link").trim() || "Link",
    url: cleanUrl,
  });
};

const normalizeAddress = (rawAddress) => {
  if (Array.isArray(rawAddress)) {
    return rawAddress
      .map((value) => String(value || "").trim())
      .filter(Boolean)
      .join(", ");
  }
  return String(rawAddress || "").trim();
};

const normalizeEvent = (item = {}) => {
  const rawDate = item?.date && typeof item.date === "object" ? item.date : {};

  const whenText = String(rawDate.when || item.when || "").trim();
  const startDateRaw = String(rawDate.start_date || item.start_date || "").trim();
  const endDateRaw = String(rawDate.end_date || item.end_date || startDateRaw).trim();
  const startTimeRaw = String(rawDate.start_time || item.start_time || "").trim();
  const endTimeRaw = String(rawDate.end_time || item.end_time || "").trim();

  const links = [];
  pushLink(links, "Event", item.link || item.event_link || item.website);

  if (Array.isArray(item.ticket_info)) {
    for (const ticket of item.ticket_info) {
      pushLink(
        links,
        ticket?.source || ticket?.name || "Tickets",
        ticket?.link || ticket?.url,
      );
    }
  }

  return {
    name: String(item.title || item.name || "Untitled Event").trim(),
    description: String(item.description || item.info || "").trim(),
    imageUrl: String(item.thumbnail || item.image || "").trim(),
    date: {
      start: parseDateToUnix(startDateRaw, startTimeRaw, whenText),
      end: parseDateToUnix(endDateRaw, endTimeRaw, whenText),
      timezone: String(rawDate.timezone || item.timezone || "").trim(),
      when: whenText,
    },
    location: {
      name: String(item.venue?.name || item.location?.name || "").trim(),
      address: normalizeAddress(item.address || item.location?.address),
      mapUrl: String(item.venue?.link || item.map_link || item.mapUrl || "").trim(),
    },
    links,
  };
};

const requestJson = (url, timeoutMs) =>
  new Promise((resolve, reject) => {
    const req = https.get(
      url,
      {
        headers: {
          "user-agent": "indiafest-backend/1.0",
        },
      },
      (res) => {
        const statusCode = Number(res.statusCode || 0);
        const chunks = [];

        res.on("data", (chunk) => {
          chunks.push(chunk);
        });

        res.on("end", () => {
          const rawText = Buffer.concat(chunks).toString("utf8");
          if (statusCode < 200 || statusCode >= 300) {
            return reject(
              new Error(
                `SerpAPI request failed with status ${statusCode}: ${rawText.slice(0, 300)}`,
              ),
            );
          }

          try {
            const parsed = JSON.parse(rawText);
            return resolve(parsed);
          } catch (error) {
            return reject(new Error("Unable to parse SerpAPI response JSON"));
          }
        });
      },
    );

    req.setTimeout(timeoutMs, () => {
      req.destroy(new Error("SerpAPI request timed out"));
    });

    req.on("error", (error) => {
      reject(error);
    });
  });

class GoogleEventsScraper {
  constructor(config) {
    this.data = [];
    this.config = buildConfig(config);
  }

  async Scrape(query, options = {}) {
    const queryText = String(query || "").trim();
    if (!queryText) return [];

    if (!this.config.apiKey) {
      throw new Error("SERPAPI_API_KEY is missing");
    }

    const allResults = [];
    let nextPageToken = "";

    for (let page = 0; page < this.config.maxPages; page += 1) {
      const params = new URLSearchParams({
        engine: "google_events",
        q: queryText,
        api_key: this.config.apiKey,
        hl: this.config.hl,
        gl: this.config.gl,
      });

      const dateChip = getDateChip(options);
      if (dateChip) {
        params.set("htichips", dateChip);
      }

      if (nextPageToken) {
        params.set("next_page_token", nextPageToken);
      }

      const requestUrl = `${this.config.apiBaseUrl}?${params.toString()}`;
      const response = await requestJson(requestUrl, this.config.requestTimeoutMs);

      if (response?.error) {
        throw new Error(`SerpAPI error: ${response.error}`);
      }

      const pageItems = Array.isArray(response?.events_results)
        ? response.events_results
        : [];

      if (pageItems.length === 0) break;

      for (const rawItem of pageItems) {
        allResults.push(normalizeEvent(rawItem));
        if (allResults.length >= this.config.maxEventsPerQuery) break;
      }

      if (allResults.length >= this.config.maxEventsPerQuery) break;

      nextPageToken = String(
        response?.serpapi_pagination?.next_page_token || "",
      ).trim();

      if (!nextPageToken) break;
    }

    this.data = allResults;
    return allResults;
  }

  GetResults() {
    return this.data;
  }
}

module.exports = GoogleEventsScraper;
